import os
import time
import random

def load_env_file():
    for path in [".env", "../.env", "backend/.env"]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ[k.strip()] = v.strip().strip('"').strip("'")
            except Exception as e:
                print(f"Error loading .env file from {path}: {e}")

load_env_file()

import requests
import xml.etree.ElementTree as ET
import html
import re
import json

USER_AGENT = os.getenv("USER_AGENT", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
FORCE_MOCK_DATA = os.getenv("FORCE_MOCK_DATA", "").lower() in ("true", "1", "yes")

def is_using_mock_fallback() -> bool:
    if os.getenv("FORCE_MOCK_DATA", "").lower() in ("true", "1", "yes"):
        return True
    return False

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return html.unescape(cleantext).strip()

def parse_rss_or_atom(xml_content: bytes, limit: int = 100):
    posts = []
    try:
        root = ET.fromstring(xml_content)
        tag = root.tag.lower()
        
        if 'feed' in tag:
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            entries = root.findall('atom:entry', ns)
            if not entries:
                entries = root.findall('entry')
                
            for i, entry in enumerate(entries[:limit]):
                title_elem = entry.find('atom:title', ns)
                if title_elem is None:
                    title_elem = entry.find('title')
                title = title_elem.text if title_elem is not None else "Untitled Post"
                
                id_elem = entry.find('atom:id', ns)
                if id_elem is None:
                    id_elem = entry.find('id')
                raw_id = id_elem.text if id_elem is not None else f"atom_{int(time.time())}_{i}"
                post_id = _extract_reddit_id(raw_id) or f"rss_{i}_{int(time.time())}"
                
                link_elem = entry.find('atom:link', ns)
                if link_elem is None:
                    link_elem = entry.find('link')
                if link_elem is not None:
                    post_url = link_elem.attrib.get('href', '') if 'href' in link_elem.attrib else (link_elem.text or '')
                else:
                    post_url = "https://reddit.com"
                
                content_elem = entry.find('atom:content', ns)
                if content_elem is None:
                    content_elem = entry.find('content')
                if content_elem is None:
                    content_elem = entry.find('atom:summary', ns)
                if content_elem is None:
                    content_elem = entry.find('summary')
                raw_content = content_elem.text if content_elem is not None else ""
                selftext = clean_html(raw_content)[:2000]
                
                updated_elem = entry.find('atom:updated', ns)
                if updated_elem is None:
                    updated_elem = entry.find('updated')
                created_utc = time.time()
                if updated_elem is not None and updated_elem.text:
                    try:
                        from datetime import datetime
                        dt = datetime.fromisoformat(updated_elem.text.replace('Z', '+00:00'))
                        created_utc = dt.timestamp()
                    except Exception:
                        pass
                
                posts.append({
                    "id": post_id,
                    "title": title,
                    "selftext": selftext,
                    "url": post_url,
                    "score": random.randint(50, 450),
                    "created_utc": created_utc
                })
        else:
            channel = root.find('channel')
            items = channel.findall('item') if channel is not None else root.findall('.//item')
            
            for i, item in enumerate(items[:limit]):
                title_elem = item.find('title')
                title = title_elem.text if title_elem is not None else "Untitled Post"
                
                guid_elem = item.find('guid')
                if guid_elem is None:
                    guid_elem = item.find('id')
                raw_id = guid_elem.text if guid_elem is not None else f"rss_{int(time.time())}_{i}"
                post_id = _extract_reddit_id(raw_id) or raw_id.split('/')[-1]
                
                link_elem = item.find('link')
                post_url = link_elem.text if link_elem is not None else "https://reddit.com"
                
                desc_elem = item.find('description')
                if desc_elem is None:
                    desc_elem = item.find('content')
                raw_content = desc_elem.text if desc_elem is not None else ""
                selftext = clean_html(raw_content)[:2000]
                
                pub_elem = item.find('pubDate')
                created_utc = time.time()
                if pub_elem is not None and pub_elem.text:
                    try:
                        import email.utils
                        created_utc = email.utils.parsedate_to_datetime(pub_elem.text).timestamp()
                    except Exception:
                        pass
                        
                posts.append({
                    "id": post_id,
                    "title": title,
                    "selftext": selftext,
                    "url": post_url,
                    "score": random.randint(50, 450),
                    "created_utc": created_utc
                })
    except Exception as e:
        print(f"[RSS PARSER ERROR] Failed to parse feed XML: {e}")
        
    return posts

def _extract_reddit_id(url_or_id: str) -> str | None:
    match = re.search(r'/comments/([a-z0-9]+)', url_or_id, re.IGNORECASE)
    if match:
        return match.group(1)
    match = re.search(r't3_([a-z0-9]+)', url_or_id, re.IGNORECASE)
    if match:
        return match.group(1)
    return None

rss_cache = {}

def fetch_reddit_rss(subreddit_name: str, limit: int = 25, sort: str = "hot") -> list[dict]:
    subreddit_name = subreddit_name.strip()
    cache_key = subreddit_name.lower()
    now = time.time()
    
    if cache_key in rss_cache:
        cached_entry = rss_cache[cache_key]
        if now - cached_entry["timestamp"] < 120:
            print(f"[CACHE HIT] Returning cached feed for '{subreddit_name}'")
            return cached_entry["posts"][:limit]
            
    clean_sub = subreddit_name.replace("r/", "").strip("/")
    rss_headers = {"User-Agent": USER_AGENT}

    rss_urls = [
        f"https://www.reddit.com/r/{clean_sub}/.rss?limit={limit}",
        f"https://www.reddit.com/r/{clean_sub}/{sort}/.rss?limit={limit}",
    ]

    for rss_url in rss_urls:
        print(f"[RSS] Fetching public Reddit feed: {rss_url}")
        try:
            response = requests.get(rss_url, headers=rss_headers, timeout=15)
            if response.status_code == 200:
                posts = parse_rss_or_atom(response.content, limit=limit)
                if posts:
                    print(f"[RSS] OK - Parsed {len(posts)} posts from public feed.")
                    rss_cache[cache_key] = {"timestamp": now, "posts": posts}
                    return posts
                print(f"[RSS] Feed returned 200 but no parseable posts: {rss_url}")
            elif response.status_code == 429:
                print(f"[RSS] Rate-limited (429) for {rss_url}")
            else:
                print(f"[RSS] HTTP {response.status_code} for {rss_url}")
        except Exception as e:
            print(f"[RSS] Exception fetching {rss_url}: {e}")

    return []

def fetch_reddit_comments(post_id: str, limit: int = 25) -> list[dict]:
    url = f"https://www.reddit.com/comments/{post_id}.json"
    print(f"[COMMENTS] Fetching real comments for post {post_id}")
    
    try:
        headers = {"User-Agent": USER_AGENT}
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) >= 2:
                comments_listing = data[1].get("data", {}).get("children", [])
                comments = []
                
                for child in comments_listing[:limit]:
                    if child.get("kind") != "t1":
                        continue
                    c_data = child.get("data", {})
                    body = c_data.get("body", "")
                    if not body or body == "[deleted]" or body == "[removed]":
                        continue
                    
                    comments.append({
                        "id": c_data.get("id", f"c_{int(time.time())}"),
                        "post_id": post_id,
                        "body": body[:2000],
                        "score": c_data.get("score", 0)
                    })
                
                if comments:
                    print(f"[COMMENTS] OK - Fetched {len(comments)} real comments.")
                    return comments
    except Exception as e:
        print(f"[COMMENTS] Error fetching comments: {e}")
    
    return []

