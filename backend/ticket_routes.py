from flask import Blueprint, request, jsonify
from datetime import datetime
import psycopg2
import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv
from queue import Queue

load_dotenv()

ticket_bp = Blueprint('ticket_bp', __name__)

# --- DB config ---
DB_NAME = os.getenv("DB_NAME", "wazuh_logs")
DB_USER = os.getenv("DB_USER", "siem_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "securepassword")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

# --- Email config ---
EMAIL_FROM = os.getenv("EMAIL_FROM")
EMAIL_TO = os.getenv("EMAIL_TO")  # Default fallback
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")

# Email queue will be shared from main.py
email_queue = None

def set_email_queue(queue):
    """Set the email queue from main.py"""
    global email_queue
    email_queue = queue

def get_db_connection():
    return psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )

def send_email_async(subject, body, recipient=EMAIL_TO):
    """Queue an email to be sent asynchronously"""
    if email_queue is not None:
        email_queue.put({"subject": subject, "body": body, "recipient": recipient})
        print(f"📧 Email queued for {recipient}")
    else:
        # Fallback to synchronous if queue not initialized
        _send_email_sync(subject, body, recipient)

def _send_email_sync(subject, body, recipient=EMAIL_TO):
    """Send email synchronously (as a fallback)"""
    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = EMAIL_FROM
        msg['To'] = recipient
        msg.set_content(body)

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            server.send_message(msg)
        print(f"📧 Email sent to {recipient}.")
    except Exception as e:
        print(f"❌ Email failed: {e}")


def get_analyst_email(level):
    """Get all emails for analysts with a specific level"""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT email FROM security_roles WHERE level = %s", (level,))
    results = cur.fetchall()
    conn.close()
    return [r[0] for r in results] if results else [EMAIL_TO]


