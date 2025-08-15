import os
import sqlite3
import shutil
from datetime import datetime, timedelta
import platform
import glob
import chromadb
from fetch_latest_data import fetch_new_entries


# ---- Timestamp Conversions ----
def chrome_time_to_datetime(chrome_time):
    return datetime(1601, 1, 1) + timedelta(microseconds=chrome_time)

def firefox_time_to_datetime(firefox_time):
    return datetime.fromtimestamp(firefox_time / 1_000_000)

# ---- DB Copy & Query ----
def copy_and_query(db_path, query, time_converter):
    if not os.path.exists(db_path):
        return []
    temp_path = os.path.join(os.getenv("TEMP") or "/tmp", "history_temp.sqlite")
    shutil.copy2(db_path, temp_path)
    results = []
    conn = sqlite3.connect(temp_path)
    cursor = conn.cursor()
    cursor.execute(query)
    for url, title, last_time in cursor.fetchall():
        try:
            last_time = time_converter(last_time) if last_time else None
        except Exception:
            last_time = None
        results.append({"time": last_time, "title": title or "", "url": url})
    conn.close()
    os.remove(temp_path)
    return results

# ---- Browser History Fetchers ----
def get_chrome_history():
    system = platform.system()
    if system == "Windows":
        path = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data\Default\History")
    else:
        path = os.path.expanduser("~/.config/google-chrome/Default/History")
    query = "SELECT urls.url, urls.title, urls.last_visit_time FROM urls ORDER BY last_visit_time DESC"
    return copy_and_query(path, query, chrome_time_to_datetime)

def get_edge_history():
    system = platform.system()
    if system == "Windows":
        path = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\History")
    else:
        path = os.path.expanduser("~/.config/microsoft-edge/Default/History")
    query = "SELECT urls.url, urls.title, urls.last_visit_time FROM urls ORDER BY last_visit_time DESC"
    return copy_and_query(path, query, chrome_time_to_datetime)

def get_firefox_history():
    system = platform.system()
    if system == "Windows":
        profile_dir = os.path.expandvars(r"%APPDATA%\Mozilla\Firefox\Profiles")
    else:
        profile_dir = os.path.expanduser("~/.mozilla/firefox")
    profiles = glob.glob(os.path.join(profile_dir, "*.default*"))
    results = []
    query = "SELECT moz_places.url, moz_places.title, moz_places.last_visit_date FROM moz_places ORDER BY last_visit_date DESC"
    for profile in profiles:
        db_path = os.path.join(profile, "places.sqlite")
        results.extend(copy_and_query(db_path, query, firefox_time_to_datetime))
    return results

# ---- Store in ChromaDB ----

def store_in_chromadb(history_data):
    client = chromadb.PersistentClient(path="./browser_history_db")
    collection = client.get_or_create_collection("browser_history")

    # Get all stored URLs so far
    existing = collection.get()
    stored_urls = set(meta["url"] for meta in existing["metadatas"])

    # Keep only entries with new URLs
    new_entries = [e for e in history_data if e["url"] not in stored_urls]

    # Add only the new entries
    for i, entry in enumerate(new_entries, start=len(stored_urls)):
        if not entry["time"]:
            continue
        collection.add(
            ids=[f"doc_{i}"],
            documents=[f"{entry['title']} - {entry['url']}"],
            metadatas={
                "url": entry["url"],
                "title": entry["title"],
                "time": entry["time"].isoformat()
            },
        )

    print(f"Added {len(new_entries)} new entries to ChromaDB (Total stored: {len(stored_urls) + len(new_entries)})")


if __name__ == "__main__":
    # chrome_hist = get_chrome_history()
    # edge_hist = get_edge_history()
    firefox_hist = get_firefox_history()

    # Merge and sort
    # all_history = chrome_hist + edge_hist + firefox_hist
    all_history = firefox_hist
    all_history = sorted(all_history, key=lambda x: x["time"] or datetime.min, reverse=True)

    # Store in ChromaDB
    new_entries = fetch_new_entries(all_history)
    store_in_chromadb(new_entries)
    
    print("Latest 5 entries:")
    for h in all_history[:5]:
        print(h["time"], "-", h["title"], "-", h["url"])
