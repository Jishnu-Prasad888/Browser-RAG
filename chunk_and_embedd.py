import os
import json
import time
import uuid
import typing as t
from datetime import datetime
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

import chromadb
from chromadb.utils import embedding_functions


# ----------------------------
# Config
# ----------------------------
HISTORY_DB_PATH = "./browser_history_db"     # where your earlier script saved the browser_history collection
HISTORY_COLLECTION = "browser_history"

CHUNKS_DB_PATH = "./page_chunks_db"          # new persistent DB for page chunks
CHUNKS_COLLECTION = "page_chunks"

SEEN_URLS_FILE = "seen_urls.json"            # remembers which URLs we already processed
BLOCK_DOMAINS_FILE = "block_domains.json"    # domains to ignore

MAX_URLS_PER_RUN = 25                        # limit per run
MIN_TEXT_LEN = 300                           # skip pages with too little text
CHUNK_SIZE = 1500                            # chars per chunk
CHUNK_OVERLAP = 200                          # chars overlap
REQUEST_TIMEOUT = 15                         # seconds
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
OLLAMA_EMBED_MODEL = "nomic-embed-text"


# ----------------------------
# Utilities: robust JSON state
# ----------------------------
def _read_json(path: str, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return default
            return json.loads(content)
    except Exception:
        return default


def _write_json(path: str, data) -> None:
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def load_seen_urls() -> set:
    data = _read_json(SEEN_URLS_FILE, default={"urls": []})
    return set(data.get("urls", []))


def save_seen_urls(urls: t.Iterable[str]) -> None:
    _write_json(SEEN_URLS_FILE, {"urls": sorted(set(urls))})


def load_blocklist() -> t.List[str]:
    data = _read_json(BLOCK_DOMAINS_FILE, default={"blocklist": []})
    # normalize to lowercase
    return [d.strip().lower() for d in data.get("blocklist", []) if d.strip()]


# ----------------------------
# Domain filtering
# ----------------------------
def netloc(domain_or_url: str) -> str:
    """Return lowercase netloc if URL, else domain normalized."""
    if "://" in domain_or_url:
        try:
            return urlparse(domain_or_url).netloc.lower()
        except Exception:
            return domain_or_url.lower()
    return domain_or_url.lower()


def domain_blocked(url: str, blocklist: t.List[str]) -> bool:
    nloc = netloc(url)
    # simple contains check to catch subdomains: if block item appears at end or inside netloc
    for bad in blocklist:
        if bad in nloc:
            return True
    return False


# ----------------------------
# Fetch latest URLs from history
# ----------------------------
def get_latest_history_urls(limit: int = 50) -> t.List[dict]:
    client = chromadb.PersistentClient(path=HISTORY_DB_PATH)
    coll = client.get_or_create_collection(HISTORY_COLLECTION)

    # Pull everything we have: ids + metadatas
    data = coll.get(include=["metadatas"])
    metadatas = data.get("metadatas", []) or []

    # Expect each metadata to contain: url, title, time (ISO)
    def parse_time(meta):
        tstr = meta.get("time")
        try:
            return datetime.fromisoformat(tstr) if tstr else datetime.min
        except Exception:
            return datetime.min

    # Sort by time desc, then take limit
    sorted_metas = sorted(metadatas, key=parse_time, reverse=True)
    if limit:
        sorted_metas = sorted_metas[:limit]

    return sorted_metas


# ----------------------------
# HTTP fetch + text extraction
# ----------------------------
def fetch_html(url: str) -> t.Optional[str]:
    try:
        resp = requests.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT,
            allow_redirects=True,
        )
        ctype = (resp.headers.get("Content-Type") or "").lower()
        if "text/html" not in ctype and "application/xhtml+xml" not in ctype:
            return None
        if resp.status_code >= 400:
            return None
        return resp.text
    except Exception:
        return None


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    # remove script/style/nav/footer headers
    for tag in soup(["script", "style", "noscript", "template"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)
    # collapse spaces
    text = " ".join(text.split())
    return text


# ----------------------------
# Chunking
# ----------------------------
def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> t.List[str]:
    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + size, n)
        chunk = text[start:end]
        if chunk:
            chunks.append(chunk)
        if end == n:
            break
        start = end - overlap if end - overlap > start else end
    return chunks


