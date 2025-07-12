# init_db.py

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.getenv("DB_NAME", "wazuh_logs")
DB_USER = os.getenv("DB_USER", "siem_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "securepassword")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

def init_db():
    # Connect to default postgres database to check/create our DB
    try:
        conn = psycopg2.connect(dbname="postgres", user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        exists = cur.fetchone()
        if not exists:
            print(f"📦 Creating database '{DB_NAME}'...")
            cur.execute(f"CREATE DATABASE {DB_NAME};")
        else:
            print(f"✅ Database '{DB_NAME}' already exists.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error connecting to PostgreSQL: {e}")
        return

    # Now connect to your actual DB and create tables if needed
    try:
        conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
        cur = conn.cursor()

        # Logs table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id SERIAL PRIMARY KEY,
            alert_id TEXT,
            timestamp TIMESTAMP,
            rule_level INT,
            rule_description TEXT,
            rule_id TEXT,
            mitre_ids TEXT,
            mitre_tactics TEXT,
            mitre_techniques TEXT,
            agent_id TEXT,
            agent_name TEXT,
            manager_name TEXT,
            full_log TEXT,
            location TEXT,
            command TEXT,
            srcuser TEXT,
            dstuser TEXT,
            tty TEXT,
            pwd TEXT
        );
        """)

        # Correlation rules
        cur.execute("""
        CREATE TABLE IF NOT EXISTS correlation_rules (
            id SERIAL PRIMARY KEY,
            rule_name TEXT,
            keyword TEXT,
            threshold INT,
            interval TEXT,
            severity TEXT,
            description TEXT
        );
        """)

        # Correlated alerts
        cur.execute("""
        CREATE TABLE IF NOT EXISTS correlated_alerts (
            id SERIAL PRIMARY KEY,
            correlation_type TEXT,
            related_alerts TEXT[],
            severity TEXT,
            agent_id TEXT,
            correlation_notes TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Tickets
        cur.execute("""
        CREATE TABLE IF NOT EXISTS security_tickets (
            id SERIAL PRIMARY KEY,
            alert_id TEXT,
            status TEXT,
            severity TEXT,
            assigned_to TEXT,
            notes TEXT,
            updated_at TIMESTAMP,
            client_email TEXT
        );
        """)

        # Ticket history
        cur.execute("""
        CREATE TABLE IF NOT EXISTS ticket_history (
            id SERIAL PRIMARY KEY,
            ticket_id INT,
            field_changed TEXT,
            old_value TEXT,
            new_value TEXT,
            changed_by TEXT,
            changed_at TIMESTAMP
        );
        """)

        # Security roles
        cur.execute("""
        CREATE TABLE IF NOT EXISTS security_roles (
            id SERIAL PRIMARY KEY,
            level TEXT,
            email TEXT
        );
        """)

        conn.commit()
        cur.close()
        conn.close()
        print("🛠️ All necessary tables are ready.")

    except Exception as e:
        print(f"❌ Error creating tables: {e}")

