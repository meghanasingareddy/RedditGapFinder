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

# We use standard user agent to avoid being blocked by feed servers
USER_AGENT = os.getenv("USER_AGENT", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

FORCE_MOCK_DATA = os.getenv("FORCE_MOCK_DATA", "").lower() in ("true", "1", "yes")

def is_using_mock_fallback() -> bool:
    """
    Checks whether the application is running in mock-fallback sandbox mode.
    Returns True if forced via environment.
    """
    if os.getenv("FORCE_MOCK_DATA", "").lower() in ("true", "1", "yes"):
        return True
    return False

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    # Strip HTML tags
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    # Unescape HTML entities (e.g. &amp;, &lt;, &gt;)
    return html.unescape(cleantext).strip()

# ==============================================================
# RSS/ATOM FEED PARSER
# ==============================================================

def parse_rss_or_atom(xml_content: bytes, limit: int = 100):
    posts = []
    try:
        root = ET.fromstring(xml_content)
        tag = root.tag.lower()
        
        if 'feed' in tag:
            # Atom parser (Reddit native feed format)
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            entries = root.findall('atom:entry', ns)
            if not entries:
                entries = root.findall('entry')
                
            for i, entry in enumerate(entries[:limit]):
                # IMPORTANT: XML elements with no children are falsy in Python,
                # so we must use `is not None` instead of `or` for fallback lookups.
                title_elem = entry.find('atom:title', ns)
                if title_elem is None:
                    title_elem = entry.find('title')
                title = title_elem.text if title_elem is not None else "Untitled Post"
                
                id_elem = entry.find('atom:id', ns)
                if id_elem is None:
                    id_elem = entry.find('id')
                raw_id = id_elem.text if id_elem is not None else f"atom_{int(time.time())}_{i}_{random.randint(100,999)}"
                # Extract Reddit post ID from t3_xxxxx or URL format
                post_id = _extract_reddit_id(raw_id) or f"rss_{i}_{int(time.time())}"
                
                link_elem = entry.find('atom:link', ns)
                if link_elem is None:
                    link_elem = entry.find('link')
                if link_elem is not None:
                    post_url = link_elem.attrib.get('href', '') if 'href' in link_elem.attrib else (link_elem.text or '')
                else:
                    post_url = "https://reddit.com"
                
                # Also try to extract post ID from link URL
                if post_id.startswith("rss_"):
                    link_id = _extract_reddit_id(post_url)
                    if link_id:
                        post_id = link_id
                
                content_elem = entry.find('atom:content', ns)
                if content_elem is None:
                    content_elem = entry.find('content')
                if content_elem is None:
                    content_elem = entry.find('atom:summary', ns)
                if content_elem is None:
                    content_elem = entry.find('summary')
                raw_content = content_elem.text if content_elem is not None else ""
                selftext = clean_html(raw_content)
                selftext = selftext[:2000]
                
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
                    "url": post_url or "https://reddit.com",
                    "score": random.randint(50, 450),
                    "created_utc": created_utc
                })
                
        else:
            # RSS 2.0 parser (rss.app, fetchrss.com, etc.)
            channel = root.find('channel')
            items = channel.findall('item') if channel is not None else root.findall('.//item')
            
            for i, item in enumerate(items[:limit]):
                title_elem = item.find('title')
                title = title_elem.text if title_elem is not None else "Untitled Post"
                
                guid_elem = item.find('guid')
                if guid_elem is None:
                    guid_elem = item.find('id')
                raw_id = guid_elem.text if guid_elem is not None else f"rss_{int(time.time())}_{i}_{random.randint(100,999)}"
                post_id = _extract_reddit_id(raw_id) or raw_id.split('/')[-1]
                
                link_elem = item.find('link')
                post_url = link_elem.text if link_elem is not None else "https://reddit.com"
                
                desc_elem = item.find('description')
                if desc_elem is None:
                    desc_elem = item.find('content')
                raw_content = desc_elem.text if desc_elem is not None else ""
                selftext = clean_html(raw_content)
                selftext = selftext[:2000]
                
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
    """Extract the Reddit post ID from a URL like /r/sub/comments/abc123/..."""
    match = re.search(r'/comments/([a-z0-9]+)', url_or_id, re.IGNORECASE)
    if match:
        return match.group(1)
    # Try t3_ format
    match = re.search(r't3_([a-z0-9]+)', url_or_id, re.IGNORECASE)
    if match:
        return match.group(1)
    return None

