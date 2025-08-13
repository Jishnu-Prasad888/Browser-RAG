import json
import os
from datetime import datetime

# Path to file storing last fetched timestamp
STATE_FILE = "last_fetched.json"

def load_last_timestamp():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            data = json.load(f)
            return datetime.fromisoformat(data.get("last_time"))
    return None

def save_last_timestamp(timestamp):
    with open(STATE_FILE, "w") as f:
        json.dump({"last_time": timestamp.isoformat()}, f)

def fetch_new_entries(all_history):
    last_time = load_last_timestamp()
    if last_time:
        # Keep only entries newer than last_time
        new_entries = [e for e in all_history if e["time"] and e["time"] > last_time]
    else:
        # First run: treat all as new
        new_entries = all_history

    if new_entries:
        # Save the most recent timestamp
        latest_time = max(e["time"] for e in new_entries if e["time"])
        save_last_timestamp(latest_time)

    return new_entries
