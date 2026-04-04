import os
import sqlite3
import shutil
import uuid
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
    """Copy a locked browser SQLite DB to a temp file and query it safely."""
    if not os.path.exists(db_path):
        return []
    # Use a unique temp file per call to avoid collisions when querying multiple profiles
    temp_path = os.path.join(
        os.getenv("TEMP") or "/tmp",
        f"history_temp_{uuid.uuid4().hex[:8]}.sqlite"
    )
    try:
        shutil.copy2(db_path, temp_path)
    except Exception as e:
        print(f"  [warn] Could not copy {db_path}: {e}")
        return []

    results = []
    try:
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
    except Exception as e:
        print(f"  [warn] Could not query {db_path}: {e}")
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass

    return results


# ---- Path resolution helpers ----
def _expand(path: str) -> str:
    return os.path.expandvars(os.path.expanduser(path))

SYSTEM = platform.system()  # "Windows", "Linux", "Darwin"


def _chromium_profile_dirs(base_path: str):
    """
    Return all profile History files under a Chromium-style User Data dir.
    Handles Default + Profile 1/2/3/... layouts.
    """
    base = _expand(base_path)
    if not os.path.isdir(base):
        return []
    paths = []
    # Default profile
    default = os.path.join(base, "Default", "History")
    if os.path.exists(default):
        paths.append(default)
    # Named profiles: Profile 1, Profile 2, ...
    for entry in glob.glob(os.path.join(base, "Profile *", "History")):
        paths.append(entry)
    return paths


# ---- Candidate base dirs per browser per OS ----

CHROME_BASES = {
    "Windows": [
        r"%LOCALAPPDATA%\Google\Chrome\User Data",
        r"%LOCALAPPDATA%\Google\Chrome Beta\User Data",
        r"%LOCALAPPDATA%\Google\Chrome SxS\User Data",  # Canary
    ],
    "Linux": [
        "~/.config/google-chrome",
        "~/.config/google-chrome-beta",
        "~/.config/google-chrome-unstable",
        "~/.config/chromium",                           # Chromium on Linux
        "~/.config/chromium-browser",
    ],
    "Darwin": [
        "~/Library/Application Support/Google/Chrome",
        "~/Library/Application Support/Google/Chrome Beta",
        "~/Library/Application Support/Chromium",
    ],
}

EDGE_BASES = {
    "Windows": [
        r"%LOCALAPPDATA%\Microsoft\Edge\User Data",
        r"%LOCALAPPDATA%\Microsoft\Edge Beta\User Data",
        r"%LOCALAPPDATA%\Microsoft\Edge Dev\User Data",
        r"%LOCALAPPDATA%\Microsoft\Edge Canary\User Data",
    ],
    "Linux": [
        "~/.config/microsoft-edge",
        "~/.config/microsoft-edge-beta",
        "~/.config/microsoft-edge-dev",
    ],
    "Darwin": [
        "~/Library/Application Support/Microsoft Edge",
        "~/Library/Application Support/Microsoft Edge Beta",
        "~/Library/Application Support/Microsoft Edge Dev",
    ],
}

FIREFOX_PROFILE_DIRS = {
    "Windows": [
        r"%APPDATA%\Mozilla\Firefox\Profiles",
        r"%APPDATA%\Mozilla\Firefox\Profiles",  # kept consistent; snap/flatpak not common on Windows
    ],
    "Linux": [
        "~/.mozilla/firefox",
        "~/.mozilla/firefox-esr",
        # Snap
        "~/snap/firefox/common/.mozilla/firefox",
        # Flatpak
        "~/.var/app/org.mozilla.firefox/.mozilla/firefox",
        "~/.var/app/org.mozilla.firefox-esr/.mozilla/firefox",
    ],
    "Darwin": [
        "~/Library/Application Support/Firefox/Profiles",
    ],
}


# ---- Browser History Fetchers ----

CHROMIUM_QUERY = (
    "SELECT urls.url, urls.title, urls.last_visit_time "
    "FROM urls ORDER BY last_visit_time DESC"
)