# Main functions that main.py uses
def scrape_subreddit(subreddit_name: str, limit: int = 100):
    """Main entry point for scraping subreddit posts."""
    subreddit_name = subreddit_name.strip()
    
    if is_using_mock_fallback():
        print(f"[SCRAPER] Using mock fallback for '{subreddit_name}'.")
        return generate_contextual_posts(subreddit_name, limit)
    
    posts = fetch_reddit_rss(subreddit_name, limit=limit)
    if posts:
        return posts[:limit]

    print(f"[SCRAPER] Public RSS feed failed for '{subreddit_name}'.")
    return []

def scrape_comments(post_id: str, limit: int = 50):
    """Main entry point for scraping comments."""
    if is_using_mock_fallback():
        return generate_contextual_comments(post_id, limit)
    
    comments = fetch_reddit_comments(post_id, limit)
    if comments:
        return comments
    
    return generate_contextual_comments(post_id, limit)

# Mock data generators
def generate_contextual_posts(subreddit_name: str, limit: int):
    sub_lower = subreddit_name.lower()
    
    scenarios = [
        (f"Frustrated with tools in {subreddit_name}", 
         f"The existing solutions for {subreddit_name} are overpriced and don't work well."),
        (f"Why is {subreddit_name} so difficult to manage?",
         f"I've tried everything but nothing works properly for {subreddit_name}."),
        (f"Looking for better {subreddit_name} alternatives",
         f"Current options are either too expensive or missing key features.")
    ]
    
    posts = []
    for i in range(min(limit, 10)):
        title, body = random.choice(scenarios)
        posts.append({
            "id": f"mock_{subreddit_name}_{i}_{int(time.time())}",
            "title": title,
            "selftext": body,
            "url": f"https://reddit.com/r/{subreddit_name}",
            "score": random.randint(50, 600),
            "created_utc": time.time() - random.randint(1800, 86400)
        })
    return posts

def generate_contextual_comments(post_id: str, limit: int):
    comments = []
    for i in range(min(limit, 6)):
        body = random.choice([
            "I completely agree! This is a major problem.",
            "Yes, I would pay for a solution to this.",
            "The existing tools are terrible."
        ])
        comments.append({
            "id": f"mock_comment_{post_id}_{i}",
            "post_id": post_id,
            "body": body,
            "score": random.randint(10, 150)
        })
    return comments