# ----------------------------
# Ollama embedding function
# ----------------------------
class OllamaEmbeddingFunction(embedding_functions.EmbeddingFunction):
    def __init__(self, model: str = OLLAMA_EMBED_MODEL, url: str = OLLAMA_EMBED_URL):
        self.model = model
        self.url = url

    def __call__(self, input: t.List[str]) -> t.List[t.List[float]]:
        # Batch over HTTP to the local Ollama embeddings API
        # API: POST /api/embeddings { "model": "...", "prompt": "..." }
        embeddings = []
        for text in input:
            payload = {"model": self.model, "prompt": text}
            try:
                r = requests.post(self.url, json=payload, timeout=60)
                r.raise_for_status()
                data = r.json()
                vec = data.get("embedding")
                if not vec:
                    raise ValueError("No embedding returned")
                embeddings.append(vec)
            except Exception as e:
                # backoff briefly and try once more
                time.sleep(0.5)
                try:
                    r = requests.post(self.url, json=payload, timeout=60)
                    r.raise_for_status()
                    data = r.json()
                    vec = data.get("embedding") or []
                    embeddings.append(vec)
                except Exception:
                    # if still failing, append zero vector placeholder to keep alignment (not ideal)
                    embeddings.append([])
        return embeddings


# ----------------------------
# Main pipeline
# ----------------------------
def main():
    # Load state
    seen = load_seen_urls()
    blocklist = load_blocklist()

    # Get latest URLs from history DB
    latest = get_latest_history_urls(limit=200)  # grab more, we'll filter down

    # Filter: not seen and not blocked
    candidates = []
    for meta in latest:
        url = meta.get("url")
        if not url:
            continue
        if url in seen:
            continue
        if domain_blocked(url, blocklist):
            continue
        candidates.append(meta)

    # Keep only the first N per run
    candidates = candidates[:MAX_URLS_PER_RUN]

    if not candidates:
        print("No new URLs to process (after filtering seen + blocklist).")
        return

    # Prepare chunks collection with Ollama embedding function
    emb_fn = OllamaEmbeddingFunction()
    chunks_client = chromadb.PersistentClient(path=CHUNKS_DB_PATH)
    chunks_coll = chunks_client.get_or_create_collection(
        CHUNKS_COLLECTION,
        embedding_function=emb_fn,
        metadata={"source": "browser_history_pages"},
    )

    added_count = 0
    newly_seen = set(seen)

    for meta in candidates:
        url = meta.get("url")
        title = (meta.get("title") or "").strip()
        ts_iso = meta.get("time")
        print(f"Processing: {url}")

        html = fetch_html(url)
        if not html:
            print(f"  Skipped (no HTML or non-HTML content).")
            newly_seen.add(url)  # mark as seen so we don't retry forever
            continue

        text = html_to_text(html)
        if len(text) < MIN_TEXT_LEN:
            print(f"  Skipped (too little text: {len(text)} chars).")
            newly_seen.add(url)
            continue

        chunks = chunk_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP)
        # Build IDs & payloads
        ids = []
        documents = []
        metadatas = []

        base_id = uuid.uuid4().hex[:12]
        for idx, chunk in enumerate(chunks):
            ids.append(f"{base_id}_{idx}")
            documents.append(chunk)
            metadatas.append({
                "url": url,
                "title": title,
                "chunk_index": idx,
                "time": ts_iso,
            })

        # Add to Chroma with embeddings from Ollama
        try:
            chunks_coll.add(ids=ids, documents=documents, metadatas=metadatas)
            print(f"  Added {len(ids)} chunks.")
            added_count += 1
        except Exception as e:
            print(f"  Failed to add chunks: {e}")

        newly_seen.add(url)

    # Save updated seen list
    save_seen_urls(newly_seen)
    print(f"\nDone. Pages processed: {added_count}. Seen URLs now: {len(newly_seen)}")

    # Show a quick sample of the latest stored chunks for sanity
    stored = chunks_coll.get(limit=3, include=["metadatas"])
    if stored and stored.get("ids"):
        print("\nSample stored chunk metadata:")
        for m in stored.get("metadatas", []):
            print(f"  {m.get('url')} | chunk {m.get('chunk_index')} | {m.get('title')}")


if __name__ == "__main__":
    main()
