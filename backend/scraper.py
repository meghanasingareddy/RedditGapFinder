import os
import time
import random
import re
import html
import requests
import threading

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
REDDIT_CLIENT_ID     = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")
USER_AGENT = os.getenv(
    "USER_AGENT",
    "RedditGapFinder/2.0 (market research bot; github.com/meghanasingareddy/RedditGapFinder)"
)
FORCE_MOCK_DATA = os.getenv("FORCE_MOCK_DATA", "false").lower() in ("true", "1", "yes")

def is_using_mock_fallback() -> bool:
    return FORCE_MOCK_DATA

# ─── OAuth2 token manager ─────────────────────────────────────────────────────
_token_lock = threading.Lock()
_oauth_token: str = ""
_token_expires_at: float = 0.0

def _get_oauth_token() -> str:
    """
    Fetch (or return cached) a Reddit OAuth2 application-only access token.
    Uses client_credentials grant — no user login needed, read-only public data.
    Token is valid for 2 hours and auto-refreshed.
    """
    global _oauth_token, _token_expires_at
    with _token_lock:
        now = time.time()
        if _oauth_token and now < _token_expires_at - 60:
            return _oauth_token
        if not REDDIT_CLIENT_ID or not REDDIT_CLIENT_SECRET:
            return ""
        try:
            resp = requests.post(
                "https://www.reddit.com/api/v1/access_token",
                auth=requests.auth.HTTPBasicAuth(REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET),
                data={"grant_type": "client_credentials"},
                headers={"User-Agent": USER_AGENT},
                timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                _oauth_token = data.get("access_token", "")
                expires_in = data.get("expires_in", 3600)
                _token_expires_at = now + expires_in
                print(f"[OAUTH] Token obtained, expires in {expires_in}s")
                return _oauth_token
            else:
                print(f"[OAUTH] Token fetch failed: HTTP {resp.status_code} — {resp.text[:200]}")
        except Exception as e:
            print(f"[OAUTH] Token error: {e}")
    return ""

def _make_reddit_request(url: str) -> requests.Response | None:
    """
    Make a Reddit API request. Tries OAuth2 first (if credentials set),
    then falls back to unauthenticated with browser User-Agent.
    """
    headers = {"User-Agent": USER_AGENT}

    # Strategy 1: OAuth2 bearer token (works from any IP/region)
    token = _get_oauth_token()
    if token:
        oauth_url = url.replace("https://www.reddit.com/", "https://oauth.reddit.com/")
        headers["Authorization"] = f"Bearer {token}"
        try:
            resp = requests.get(oauth_url, headers=headers, timeout=20)
            if resp.status_code == 200:
                return resp
            elif resp.status_code == 401:
                # Token expired, clear and retry
                global _oauth_token
                _oauth_token = ""
                token = _get_oauth_token()
                if token:
                    headers["Authorization"] = f"Bearer {token}"
                    resp = requests.get(oauth_url, headers=headers, timeout=20)
                    if resp.status_code == 200:
                        return resp
            print(f"[OAUTH] HTTP {resp.status_code} for {oauth_url}")
        except Exception as e:
            print(f"[OAUTH] Request error: {e}")

    # Strategy 2: Unauthenticated (works from some IPs)
    headers.pop("Authorization", None)
    try:
        resp = requests.get(url, headers=headers, timeout=20)
        if resp.status_code == 200:
            return resp
        print(f"[UNAUTH] HTTP {resp.status_code} for {url}")
    except Exception as e:
        print(f"[UNAUTH] Request error: {e}")

    return None

# ─── Helpers ──────────────────────────────────────────────────────────────────
def clean_html(raw: str) -> str:
    if not raw:
        return ""
    raw = re.sub(r"<[^>]+>", " ", raw)
    return html.unescape(raw).strip()

def _clean_selftext(raw: str) -> str:
    if not raw or raw in ("[deleted]", "[removed]"):
        return ""
    text = raw
    # Remove all common Reddit submission boilerplate
    text = re.sub(r'submitted by\s+/u/\S+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\[link\]', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\[comments\]', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\[score hidden\]', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\[deleted\]', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\[removed\]', '', text, flags=re.IGNORECASE)
    text = re.sub(r'https?://\S+', '', text)  # strip bare URLs
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def _parse_children(children: list, now: float) -> list[dict]:
    posts = []
    seen_ids: set[str] = set()
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

# ─── In-memory cache (TTL: 5 minutes) ────────────────────────────────────────
_cache: dict = {}
_CACHE_TTL = 300

# ─── Reddit JSON API ─────────────────────────────────────────────────────────
def fetch_reddit_json(subreddit_name: str, limit: int = 25) -> list[dict]:
    """
    Fetch posts using Reddit's JSON API (OAuth2 if credentials set, else unauthenticated).
    Pulls from hot + top(week) + new and deduplicates to hit `limit`.
    """
    clean_sub = subreddit_name.replace("r/", "").strip("/").strip()
    cache_key = f"json:{clean_sub}"
    now = time.time()

    if cache_key in _cache:
        entry = _cache[cache_key]
        if now - entry["ts"] < _CACHE_TTL:
            print(f"[CACHE HIT] r/{clean_sub}")
            return entry["posts"][:limit]

    sort_urls = [
        f"https://www.reddit.com/r/{clean_sub}/hot.json?limit=25&raw_json=1",
        f"https://www.reddit.com/r/{clean_sub}/top.json?limit=25&t=week&raw_json=1",
        f"https://www.reddit.com/r/{clean_sub}/new.json?limit=25&raw_json=1",
    ]

    all_posts: list[dict] = []
    seen_ids: set[str] = set()

    for url in sort_urls:
        print(f"[JSON API] GET {url}")
        resp = _make_reddit_request(url)
        if resp is None:
            continue
        try:
            children = resp.json().get("data", {}).get("children", [])
            batch = _parse_children(children, now)
            added = 0
            for p in batch:
                if p["id"] not in seen_ids:
                    seen_ids.add(p["id"])
                    all_posts.append(p)
                    added += 1
            print(f"[JSON API] +{added} new posts (total {len(all_posts)}) from r/{clean_sub}")
        except Exception as e:
            print(f"[JSON API] Parse error: {e}")

        if len(all_posts) >= limit:
            break

    if all_posts:
        _cache[cache_key] = {"ts": now, "posts": all_posts}
        return all_posts[:limit]

    return []

# ─── Subreddit search ─────────────────────────────────────────────────────────
def search_subreddits_api(topic: str, limit: int = 25) -> list[str]:
    """Search Reddit for subreddits matching a topic."""
    import urllib.parse
    encoded = urllib.parse.quote(topic)
    urls = [
        f"https://www.reddit.com/subreddits/search.json?q={encoded}&limit={limit}&raw_json=1",
        f"https://www.reddit.com/api/subreddits/search.json?q={encoded}&limit={limit}&raw_json=1",
    ]
    for url in urls:
        print(f"[SUB SEARCH] GET {url}")
        resp = _make_reddit_request(url)
        if resp is None:
            continue
        try:
            children = resp.json().get("data", {}).get("children", [])
            subs = []
            for child in children:
                d = child.get("data", {})
                if d.get("over18"):
                    continue
                name = d.get("display_name")
                if name and name not in subs:
                    subs.append(name)
            if subs:
                print(f"[SUB SEARCH] Found {len(subs)} subreddits for '{topic}'")
                return subs[:limit]
        except Exception as e:
            print(f"[SUB SEARCH] Parse error: {e}")
    return []

# ─── RSS fallback ─────────────────────────────────────────────────────────────
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
    url = f"https://www.reddit.com/r/{clean_sub}/.rss?limit={limit}"
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
    resp = _make_reddit_request(url)
    if resp is None:
        return []
    try:
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
    """JSON API (OAuth2 → unauthenticated) → RSS → empty. Never mock unless forced."""
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
    return fetch_reddit_comments(post_id, limit)

# ─── Mock generators (true last resort only) ─────────────────────────────────
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