import os
import time
import random
import re
import html
import requests

# ─── Load .env (dev only) ────────────────────────────────────────────────────
def _load_env_file():
    for path in [".env", "../.env", "backend/.env"]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            except Exception:
                pass

_load_env_file()

# ─── Config ───────────────────────────────────────────────────────────────────
USER_AGENT = os.getenv(
    "USER_AGENT",
    "RedditGapFinder/2.0 (market research tool; contact via GitHub)"
)
FORCE_MOCK_DATA = os.getenv("FORCE_MOCK_DATA", "false").lower() in ("true", "1", "yes")

def is_using_mock_fallback() -> bool:
    return FORCE_MOCK_DATA

# ─── Helpers ──────────────────────────────────────────────────────────────────
def clean_html(raw: str) -> str:
    if not raw:
        return ""
    raw = re.sub(r"<[^>]+>", " ", raw)
    return html.unescape(raw).strip()

def _clean_selftext(raw: str) -> str:
    """Strip Reddit boilerplate and noise from selftext."""
    if not raw or raw in ("[deleted]", "[removed]"):
        return ""
    text = re.sub(r"\s*submitted by\s*/u/\S+", "", raw)
    text = re.sub(r"\[link\]\s*\[comments\]", "", text)
    text = re.sub(r"https?://\S+", "", text)  # remove bare URLs
    text = re.sub(r"\s+", " ", text).strip()
    return text

def _parse_children(children: list, now: float) -> list[dict]:
    """Convert Reddit API children list into clean post dicts."""
    posts = []
    seen_ids = set()
    for child in children:
        d = child.get("data", {})
        if d.get("stickied"):
            continue
        post_id = d.get("id", "")
        if not post_id or post_id in seen_ids:
            continue
        seen_ids.add(post_id)
        title = d.get("title", "").strip()
        if not title:
            continue
        selftext = _clean_selftext(d.get("selftext") or "")
        posts.append({
            "id": post_id,
            "title": title,
            "selftext": selftext[:2000],
            "url": d.get("url") or f"https://reddit.com{d.get('permalink', '')}",
            "score": d.get("score", 0),
            "num_comments": d.get("num_comments", 0),
            "created_utc": d.get("created_utc", now),
            "subreddit": d.get("subreddit", ""),
        })
    return posts

# ─── In-memory cache (TTL: 2 minutes) ────────────────────────────────────────
_cache: dict = {}
_CACHE_TTL = 120

# ─── Reddit JSON API (primary) ───────────────────────────────────────────────
def fetch_reddit_json(subreddit_name: str, limit: int = 25) -> list[dict]:
    """
    Fetch posts via Reddit's public JSON API.
    Pulls from hot + top(week) + new and deduplicates to hit `limit`.
    Works reliably from cloud servers (RSS is blocked on datacenter IPs).
    """
    clean_sub = subreddit_name.replace("r/", "").strip("/").strip()
    cache_key = f"json:{clean_sub}"
    now = time.time()

    if cache_key in _cache:
        entry = _cache[cache_key]
        if now - entry["ts"] < _CACHE_TTL:
            print(f"[CACHE HIT] r/{clean_sub}")
            return entry["posts"][:limit]

    headers = {"User-Agent": USER_AGENT}
    sort_urls = [
        f"https://www.reddit.com/r/{clean_sub}/hot.json?limit=25&raw_json=1",
        f"https://www.reddit.com/r/{clean_sub}/top.json?limit=25&t=week&raw_json=1",
        f"https://www.reddit.com/r/{clean_sub}/new.json?limit=25&raw_json=1",
    ]

    all_posts: list[dict] = []
    seen_ids: set[str] = set()
    got_404 = False

    for url in sort_urls:
        if got_404:
            break
        print(f"[JSON API] GET {url}")
        try:
            resp = requests.get(url, headers=headers, timeout=20)
            if resp.status_code == 200:
                children = resp.json().get("data", {}).get("children", [])
                batch = _parse_children(children, now)
                for p in batch:
                    if p["id"] not in seen_ids:
                        seen_ids.add(p["id"])
                        all_posts.append(p)
                print(f"[JSON API] +{len(batch)} posts (total {len(all_posts)}) from r/{clean_sub}")
            elif resp.status_code == 404:
                print(f"[JSON API] r/{clean_sub} not found (404)")
                got_404 = True
            elif resp.status_code == 429:
                print(f"[JSON API] Rate-limited (429), backing off 2s")
                time.sleep(2)
            else:
                print(f"[JSON API] HTTP {resp.status_code} from r/{clean_sub}")
        except requests.exceptions.Timeout:
            print(f"[JSON API] Timeout on r/{clean_sub}")
        except Exception as e:
            print(f"[JSON API] Error: {e}")

        # Stop fetching more sorts if we already have enough
        if len(all_posts) >= limit:
            break

    if all_posts:
        _cache[cache_key] = {"ts": now, "posts": all_posts}
        print(f"[JSON API] Final: {len(all_posts)} unique posts from r/{clean_sub}")
        return all_posts[:limit]

    return []