def _fetch_chromium_browser(bases):
    """Generic fetcher for any Chromium-based browser given a list of base dirs."""
    results = []
    seen_paths = set()
    for base in bases:
        for hist_path in _chromium_profile_dirs(base):
            if hist_path in seen_paths:
                continue
            seen_paths.add(hist_path)
            print(f"  Reading: {hist_path}")
            rows = copy_and_query(hist_path, CHROMIUM_QUERY, chrome_time_to_datetime)
            results.extend(rows)
    return results


def get_chrome_history():
    bases = CHROME_BASES.get(SYSTEM, CHROME_BASES.get("Linux", []))
    return _fetch_chromium_browser(bases)


def get_edge_history():
    bases = EDGE_BASES.get(SYSTEM, EDGE_BASES.get("Linux", []))
    return _fetch_chromium_browser(bases)


def get_firefox_history():
    """
    Firefox stores profiles under a Profiles/ directory.
    Each profile folder matching *.default* or *.default-release* contains places.sqlite.
    """
    profile_parent_dirs = FIREFOX_PROFILE_DIRS.get(SYSTEM, FIREFOX_PROFILE_DIRS.get("Linux", []))
    query = (
        "SELECT moz_places.url, moz_places.title, moz_places.last_visit_date "
        "FROM moz_places ORDER BY last_visit_date DESC"
    )
    results = []
    seen_paths = set()
    for parent_template in profile_parent_dirs:
        parent = _expand(parent_template)
        if not os.path.isdir(parent):
            continue
        # Match *.default*, *.default-release*, *.default-esr*, etc.
        for profile_dir in glob.glob(os.path.join(parent, "*.default*")):
            db_path = os.path.join(profile_dir, "places.sqlite")
            if db_path in seen_paths or not os.path.exists(db_path):
                continue
            seen_paths.add(db_path)
            print(f"  Reading: {db_path}")
            results.extend(copy_and_query(db_path, query, firefox_time_to_datetime))
    return results


# ---- Dedup across browsers ----
def deduplicate(history: list) -> list:
    """Keep the most-recent entry per URL when the same URL appears in multiple browsers."""
    best = {}
    for entry in history:
        url = entry["url"]
        t = entry["time"] or datetime.min
        if url not in best or t > (best[url]["time"] or datetime.min):
            best[url] = entry
    return list(best.values())


# ---- Store in ChromaDB ----
def store_in_chromadb(history_data):
    client = chromadb.PersistentClient(path="./browser_history_db")
    collection = client.get_or_create_collection("browser_history")

    existing = collection.get()
    stored_urls = set(meta["url"] for meta in existing["metadatas"])

    new_entries = [e for e in history_data if e["url"] not in stored_urls]

    added = 0
    for i, entry in enumerate(new_entries, start=len(stored_urls)):
        if not entry["time"]:
            continue
        collection.add(
            ids=[f"doc_{i}"],
            documents=[f"{entry['title']} - {entry['url']}"],
            metadatas={
                "url": entry["url"],
                "title": entry["title"],
                "time": entry["time"].isoformat(),
            },
        )
        added += 1

    print(f"Added {added} new entries to ChromaDB (Total stored: {len(stored_urls) + added})")


# ---- Main ----
if __name__ == "__main__":
    print(f"Detected OS: {SYSTEM}\n")

    all_history = []

    print("[Chrome]")
    chrome_hist = get_chrome_history()
    print(f"  → {len(chrome_hist)} entries\n")
    all_history.extend(chrome_hist)

    print("[Edge]")
    edge_hist = get_edge_history()
    print(f"  → {len(edge_hist)} entries\n")
    all_history.extend(edge_hist)

    print("[Firefox]")
    firefox_hist = get_firefox_history()
    print(f"  → {len(firefox_hist)} entries\n")
    all_history.extend(firefox_hist)

    # Deduplicate URLs across browsers, keep most-recent timestamp
    all_history = deduplicate(all_history)

    # Sort by time descending
    all_history = sorted(all_history, key=lambda x: x["time"] or datetime.min, reverse=True)

    print(f"Total unique entries across all browsers: {len(all_history)}\n")

    # Filter to only new entries since last run
    new_entries = fetch_new_entries(all_history)
    store_in_chromadb(new_entries)

    print("\nLatest 5 entries:")
    for h in all_history[:5]:
        print(h["time"], "-", h["title"][:60], "-", h["url"][:80])