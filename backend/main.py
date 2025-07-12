# main.py
from flask import Flask
from flask_cors import CORS
from log_routes import log_bp
from ticket_routes import ticket_bp
from init_db import init_db
import threading
from queue import Queue
import time

# Create a global email queue
email_queue = Queue()

# Email worker function to process emails in background
def email_worker():
    from log_routes import process_email_queue
    from ticket_routes import set_email_queue
    
    # Share the queue with both modules
    set_email_queue(email_queue)
    
    print("📧 Email background worker started")
    while True:
        try:
            process_email_queue(email_queue)
            time.sleep(0.1)  # Short sleep to prevent CPU hogging
        except Exception as e:
            print(f"❌ Error in email worker: {e}")
            time.sleep(1)  # Sleep longer on error

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])
app.register_blueprint(log_bp)
app.register_blueprint(ticket_bp)

@app.route('/api/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    init_db()
    
    # Start email worker thread
    email_thread = threading.Thread(target=email_worker, daemon=True)
    email_thread.start()
    
    print("🚀 Unified SIEM API running at http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)