def get_client_email(ticket_id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT client_email FROM security_tickets WHERE id = %s", (ticket_id,))
    result = cur.fetchone()
    conn.close()
    return result[0] if result else None


def get_ticket_summary(ticket_id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT alert_id, status, severity, notes FROM security_tickets WHERE id = %s", (ticket_id,))
    result = cur.fetchone()
    conn.close()
    if not result:
        return "Ticket not found."
    alert_id, status, severity, notes = result
    return f"""
    Alert ID: {alert_id}
    Status: {status}
    Severity: {severity}
    Notes: {notes}
    """


def notify_client_on_ticket_event(ticket_id, event_type):
    details = get_ticket_summary(ticket_id)
    client_email = get_client_email(ticket_id)
    if client_email:
        send_email_async(f"[Client Alert] Ticket {event_type}", details, recipient=client_email)

    # Notify all analysts by level
    for level in ['L1', 'L2', 'L3', 'L4']:
        analyst_emails = get_analyst_email(level)
        for email in analyst_emails:
            send_email_async(f"[{level} Alert] Ticket {event_type}", details, recipient=email)


@ticket_bp.route('/api/tickets/create', methods=['POST'])
def create_ticket():
    data = request.get_json()
    alert_id = data.get('alert_id')
    status = data.get('status', 'new')
    severity = data.get('severity', 'low')
    assigned_to = data.get('assigned_to', '')
    notes = data.get('notes', '')
    client_email = data.get('client_email')
    now = datetime.utcnow()

    if not alert_id or not client_email:
        return jsonify({'error': 'alert_id and client_email are required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO security_tickets 
        (alert_id, status, severity, assigned_to, notes, updated_at, client_email)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (alert_id, status, severity, assigned_to, notes, now, client_email))
    ticket_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    
    # Send email notifications when ticket is created
    notify_client_on_ticket_event(ticket_id, "created")
    
    # If assigned to someone, also send a specific notification to that person
    if assigned_to:
        ticket_details = get_ticket_summary(ticket_id)
        send_email_async(
            f"[Assigned Alert] Ticket {ticket_id} assigned to you", 
            f"You have been assigned ticket #{ticket_id}.\n\n{ticket_details}",
            recipient=assigned_to
        )

    return jsonify({'message': f'Ticket {ticket_id} created successfully', 'ticket_id': ticket_id}), 201


@ticket_bp.route('/api/tickets/<int:ticket_id>/assign', methods=['POST'])
def assign_ticket(ticket_id):
    data = request.get_json()
    assigned_to = data.get('assigned_to')
    user = data.get('user', 'system')
    now = datetime.utcnow()

    if not assigned_to:
        return jsonify({'error': 'assigned_to is required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT assigned_to FROM security_tickets WHERE id = %s", (ticket_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Ticket not found'}), 404

    old_value = row[0]
    cur.execute("UPDATE security_tickets SET assigned_to = %s, updated_at = %s WHERE id = %s",
                (assigned_to, now, ticket_id))
    cur.execute("""
        INSERT INTO ticket_history (ticket_id, field_changed, old_value, new_value, changed_by, changed_at)
        VALUES (%s, 'assigned_to', %s, %s, %s, %s)
    """, (ticket_id, old_value, assigned_to, user, now))
    conn.commit()
    conn.close()

    notify_client_on_ticket_event(ticket_id, "assigned")
    return jsonify({'message': f'Ticket {ticket_id} assigned to {assigned_to}'}), 200


@ticket_bp.route('/api/tickets/<int:ticket_id>/close', methods=['POST'])
def close_ticket(ticket_id):
    data = request.get_json() or {}
    resolution_notes = data.get('notes')
    user = data.get('user', 'system')
    now = datetime.utcnow()

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT status, notes FROM security_tickets WHERE id = %s", (ticket_id,))
    result = cur.fetchone()
    if not result:
        conn.close()
        return jsonify({'error': 'Ticket not found'}), 404

    old_status, old_notes = result

    if old_status == 'resolved':
        conn.close()
        return jsonify({'error': 'Ticket already resolved'}), 400

    new_notes = f"{old_notes or ''}\n\n--- CLOSURE NOTES ({now.isoformat()}) ---\n{resolution_notes or 'No notes'}"

    cur.execute("UPDATE security_tickets SET status = %s, notes = %s, updated_at = %s WHERE id = %s",
                ('resolved', new_notes, now, ticket_id))

    cur.execute("""
        INSERT INTO ticket_history (ticket_id, field_changed, old_value, new_value, changed_by, changed_at)
        VALUES (%s, 'status', %s, %s, %s, %s)
    """, (ticket_id, old_status, 'resolved', user, now))

    conn.commit()
    conn.close()

    notify_client_on_ticket_event(ticket_id, "closed")
    return jsonify({'message': f'Ticket {ticket_id} closed'}), 200


@ticket_bp.route('/api/tickets/<int:ticket_id>/reopen', methods=['POST'])
def reopen_ticket(ticket_id):
    user = request.get_json().get('user', 'system')
    now = datetime.utcnow()

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT status FROM security_tickets WHERE id = %s", (ticket_id,))
    result = cur.fetchone()
    if not result:
        conn.close()
        return jsonify({'error': 'Ticket not found'}), 404

    status = result[0]
    if status != 'resolved':
        conn.close()
        return jsonify({'error': 'Only resolved tickets can be reopened'}), 400

    cur.execute("UPDATE security_tickets SET status = %s, updated_at = %s WHERE id = %s",
                ('in_progress', now, ticket_id))
    cur.execute("""
        INSERT INTO ticket_history (ticket_id, field_changed, old_value, new_value, changed_by, changed_at)
        VALUES (%s, 'status', %s, %s, %s, %s)
    """, (ticket_id, status, 'in_progress', user, now))

    conn.commit()
    conn.close()

    notify_client_on_ticket_event(ticket_id, "reopened")
    return jsonify({'message': f'Ticket {ticket_id} reopened'}), 200


@ticket_bp.route('/api/tickets/search', methods=['GET'])
def search_tickets():
    query = request.args.get('q', '')
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, alert_id, status, severity, assigned_to
        FROM security_tickets
        WHERE alert_id ILIKE %s OR notes ILIKE %s OR assigned_to ILIKE %s
        ORDER BY updated_at DESC
        LIMIT 50
    """, (f"%{query}%", f"%{query}%", f"%{query}%"))
    rows = cur.fetchall()
    conn.close()
    results = [{'id': r[0], 'alert_id': r[1], 'status': r[2], 'severity': r[3], 'assigned_to': r[4]} for r in rows]
    return jsonify({'results': results}), 200


@ticket_bp.route('/api/tickets/<int:ticket_id>/email-client', methods=['POST'])
def email_ticket_to_client(ticket_id):
    notify_client_on_ticket_event(ticket_id, "shared")
    return jsonify({'message': 'Email sent to client.'}), 200

# --- API endpoints ---

# Get all analyst emails by level
@ticket_bp.route('/api/analysts', methods=['GET'])
def get_analysts():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, level, email FROM security_roles ORDER BY level")
    rows = cur.fetchall()
    conn.close()
    analysts = [{'id': r[0], 'level': r[1], 'email': r[2]} for r in rows]
    return jsonify({'analysts': analysts}), 200

# Add a new analyst email
@ticket_bp.route('/api/analysts', methods=['POST'])
def add_analyst():
    data = request.get_json()
    level = data.get('level')
    email = data.get('email')
    
    if not level or not email:
        return jsonify({'error': 'Level and email are required'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO security_roles (level, email) VALUES (%s, %s) RETURNING id", 
                (level, email))
    new_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    
    return jsonify({'message': f'Analyst {email} added with level {level}', 'id': new_id}), 201

# Update an analyst email
@ticket_bp.route('/api/analysts/<int:analyst_id>', methods=['PUT'])
def update_analyst(analyst_id):
    data = request.get_json()
    level = data.get('level')
    email = data.get('email')
    
    if not level or not email:
        return jsonify({'error': 'Level and email are required'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE security_roles SET level = %s, email = %s WHERE id = %s", 
                (level, email, analyst_id))
    if cur.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Analyst not found'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': f'Analyst updated successfully'}), 200

# Delete an analyst
@ticket_bp.route('/api/analysts/<int:analyst_id>', methods=['DELETE'])
def delete_analyst(analyst_id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM security_roles WHERE id = %s", (analyst_id,))
    if cur.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Analyst not found'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Analyst deleted successfully'}), 200

# Get all analysts by level
@ticket_bp.route('/api/analysts/by-level/<level>', methods=['GET'])
def get_analysts_by_level(level):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, level, email FROM security_roles WHERE level = %s", (level,))
    rows = cur.fetchall()
    conn.close()
    analysts = [{'id': r[0], 'level': r[1], 'email': r[2]} for r in rows]
    return jsonify({'analysts': analysts}), 200


