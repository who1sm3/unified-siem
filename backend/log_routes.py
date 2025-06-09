from flask import Blueprint, request, jsonify
from datetime import datetime
import json
import psycopg2
import os
from email.message import EmailMessage
import smtplib
from dotenv import load_dotenv
from queue import Queue
import threading

load_dotenv()

log_bp = Blueprint('log_bp', __name__)

# --- DB & Email Configuration ---
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "wazuh_logs"),
    "user": os.getenv("DB_USER", "siem_user"),
    "password": os.getenv("DB_PASSWORD", "securepassword"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
}

EMAIL_FROM = os.getenv("EMAIL_FROM")
EMAIL_TO = os.getenv("EMAIL_TO")
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")

# Email queue will be set from main.py
email_queue = None

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

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
        print(f"📧 Email sent to {recipient}")
    except Exception as e:
        print(f"❌ Email failed: {e}")

def process_email_queue(queue):
    """Process emails from the queue"""
    if queue.empty():
        return
    
    email_data = queue.get()
    try:
        _send_email_sync(
            email_data["subject"], 
            email_data["body"], 
            email_data["recipient"]
        )
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
    finally:
        queue.task_done()


@log_bp.route('/api/logs', methods=['POST'])
def receive_log():
    try:
        log_data = request.get_json(force=True)
        print("📥 Incoming log:")
        print(json.dumps(log_data, indent=2))

        conn = get_db_connection()
        cursor = conn.cursor()

        rule = log_data.get('rule', {})
        agent = log_data.get('agent', {})
        data = log_data.get('data', {})
        mitre = rule.get('mitre', {})
        manager = log_data.get('manager', {})

        cursor.execute("""
            INSERT INTO logs (
                alert_id, timestamp, rule_level, rule_description, rule_id,
                mitre_ids, mitre_tactics, mitre_techniques,
                agent_id, agent_name, manager_name,
                full_log, location, command, srcuser, dstuser, tty, pwd
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            log_data.get('id'),
            log_data.get('timestamp'),
            rule.get('level'),
            rule.get('description'),
            rule.get('id'),
            mitre.get('id'),
            mitre.get('tactic'),
            mitre.get('technique'),
            agent.get('id'),
            agent.get('name'),
            manager.get('name'),
            log_data.get('full_log'),
            log_data.get('location'),
            data.get('command'),
            data.get('srcuser'),
            data.get('dstuser'),
            data.get('tty'),
            data.get('pwd')
        ))

        # Correlation logic
        cursor.execute("SELECT rule_name, keyword, threshold, interval, severity, description FROM correlation_rules")
        rules = cursor.fetchall()
        for rule_name, keyword, threshold, interval, severity, description in rules:
            if keyword in log_data.get('full_log', ''):
                agent_id = agent.get('id')
                cursor.execute("""
                    SELECT COUNT(*) FROM logs 
                    WHERE agent_id = %s 
                    AND full_log ILIKE %s 
                    AND timestamp > NOW() - INTERVAL %s
                """, (agent_id, f"%{keyword}%", interval))
                count = cursor.fetchone()[0]
                if count >= threshold:
                    cursor.execute("""
                        INSERT INTO correlated_alerts (correlation_type, related_alerts, severity, agent_id, correlation_notes)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        rule_name,
                        [log_data.get('id')],
                        severity,
                        agent_id,
                        f"{count} logs with keyword '{keyword}' within {interval}."
                    ))
                    send_email_async(
                        f"🚨 Correlation Alert: {rule_name}",
                        f"{description}\n\nDetected {count} logs for agent {agent_id} in {interval}."
                    )

        conn.commit()
        cursor.close()
        conn.close()

        if rule.get('level', 0) >= 10:
            send_email_async(
                f"⚠️ High Severity Alert: {log_data.get('id')}",
                json.dumps(log_data, indent=2)
            )

        print("✅ Log stored in DB.\n")
        return jsonify({'message': 'Log stored successfully'}), 200

    except Exception as e:
        print(f"❌ ERROR while storing log: {e}")
        return jsonify({'error': str(e)}), 400


@log_bp.route('/api/correlation-rules', methods=['POST'])
def add_correlation_rule():
    data = request.get_json()
    rule_name = data.get('rule_name')
    keyword = data.get('keyword')
    threshold = data.get('threshold')
    interval = data.get('interval')
    severity = data.get('severity')
    description = data.get('description')

    if not all([rule_name, keyword, threshold, interval, severity]):
        return jsonify({'error': 'All fields except description are required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO correlation_rules (rule_name, keyword, threshold, interval, severity, description)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (rule_name, keyword, threshold, interval, severity, description))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'message': 'Correlation rule added'}), 201


@log_bp.route('/api/logs/search', methods=['GET'])
def search_logs():
    query = request.args.get('q', '')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT alert_id, rule_level, agent_name, rule_description, timestamp
        FROM logs
        WHERE alert_id ILIKE %s OR rule_description ILIKE %s OR agent_name ILIKE %s
        ORDER BY timestamp DESC
        LIMIT 50
    """, (f"%{query}%", f"%{query}%", f"%{query}%"))
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([{
        'alert_id': row[0],
        'level': row[1],
        'agent': row[2],
        'description': row[3],
        'timestamp': row[4].isoformat()
    } for row in results])


@log_bp.route('/api/correlated-alerts', methods=['GET'])
def get_correlated_alerts():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM correlated_alerts ORDER BY timestamp DESC LIMIT 50")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([{
        'id': r[0],
        'correlation_type': r[1],
        'related_alerts': r[2],
        'severity': r[3],
        'agent_id': r[4],
        'correlation_notes': r[5],
        'timestamp': r[6].isoformat()
    } for r in rows])


