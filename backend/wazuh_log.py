import time

def tail_file(path):
    with open(path, 'r') as f:
        f.seek(0, 2)  # move to end
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.5)
                continue
            try:
                r = requests.post("http://139.59.244.166:5000/api/logs",
                                  headers={"Content-Type": "application/json"},
                                  data=line.strip())
                print(f"[{r.status_code}] {line.strip()}")
            except Exception as e:
                print(f"❌ Error sending: {e}")

tail_file("/var/ossec/logs/alerts/alerts.json")