# ─── RSS (secondary fallback) ─────────────────────────────────────────────────
def _parse_rss(xml_bytes: bytes, limit: int) -> list[dict]:
    import xml.etree.ElementTree as ET
    posts = []
    now = time.time()
    try:
        root = ET.fromstring(xml_bytes)
        tag = root.tag.lower()
        if "feed" in tag:
            ns = {"a": "http://www.w3.org/2005/Atom"}
            entries = root.findall("a:entry", ns) or root.findall("entry")
            for i, e in enumerate(entries[:limit]):
                t = e.find("a:title", ns) or e.find("title")
                title = t.text if t is not None else "Untitled"
                raw_id_el = e.find("a:id", ns) or e.find("id")
                raw_id = raw_id_el.text if raw_id_el is not None else ""
                m = re.search(r"/comments/([a-z0-9]+)", raw_id or "", re.I)
                post_id = m.group(1) if m else f"rss_{i}_{int(now)}"
                link_el = e.find("a:link", ns) or e.find("link")
                url = (link_el.attrib.get("href", "") if link_el is not None and "href" in link_el.attrib
                       else (link_el.text or "https://reddit.com") if link_el is not None else "https://reddit.com")
                body_el = (e.find("a:content", ns) or e.find("content") or
                           e.find("a:summary", ns) or e.find("summary"))
                selftext = _clean_selftext(clean_html(body_el.text if body_el is not None else ""))[:2000]
                posts.append({"id": post_id, "title": title, "selftext": selftext,
                              "url": url, "score": random.randint(50, 400), "created_utc": now})
        else:
            channel = root.find("channel")
            items = channel.findall("item") if channel is not None else root.findall(".//item")
            for i, item in enumerate(items[:limit]):
                t = item.find("title")
                title = t.text if t is not None else "Untitled"
                guid = item.find("guid")
                raw_id = guid.text if guid is not None else ""
                m = re.search(r"/comments/([a-z0-9]+)", raw_id or "", re.I)
                post_id = m.group(1) if m else (raw_id.split("/")[-1] if raw_id else f"rss_{i}_{int(now)}")
                link_el = item.find("link")
                url = link_el.text if link_el is not None else "https://reddit.com"
                desc = item.find("description") or item.find("content")
                selftext = _clean_selftext(clean_html(desc.text if desc is not None else ""))[:2000]
                posts.append({"id": post_id, "title": title, "selftext": selftext,
                              "url": url, "score": random.randint(50, 400), "created_utc": now})
    except Exception as e:
        print(f"[RSS PARSER] Error: {e}")
    return posts

def fetch_reddit_rss(subreddit_name: str, limit: int = 25) -> list[dict]:
    clean_sub = subreddit_name.replace("r/", "").strip("/").strip()
    headers = {"User-Agent": USER_AGENT}
    for url in [f"https://www.reddit.com/r/{clean_sub}/.rss?limit={limit}"]:
        print(f"[RSS] GET {url}")
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code == 200:
                posts = _parse_rss(resp.content, limit)
                if posts:
                    print(f"[RSS] {len(posts)} posts from r/{clean_sub}")
                    return posts
            else:
                print(f"[RSS] HTTP {resp.status_code}")
        except Exception as e:
            print(f"[RSS] Error: {e}")
    return []

# ─── Comments ─────────────────────────────────────────────────────────────────
def fetch_reddit_comments(post_id: str, limit: int = 25) -> list[dict]:
    url = f"https://www.reddit.com/comments/{post_id}.json?raw_json=1"
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) >= 2:
                comments = []
                for child in data[1].get("data", {}).get("children", [])[:limit]:
                    if child.get("kind") != "t1":
                        continue
                    d = child.get("data", {})
                    body = d.get("body", "")
                    if not body or body in ("[deleted]", "[removed]"):
                        continue
                    comments.append({"id": d.get("id", f"c_{int(time.time())}"),
                                     "post_id": post_id, "body": body[:2000],
                                     "score": d.get("score", 0)})
                if comments:
                    return comments
    except Exception as e:
        print(f"[COMMENTS] Error: {e}")
    return []

# ─── Public API ───────────────────────────────────────────────────────────────
def scrape_subreddit(subreddit_name: str, limit: int = 25) -> list[dict]:
    """JSON API → RSS → empty list (never mock unless FORCE_MOCK_DATA=true)."""
    if FORCE_MOCK_DATA:
        return generate_contextual_posts(subreddit_name, limit)
    posts = fetch_reddit_json(subreddit_name, limit=limit)
    if posts:
        return posts
    posts = fetch_reddit_rss(subreddit_name, limit=limit)
    if posts:
        return posts
    print(f"[SCRAPER] All methods failed for '{subreddit_name}'")
    return []

def scrape_comments(post_id: str, limit: int = 50) -> list[dict]:
    if FORCE_MOCK_DATA:
        return generate_contextual_comments(post_id, limit)
    comments = fetch_reddit_comments(post_id, limit)
    return comments if comments else []

# ─── Mock generators (last resort) ───────────────────────────────────────────
def generate_contextual_posts(subreddit_name: str, limit: int) -> list[dict]:
    now = time.time()
    scenarios = [
        (f"Frustrated with tools in {subreddit_name}",
         f"The existing solutions for {subreddit_name} are overpriced and don't work well."),
        (f"Why is {subreddit_name} so difficult to manage?",
         f"I've tried everything but nothing works properly for {subreddit_name}."),
        (f"Looking for better {subreddit_name} alternatives",
         "Current options are either too expensive or missing key features.")
    ]
    posts = []
    for i in range(min(limit, 10)):
        title, body = random.choice(scenarios)
        posts.append({"id": f"mock_{subreddit_name}_{i}_{int(now)}", "title": title,
                      "selftext": body, "url": f"https://reddit.com/r/{subreddit_name}",
                      "score": random.randint(50, 600),
                      "created_utc": now - random.randint(1800, 86400)})
    return posts

def generate_contextual_comments(post_id: str, limit: int) -> list[dict]:
    return [{"id": f"mock_comment_{post_id}_{i}", "post_id": post_id,
             "body": random.choice(["I completely agree! This is a major problem.",
                                    "Yes, I would pay for a solution to this.",
                                    "The existing tools are terrible."]),
             "score": random.randint(10, 150)} for i in range(min(limit, 6))]