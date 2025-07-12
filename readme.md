# 📊 UNIFIED-CYBERSECURITY-DASHBOARD-FOR REAL-TIME-MONITORING-AND-INCIDENT-MANAGEMENT

This project collects **Wazuh** alerts from a client server, forwards them to a custom Python backend API, stores them in a **PostgreSQL** database, and displays them in a **React** dashboard.

✅ **Tested on:** Ubuntu Server 22.04 LTS (Jammy Jellyfish)

---

## ⚙️ Requirements

- Ubuntu Server (tested with Jellyfish)
- Python 3 & pip
- PostgreSQL
- Node.js & npm
- Wazuh installed on the client machine

---

## 🚀 Setup Guide

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/who1sm3/unified-siem.git
cd unified-siem
```

---

### 2️⃣ Install Wazuh on the Client Server

Follow the official [Wazuh installation guide](https://documentation.wazuh.com/current/installation-guide/index.html) for your OS.  
Ensure Wazuh is writing alerts to:

```
/var/ossec/logs/alerts/alerts.json
```

---

### 3️⃣ Install PostgreSQL & Create Database

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

Create a database and user:

```bash
sudo -u postgres createdb wazuh_logs
sudo -u postgres psql -c "CREATE USER siem_user WITH PASSWORD 'securepassword';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wazuh_logs TO siem_user;"
```

---

### 4️⃣ Configure the Backend Environment

In the `backend` folder, create a `.env` file:

```env
DB_NAME=wazuh_logs
DB_USER=siem_user
DB_PASSWORD=securepassword
DB_HOST=localhost
DB_PORT=5432

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=youremail@gmail.com
EMAIL_HOST_PASSWORD=yourappassword
EMAIL_FROM=analyst@gmail.com
EMAIL_TO=analyst@gmail.com
```

Replace with **your own values**.

---

### 5️⃣ Install Backend Dependencies

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install Python dependencies in one line
pip install Flask flask-cors psycopg2-binary requests python-dotenv

```

---

### 6️⃣ Run the Backend

```bash
# In the backend folder with venv active
python main.py
```

The backend listens on `http://0.0.0.0:5000` by default.

---

### 7️⃣ Install Frontend Dependencies

```bash
cd ../frontend

npm install --legacy-peer-deps
```

---

### 8️⃣ Build and Run the Frontend

```bash
npm run build
npm start
```

Visit the dashboard at [http://localhost:3000](http://localhost:3000)

---

### 9️⃣ Create the Wazuh Log Shipper on the Client

On the **client server** (the server running Wazuh):

1. Move to `/opt`:

   ```bash
   cd /opt
   ```

2. Create the log shipper script:

   ```bash
   sudo nano wazuh_log.py
   ```

3. Copy the code inside `wazuh_log.py`:

   Replace `YOUR_SERVER_IP` with your backend server’s IP.

4. Save and exit (`CTRL+O`, `ENTER`, `CTRL+X`).

5. Install Python `requests` if needed:

   ```bash
   pip install requests
   ```

6. Run the log shipper:

   ```bash
   python3 wazuh_log.py
   ```

---

## ✅ Tips for Production

- Use **HTTPS** for your backend API.
- Use a strong API token for authentication.
- Regularly monitor logs and database usage.

---

## 🤝 Contributing

Pull requests and suggestions are welcome!

---

## 📜 License

MIT License

Copyright (c) 2025 Mohammad Amin

This project was created as a Final Year Project for Multimedia University (MMU).

Permission is granted, free of charge, to use, copy, modify, and distribute this software,
subject to the following conditions:

- This copyright and permission notice shall be included in all copies.
- The software is provided "as is", without warranty of any kind.

All trademarks and logos remain the property of their respective owners.

Author: Mohammad Amin | Student ID: 1221302787
MMU Final Year Project 2025


---

**Happy Logging! 🛡️✨**