# In-memory RSS feed cache: {subreddit_name: {"timestamp": float, "posts": list}}
rss_cache = {}

def fetch_reddit_rss(subreddit_name: str, limit: int = 25, sort: str = "hot") -> list[dict]:
    """
    Fetch real posts using RapidAPI (reddit34) to bypass Reddit's strict rate limits.
    Falls back to normal RSS if RapidAPI key is not present.
    """
    subreddit_name = subreddit_name.strip()
    cache_key = subreddit_name.lower()
    now = time.time()
    
    if cache_key in rss_cache:
        cached_entry = rss_cache[cache_key]
        if now - cached_entry["timestamp"] < 120:
            print(f"[CACHE HIT] Returning cached feed for '{subreddit_name}'")
            return cached_entry["posts"][:limit]
            
    clean_sub = subreddit_name.replace("r/", "")
    
    # Try RapidAPI first if key exists
    rapid_api_key = os.getenv("RAPIDAPI_KEY")
    if rapid_api_key:
        url = "https://reddit34.p.rapidapi.com/getPostsBySubreddit"
        querystring = {"subreddit": clean_sub, "sort": sort}
        headers = {
            "X-RapidAPI-Key": rapid_api_key,
            "X-RapidAPI-Host": "reddit34.p.rapidapi.com"
        }
        
        print(f"[RapidAPI] Fetching r/{clean_sub}/{sort} feed via RapidAPI...")
        try:
            response = requests.get(url, headers=headers, params=querystring, timeout=15)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data and "posts" in data["data"]:
                    rapid_posts = data["data"]["posts"]
                    posts = []
                    for p in rapid_posts[:limit]:
                        p_data = p.get("data", {})
                        post_id = p_data.get("id", f"rapid_{int(time.time())}")
                        title = p_data.get("title", "Untitled")
                        selftext = clean_html(p_data.get("selftext", "") or "")
                        selftext = selftext[:2000]
                        post_url = p_data.get("url", f"https://reddit.com/r/{clean_sub}")
                        
                        posts.append({
                            "id": post_id,
                            "title": title,
                            "selftext": selftext,
                            "url": post_url,
                            "score": p_data.get("score", random.randint(50, 450)),
                            "created_utc": p_data.get("created_utc", time.time())
                        })
                    
                    if posts:
                        print(f"[RapidAPI] OK - Parsed {len(posts)} posts.")
                        rss_cache[cache_key] = {"timestamp": now, "posts": posts}
                        return posts
                    else:
                        print(f"[RapidAPI] No posts found in response.")
            else:
                print(f"[RapidAPI] Error status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"[RapidAPI] Exception fetching feed: {e}")
            
    # Fallback to standard Reddit RSS if RapidAPI is unavailable or failed
    print(f"[RSS] Fetching native Reddit RSS for r/{clean_sub}...")
    rss_url = f"https://www.reddit.com/r/{clean_sub}/{sort}/.rss?limit={limit}"
    rss_headers = {"User-Agent": USER_AGENT}
    try:
        response = requests.get(rss_url, headers=rss_headers, timeout=15)
        if response.status_code == 200:
            posts = parse_rss_or_atom(response.content, limit=limit)
            if posts:
                print(f"[RSS] OK - Parsed {len(posts)} posts from native feed.")
                rss_cache[cache_key] = {"timestamp": now, "posts": posts}
                return posts
            else:
                print(f"[RSS] Native feed returned no valid posts.")
        elif response.status_code == 429:
            print(f"[RSS] Native feed rate-limited (429).")
        else:
            print(f"[RSS] Native feed error status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[RSS] Exception fetching native feed: {e}")

    return []

# ==============================================================
# REDDIT JSON COMMENT SCRAPER (No auth needed)
# ==============================================================

def fetch_reddit_comments(post_id: str, limit: int = 25) -> list[dict]:
    """
    Fetch real comments from Reddit's public JSON API.
    No authentication required.
    
    URL format: https://www.reddit.com/comments/{post_id}.json
    """
    url = f"https://www.reddit.com/comments/{post_id}.json"
    print(f"[COMMENTS] Fetching real comments for post {post_id}: {url}")
    
    try:
        headers = {"User-Agent": USER_AGENT}
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            # Reddit JSON returns [post_data, comments_data]
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
                else:
                    print(f"[COMMENTS] No valid comments found in JSON response.")
        elif response.status_code == 429:
            print(f"[COMMENTS] Rate limited. Using mock comments.")
        else:
            print(f"[COMMENTS] Got status {response.status_code}")
            
    except Exception as e:
        print(f"[COMMENTS] Error fetching comments: {e}")
    
    return []

# ==============================================================
# MAIN SCRAPER ENTRY POINTS (used by main.py)
# ==============================================================

def scrape_subreddit(subreddit_name: str, limit: int = 100):
    """
    Main entry point for scraping subreddit posts.
    Priority: 1) Real RSS feed  2) Mock fallback
    """
    subreddit_name = subreddit_name.strip()
    
    # Check if we are running in mock fallback
    if is_using_mock_fallback():
        print(f"[SCRAPER] Using forced mock fallback for '{subreddit_name}'.")
        return generate_contextual_posts(subreddit_name, limit)
    
    # Try real RSS feed first
    posts = fetch_reddit_rss(subreddit_name, limit)
    if posts:
        return posts
    
    print(f"[SCRAPER] RSS feed failed or returned no posts for '{subreddit_name}'.")
    return []

def scrape_comments(post_id: str, limit: int = 50):
    """
    Main entry point for scraping comments on a post.
    Priority: 1) Real Reddit JSON  2) Mock fallback
    """
    if is_using_mock_fallback():
        print(f"[SCRAPER] Using mock comments for post '{post_id}' (FORCE_MOCK_DATA=true).")
        return generate_contextual_comments(post_id, limit)
    
    # Try real Reddit JSON comments first
    comments = fetch_reddit_comments(post_id, limit)
    if comments:
        return comments
    
    # Fallback to mock
    print(f"[SCRAPER] Real comments unavailable for '{post_id}'. Using mock comments.")
    return generate_contextual_comments(post_id, limit)

# ==============================================================
# MOCK DATA GENERATORS (Fallback only)
# ==============================================================

def generate_contextual_posts(subreddit_name: str, limit: int):
    # Context-aware mock post generator using TOKEN-BASED matching
    # to prevent false positives (e.g. "FashionStartups" matching "startup")
    import re as _re
    sub_lower = subreddit_name.lower()
    tokens = set(_re.findall(r"\b\w+\b", sub_lower))
    
    # Helper: for compound subreddit names (e.g. "cscareerquestions", "personalfinance")
    # check if any keyword appears as a substring within long single-token names
    def _matches(keywords):
        # First: exact token match (preferred, precise)
        if tokens & keywords:
            return True
        # Second: substring match only for compound words (len > 6) to catch
        # subreddit names like "cscareerquestions" containing "career"
        for token in tokens:
            if len(token) > 6:
                for kw in keywords:
                    if len(kw) >= 3 and kw in token:
                        return True
        return False
    
    # 1. Tech & CS
    tech_keywords = {"cs", "dev", "code", "tech", "web", "program", "software", "ai", "ml", "chatgpt", "machine", "algorithm", "data", "programming", "developer", "javascript", "python", "react", "node", "devops", "career"}
    if _matches(tech_keywords):
        scenarios = [
            ("Applying to 400+ jobs, completely ghosted. How does anyone find entry-level jobs?",
             "I have polished my portfolio, done 3 major React/Python projects, and have a good GPA. Yet, I receive immediate rejection emails or absolute silence. Is the hiring market completely dead, or are ATS filters just throwing my resume away? Why can't recruiters just verify my skills directly?"),
            ("Technical coding interviews are getting ridiculous",
             "Had a 4-round interview for a junior front-end developer role, and they asked me complex graph traversal and hard LeetCode problems. I will be editing CSS and building simple React forms! This LeetCode arms race is exhausting and keeps out practical developers."),
            ("Why is setting up local dev environments still so painful?",
             "Just spent 5 hours trying to dockerize a simple database and configure Node version mismatches. Package drift and breaking configuration files are the worst. There should be a single-button workspace launcher that works offline."),
            ("Tailoring resumes manually is a full-time job",
             "Everyone says 'tailor your resume to the job description'. But doing that for 20 applications a day takes 4 hours. Copy-pasting, finding keywords, editing PDFs... there has to be a simple studio that handles this in one click.")
        ]
    # 2. SaaS & Startups
    elif _matches({"saas", "startup", "startups", "entrepreneur", "business", "indie", "indiehackers", "founder", "solopreneur"}):
        scenarios = [
            ("Is anyone else getting massive SaaS subscription fatigue?",
             "Between Notion, Slack, Linear, Figma, and Zoom, our small team is paying over ₹25,000/month. Half of these features overlap. Why isn't there a unified, fast, offline-first dashboard bundle that gives us 90% of the tools for a fraction of the cost?"),
            ("Solo founder burnout is incredibly real",
             "I spend 10% of my time writing code and 90% of my time manually scheduling social posts, chasing email leads, and handling cold outreach. I am working 80 hours a week and getting exhausted. We need lightweight operational automation."),
            ("Jira is absolute bloatware and I'm tired of it",
             "Why do small startups use Jira? It's slow, cluttered, has 50 nested configuration screens, and takes forever to load a board. Indie teams need a lightweight sprint tool that integrates with Discord/Slack natively."),
            ("Setting up Stripe billing and tax compliance is a nightmare",
             "Spent the last week trying to configure SaaS sales tax rules, multi-tier subscriptions, and billing portals. It is incredibly complicated. Wish there was a plug-and-play merchant wrapper that handled all this globally.")
        ]
    # 3. Finance & Money
    elif _matches({"finance", "money", "budget", "budgeting", "invest", "investing", "stocks", "crypto", "bitcoin", "passive", "fire", "wealth", "saving", "tax", "dividends"}):
        scenarios = [
            ("Budgeting apps are too complicated. I always abandon them.",
             "I've linked my bank accounts to Copilot and YNAB. Within a week, the bank sync breaks, or I'm forced to classify 100 historical transactions. It takes too much effort. I just want to text a WhatsApp bot my spending and let it categorize it automatically."),
            ("Hidden subscription fees are draining my bank account",
             "Just checked my statement and realized I've been paying ₹1,250/month for a premium PDF editor I used once last year. Subscription auto-renewals are predatory. We need an automated radar that alerts us before cards get charged."),
            ("Freelance tax tracking is a absolute mess",
             "As a freelance designer, tracking write-offs, client invoices, and quarterly estimates in spreadsheets is killing me. I need a dead-simple, chat-based expense logging assistant."),
            ("Investment portfolio tracking across brokers is painful",
             "I have accounts on Robinhood, Fidelity, and Coinbase. There's no single dashboard showing my total net worth across all of these. Each app has its own interface and none of them talk to each other. We need a unified portfolio aggregator.")
        ]
    # 4. Marketing & Outreach
    elif _matches({"marketing", "sales", "lead", "leads", "email", "cold", "outreach", "ads", "seo", "growth", "growthhacking"}):
        scenarios = [
            ("Cold outreach deliverability is completely broken",
             "Spent 3 weeks setting up custom domains, warming up mailboxes, and writing highly personalized sequences, only to find our emails are landing directly in spam folders. Google's new sender requirements are killing cold email marketing. We need a continuous domain-health monitor."),
            ("Manually finding B2B leads is taking too much time",
             "I spend hours scouring LinkedIn Sales Navigator, copying contact info, guessing email addresses, and pasting them into spreadsheets. Half of these verified addresses bounce. There has to be a single-click lead mapping pipeline that extracts active emails instantly."),
            ("SEO tracking tools are expensive and bloated",
             "I just want to track keyword rankings for our small indie blog, but tool bundles cost over ₹8,000/month and force us into complex competitive search matrices. We need a simple, single-focus tracking widget.")
        ]
    # 5. Design & UI/UX Systems
    elif _matches({"design", "figma", "ui", "ux", "graphic", "illustration", "creative", "frontend", "webdesign"}):
        scenarios = [
            ("Figma-to-code exports require absolute structural rebuilds",
             "Our designers hand over beautiful Figma frames, but exporting them to clean, reusable CSS or React components is practically impossible. The exported code has absolute margins, inline styles, and hundreds of nested divs. We need a lint-checker for Figma design systems."),
            ("Figma version drift is a constant developer headache",
             "We begin frontend implementation, only to find the designer made minor revisions directly in the main file without notifying the engineering team. Component styling discrepancies are incredibly hard to audit in review boards."),
            ("Design system inconsistency across teams is a nightmare",
             "Our design tokens keep going out of sync. Designers update colors in Figma but developers still use the old hex values. We need an automated pipeline that syncs design tokens from Figma to CSS variables in real time.")
        ]
    # 6. Education & Studying
    elif _matches({"education", "study", "college", "school", "student", "students", "course", "lms", "learning", "homework", "university"}):
        scenarios = [
            ("LMS portals like Canvas and Blackboard are sluggish and disorganized",
             "Canvas loads so slowly, and finding active assignments requires digging through 4 nested layers of course modules. There is no simple, single dashboard calendar that aggregates all task deadlines and syncs them to Google Calendar directly."),
            ("Group study flashcards take too long to coordinate",
             "Our study circle spends hours copy-pasting lecture notes, formatting flashcard terms, and sharing custom files. We need a central study lobby where members can collaboratively build prep materials instantly via lecture notes scanning."),
            ("Online course completion rates are abysmal and nobody talks about it",
             "I've started 15 Udemy courses and finished exactly 2. The lack of accountability, progress tracking, and peer interaction makes it so easy to abandon courses after week one. We need a study-buddy matching system with commitment contracts.")
        ]
    # 7. Fashion & Style & Beauty
    elif _matches({"fashion", "streetwear", "style", "clothing", "outfit", "wardrobe", "beauty", "skincare", "makeup", "sneakers", "thrift", "vintage"}):
        scenarios = [
            ("Why is finding clothes that actually fit so frustrating online?",
             "Every brand has completely different sizing. I'm a Medium in one store and an XL in another. Returns are expensive and wasteful. We need a universal body-measurement app that maps your exact size to every brand's chart automatically."),
            ("Sustainable fashion is nearly impossible to verify",
             "Brands slap 'eco-friendly' on everything but there's no transparency. I want to know the actual supply chain, fabric sourcing, and labor conditions. We need a browser extension that instantly fact-checks sustainability claims on any product page."),
            ("Outfit planning apps are all terrible and abandoned",
             "I've tried Cladwell, Stylebook, and Acloset. They all require manually photographing every item, the AI suggestions are generic, and half of them haven't been updated in years. We need a closet organizer that auto-catalogs from purchase receipts."),
            ("Reselling vintage clothes online is way harder than it should be",
             "Between photographing items, writing descriptions, cross-posting to Depop/Poshmark/eBay, and managing DMs across platforms, selling vintage is a full-time job. We need a single dashboard that manages listings across all resale platforms.")
        ]
    # 8. Health & Fitness & Wellness
    elif _matches({"health", "fitness", "gym", "workout", "nutrition", "diet", "mental", "meditation", "yoga", "running", "weight", "biohacking", "longevity", "sleep", "wellness"}):
        scenarios = [
            ("Fitness tracking apps can't agree on calorie counts",
             "MyFitnessPal says my TDEE is 2200, Cronometer says 2500, and my Apple Watch says 2800. None of them account for my actual metabolic rate. We need a tracker that calibrates based on real weight change trends over time, not generic formulas."),
            ("Mental health apps are superficial and don't actually help",
             "I've tried Calm, Headspace, and Woebot. They feel like glorified meditation timers with chatbots that give cookie-cutter advice. We need AI therapy companions that actually track mood patterns and adapt their approach over weeks."),
            ("Finding a gym routine that matches my schedule and equipment is painful",
             "Every workout plan assumes I have a full commercial gym and 90 minutes to spare. I have a home setup with dumbbells and a pull-up bar and 30 minutes max. We need an adaptive workout generator that builds around YOUR constraints."),
            ("Sleep tracking data is useless without actionable advice",
             "My Oura ring tells me I got 6.5 hours of sleep with 45 minutes of deep sleep. Great, but what do I DO about it? None of these trackers give personalized, evidence-based recommendations to actually improve my sleep architecture.")
        ]
    # 9. Gaming
    elif _matches({"gaming", "games", "gamer", "indie", "steam", "playstation", "xbox", "nintendo", "esports", "twitch", "streaming"}):
        scenarios = [
            ("Finding good indie games is like searching for a needle in a haystack",
             "Steam has thousands of new releases every month and the recommendation algorithm just shows me the same AAA titles. Indie gems get buried instantly. We need a curated discovery platform with taste-matching that actually works."),
            ("Game backlog management is completely broken",
             "I have 300+ games across Steam, Epic, GOG, and PS Plus. There's no single place to see everything I own, track what I've played, and get recommendations on what to play next based on my mood and available time."),
            ("Streaming setup for beginners is unnecessarily complicated",
             "OBS settings, audio mixing, scene transitions, chat bots, alerts... just getting a basic Twitch stream running took me 3 full weekends. We need a one-click streaming studio that handles the technical setup automatically."),
            ("Gaming communities are fragmented across too many platforms",
             "My guild uses Discord for voice, WhatsApp for scheduling, Reddit for news, and a Google Sheet for raid signups. We need a unified gaming social hub that combines all of these into one place.")
        ]
    # 10. Food & Cooking
    elif _matches({"food", "cooking", "recipe", "recipes", "chef", "baking", "meal", "mealprep", "kitchen", "restaurant", "vegan", "keto"}):
        scenarios = [
            ("Recipe apps never account for what I actually have in my fridge",
             "Every recipe app shows me beautiful dishes that require 15 specialty ingredients I don't have. I just want to type in 'chicken, rice, broccoli' and get 10 realistic dinner ideas. Ingredient-first recipe search is broken everywhere."),
            ("Meal prep planning is exhausting and spreadsheet-heavy",
             "I spend 2 hours every Sunday planning meals, calculating macros, generating grocery lists, and cross-referencing sale flyers. This entire workflow should be automated with one tap based on my dietary preferences and budget."),
            ("Food delivery app fees are absolutely outrageous now",
             "A ₹200 meal becomes ₹500 after service fees, delivery fees, small order fees, and tip. The markup is predatory. We need a transparent fee comparison tool that shows the true cost across all delivery platforms for the same restaurant."),
            ("Following dietary restrictions while eating out is a constant struggle",
             "As someone with celiac disease, finding safe restaurant options requires calling ahead, reading every review, and still risking cross-contamination. We need a verified allergen database powered by community reports, not just restaurant claims.")
        ]
    # 11. Travel
    elif _matches({"travel", "backpacking", "nomad", "digital", "flights", "hotels", "vacation", "tourism", "adventure", "hiking"}):
        scenarios = [
            ("Flight price tracking is broken and manipulative",
             "Every time I search for a flight, the price goes up the next day. Incognito mode doesn't help anymore. Google Flights shows different prices than the airline website. We need a truly transparent fare tracker that alerts on genuine price drops."),
            ("Travel planning across multiple destinations is a logistics nightmare",
             "Planning a 3-week trip across 5 cities requires juggling flights, hotels, local transport, activities, and time zones in 10 different tabs. We need a single itinerary builder that auto-optimizes routes and suggests local experiences."),
            ("Digital nomad visa requirements are impossible to keep track of",
             "Every country has different rules for remote work visas, tax obligations, and stay limits. The information is scattered across embassy websites, Reddit threads, and outdated blog posts. We need a real-time visa requirement aggregator."),
            ("Solo travel safety information is unreliable and scattered",
             "As a solo female traveler, I rely on Reddit threads from 3 years ago for safety tips. Official travel advisories are too generic. We need a community-driven, real-time safety reporting platform with neighborhood-level granularity.")
        ]
    # 12. Relationships & Social
    elif _matches({"relationship", "relationships", "dating", "marriage", "parenting", "family", "social", "friendship", "divorce"}):
        scenarios = [
            ("Dating apps have become pay-to-play slot machines",
             "Tinder, Hinge, and Bumble all throttle your visibility unless you pay ₹2,500+/month for premium. Even then, the algorithm feels rigged to keep you swiping forever. We need a dating platform that actually incentivizes genuine connections over engagement metrics."),
            ("Co-parenting communication after divorce is incredibly stressful",
             "Texting with my ex about custody schedules always escalates into arguments. We need a structured co-parenting app that keeps communication focused on logistics only, with calendar sync and expense splitting built in."),
            ("Making friends as an adult is embarrassingly difficult",
             "I moved to a new city at 30 and have zero friends here. Meetup groups feel awkward, and apps like Bumble BFF are dead in my area. We need hyper-local, interest-based social matching that doesn't feel like dating."),
            ("Long-distance relationship tools are basically nonexistent",
             "My partner and I are in different time zones and the only tools we have are FaceTime and shared Google calendars. We need a couples app designed for LDR with shared activities, countdown timers, and synchronized movie watching.")
        ]
    # 13. Pets & Animals
    elif _matches({"pets", "dogs", "cats", "pet", "dog", "cat", "puppy", "kitten", "veterinary", "animal", "animals"}):
        scenarios = [
            ("Finding a trustworthy pet sitter is terrifying",
             "Rover reviews feel fake, and I've had multiple bad experiences with sitters who ignored my dog's medication schedule. We need a verified pet care platform with real-time camera monitoring and medication tracking."),
            ("Vet bills are insane and pet insurance is confusing",
             "My dog's ACL surgery cost ₹50,000 and my pet insurance denied the claim as a 'pre-existing condition' for a 2-year-old healthy dog. Comparing pet insurance plans is like reading legal documents. We need a transparent comparison tool."),
            ("Pet food ingredient labels are deliberately confusing",
             "What does 'meat by-products' actually mean? Every brand claims to be 'premium' and 'grain-free' but the ingredients list is intentionally vague. We need a pet food ingredient analyzer that grades brands on actual nutritional transparency."),
            ("Training a puppy with YouTube videos is hit-or-miss",
             "Every trainer on YouTube contradicts the previous one. Positive reinforcement vs correction-based, crate training vs free roaming... we need a structured, personalized puppy training program that adapts to your dog's breed and behavior.")
        ]
    # 14. Remote Work & Productivity
    elif _matches({"remote", "productivity", "wfh", "work", "freelance", "freelancing", "workfromhome", "worklifebalance", "timemanagement"}):
        scenarios = [
            ("Remote work loneliness is a real productivity killer",
             "I've been WFH for 3 years and the isolation is brutal. Virtual water coolers feel forced, and Slack messages don't replace human connection. We need ambient co-working spaces where remote workers can passively hang out while working."),
            ("Time tracking for freelancers is soul-crushing busywork",
             "Toggl, Harvest, Clockify — they all require me to manually start and stop timers 20 times a day. I always forget and then spend Friday reconstructing my week from memory. We need passive time tracking that auto-detects what project I'm working on."),
            ("Video call fatigue is destroying my afternoon productivity",
             "I have 4-6 Zoom meetings daily and by 2pm I can't think straight. Meeting summaries, action items, and follow-ups all fall through the cracks. We need an AI meeting assistant that attends calls FOR me and sends me a 2-minute summary."),
            ("Managing multiple freelance clients without a PM tool is chaos",
             "I use spreadsheets to track 8 client projects, deadlines, invoices, and feedback. Everything is scattered across email, Slack, and Google Drive. We need a lightweight freelancer command center that isn't enterprise Jira.")
        ]
    # 15. General fallback (dynamically customized query injection)
    else:
        scenarios = [
            (f"Frustrated with general tools in the {subreddit_name} space",
             f"Using standard tools for '{subreddit_name}' feels like writing in the dark. The workflow is clunky, lacks modern collaborative features, does not support offline sync, and forces us into complicated manual steps just to share a simple update with team members."),
            (f"Why are all '{subreddit_name}' alternatives so overpriced and bloated?",
             f"The existing applications in the '{subreddit_name}' niche are overpriced and bloated. I am paying for enterprise-tier features that our 3-person team never touches, and the mobile responsive view is completely broken. We need lightweight alternatives."),
            (f"Recurring pain points in '{subreddit_name}' workflows",
             f"Managing multiple documents, keeping tracking history, and sharing links with external clients takes 10+ clicks in standard '{subreddit_name}' tools. We need a simple drag-and-drop link builder that works across platforms instantly."),
            (f"Community resources for '{subreddit_name}' are outdated and fragmented",
             f"The best guides for '{subreddit_name}' are buried in 3-year-old Reddit threads or paywalled blogs. Wiki pages are abandoned. We need a living, community-maintained knowledge base that stays current and is easy to search.")
        ]

    posts = []
    # Seed with standard random combinations
    for i in range(min(limit, 10)):
        title, body = random.choice(scenarios)
        score = random.randint(50, 600)
        time_offset = random.randint(1800, 86400 * 3) # Up to 3 days ago
        
        posts.append({
            "id": f"sim_post_{subreddit_name}_{i}_{int(time.time())}",
            "title": f"{title} #{i+1}",
            "selftext": body,
            "url": f"https://reddit.com/r/{subreddit_name}/comments/sim_{i}",
            "score": score,
            "created_utc": time.time() - time_offset
        })
    return posts

def generate_contextual_comments(post_id: str, limit: int):
    # Contextual comment thread generator
    positive_comments = [
        "I completely agree! This has been my primary pain point for the past 6 months.",
        "Yes! I would easily pay ₹500-₹1000 a month for a tool that solved exactly this.",
        "Honestly, the existing tools are so bloated. A simple focused alternative is a goldmine.",
        "I actually built a simple script to handle this for myself because I got so tired of it. Glad to know others feel the same way!"
    ]
    negative_comments = [
        "This is an absolute nightmare. ATS filters and domain settings are a black hole.",
        "Subscription billing is getting out of hand. Everything is a cash grab now.",
        "I hate how slow these interfaces are. It's like loading a whole operating system just to track a single task.",
        "System settings break constantly. Doing this manually is a chore but the automated ways are broken."
    ]
    
    comments = []
    for i in range(min(limit, 6)):
        body = random.choice(positive_comments if i % 2 == 0 else negative_comments)
        score = random.randint(10, 150)
        comments.append({
            "id": f"sim_comm_{post_id}_{i}",
            "post_id": post_id,
            "body": body,
            "score": score
        })
    return comments
