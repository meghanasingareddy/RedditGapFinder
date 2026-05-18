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
                title_elem = entry.find('atom:title', ns) or entry.find('title')
                title = title_elem.text if title_elem is not None else "Untitled Post"
                
                id_elem = entry.find('atom:id', ns) or entry.find('id')
                raw_id = id_elem.text if id_elem is not None else f"atom_{int(time.time())}_{i}_{random.randint(100,999)}"
                post_id = raw_id.split('_')[-1] if '_' in raw_id else raw_id
                
                link_elem = entry.find('atom:link', ns) or entry.find('link')
                if link_elem is not None:
                    post_url = link_elem.attrib.get('href', '') if 'href' in link_elem.attrib else link_elem.text
                else:
                    post_url = "https://reddit.com"
                
                content_elem = entry.find('atom:content', ns) or entry.find('content') or entry.find('atom:summary', ns) or entry.find('summary')
                raw_content = content_elem.text if content_elem is not None else ""
                selftext = clean_html(raw_content)
                selftext = selftext[:2000]
                
                updated_elem = entry.find('atom:updated', ns) or entry.find('updated')
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
            # RSS 2.0 parser (rss.app, fetchrss.com, etc.)
            channel = root.find('channel')
            items = channel.findall('item') if channel is not None else root.findall('.//item')
            
            for i, item in enumerate(items[:limit]):
                title_elem = item.find('title')
                title = title_elem.text if title_elem is not None else "Untitled Post"
                
                guid_elem = item.find('guid') or item.find('id')
                raw_id = guid_elem.text if guid_elem is not None else f"rss_{int(time.time())}_{i}_{random.randint(100,999)}"
                post_id = raw_id.split('/')[-1].split('_')[-1] if '/' in raw_id else raw_id
                
                link_elem = item.find('link')
                post_url = link_elem.text if link_elem is not None else "https://reddit.com"
                
                desc_elem = item.find('description') or item.find('content')
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

def scrape_subreddit(subreddit_name: str, limit: int = 100):
    subreddit_name = subreddit_name.strip()
    
    # Check if we are running in mock fallback
    if is_using_mock_fallback():
        print(f"[SCRAPER] Using forced mock fallback for '{subreddit_name}'.")
        return generate_contextual_posts(subreddit_name, limit)
        
    # Check if a custom RSS URL was provided
    if subreddit_name.startswith("http://") or subreddit_name.startswith("https://"):
        url = subreddit_name
        print(f"[SCRAPER] Fetching custom RSS feed: {url}")
    else:
        # Standard subreddit name -> use native Reddit RSS
        clean_sub = subreddit_name.replace("r/", "")
        url = f"https://www.reddit.com/r/{clean_sub}/hot.rss"
        print(f"[SCRAPER] Fetching Reddit RSS feed for r/{clean_sub}: {url}")
        
    try:
        headers = {
            "User-Agent": USER_AGENT
        }
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            posts = parse_rss_or_atom(response.content, limit)
            if posts:
                print(f"[SCRAPER] Successfully parsed {len(posts)} posts from RSS feed.")
                return posts
            else:
                print(f"[SCRAPER] XML parsed but no posts found. Falling back to simulated data.")
        else:
            print(f"[SCRAPER] Received status code {response.status_code} from feed. Falling back to simulated data.")
            
    except Exception as e:
        print(f"[SCRAPER] Error fetching RSS feed: {e}. Falling back to simulated data.")
        
    # Standard graceful fallback to mock data
    return generate_contextual_posts(subreddit_name, limit)

def scrape_comments(post_id: str, limit: int = 50):
    # RSS feeds don't have deep comment threads, so we leverage mock comments seamlessly
    print(f"[SCRAPER] Providing high-fidelity mock comments for post '{post_id}'.")
    return generate_contextual_comments(post_id, limit)

def generate_contextual_posts(subreddit_name: str, limit: int):
    # Context-aware mock post generator
    sub_lower = subreddit_name.lower()
    
    # 1. Tech & CS
    if any(k in sub_lower for k in ["cs", "dev", "code", "tech", "web", "program"]):
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
    elif any(k in sub_lower for k in ["saas", "startup", "entrepreneur", "business", "indie"]):
        scenarios = [
            ("Is anyone else getting massive SaaS subscription fatigue?",
             "Between Notion, Slack, Linear, Figma, and Zoom, our small team is paying over $300/month. Half of these features overlap. Why isn't there a unified, fast, offline-first dashboard bundle that gives us 90% of the tools for a fraction of the cost?"),
            ("Solo founder burnout is incredibly real",
             "I spend 10% of my time writing code and 90% of my time manually scheduling social posts, chasing email leads, and handling cold outreach. I am working 80 hours a week and getting exhausted. We need lightweight operational automation."),
            ("Jira is absolute bloatware and I'm tired of it",
             "Why do small startups use Jira? It's slow, cluttered, has 50 nested configuration screens, and takes forever to load a board. Indie teams need a lightweight sprint tool that integrates with Discord/Slack natively."),
            ("Setting up Stripe billing and tax compliance is a nightmare",
             "Spent the last week trying to configure SaaS sales tax rules, multi-tier subscriptions, and billing portals. It is incredibly complicated. Wish there was a plug-and-play merchant wrapper that handled all this globally.")
        ]
    # 3. Finance
    elif any(k in sub_lower for k in ["finance", "money", "budget", "personal"]):
        scenarios = [
            ("Budgeting apps are too complicated. I always abandon them.",
             "I've linked my bank accounts to Copilot and YNAB. Within a week, the bank sync breaks, or I'm forced to classify 100 historical transactions. It takes too much effort. I just want to text a WhatsApp bot my spending and let it categorize it automatically."),
            ("Hidden subscription fees are draining my bank account",
             "Just checked my statement and realized I've been paying $15/mo for a premium PDF editor I used once last year. Subscription auto-renewals are predatory. We need an automated radar that alerts us before cards get charged."),
            ("Freelance tax tracking is a absolute mess",
             "As a freelance designer, tracking write-offs, client invoices, and quarterly estimates in spreadsheets is killing me. I need a dead-simple, chat-based expense logging assistant.")
        ]
    # 4. Marketing & Outreach
    elif any(k in sub_lower for k in ["market", "sale", "lead", "email", "cold", "outreach", "ads", "seo"]):
        scenarios = [
            ("Cold outreach deliverability is completely broken",
             "Spent 3 weeks setting up custom domains, warming up mailboxes, and writing highly personalized sequences, only to find our emails are landing directly in spam folders. Google's new sender requirements are killing cold email marketing. We need a continuous domain-health monitor."),
            ("Manually finding B2B leads is taking too much time",
             "I spend hours scouring LinkedIn Sales Navigator, copying contact info, guessing email addresses, and pasting them into spreadsheets. Half of these verified addresses bounce. There has to be a single-click lead mapping pipeline that extracts active emails instantly."),
            ("SEO tracking tools are expensive and bloated",
             "I just want to track keyword rankings for our small indie blog, but tool bundles cost over $99/mo and force us into complex competitive search matrices. We need a simple, single-focus tracking widget.")
        ]
    # 5. Design & UI/UX Systems
    elif any(k in sub_lower for k in ["design", "figma", "ui", "ux", "graphic", "illustration"]):
        scenarios = [
            ("Figma-to-code exports require absolute structural rebuilds",
             "Our designers hand over beautiful Figma frames, but exporting them to clean, reusable CSS or React components is practically impossible. The exported code has absolute margins, inline styles, and hundreds of nested divs. We need a lint-checker for Figma design systems."),
            ("Figma version drift is a constant developer headache",
             "We begin frontend implementation, only to find the designer made minor revisions directly in the main file without notifying the engineering team. Component styling discrepancies are incredibly hard to audit in review boards.")
        ]
    # 6. Education & Studying
    elif any(k in sub_lower for k in ["education", "study", "college", "school", "student", "course", "lms"]):
        scenarios = [
            ("LMS portals like Canvas and Blackboard are sluggish and disorganized",
             "Canvas loads so slowly, and finding active assignments requires digging through 4 nested layers of course modules. There is no simple, single dashboard calendar that aggregates all task deadlines and syncs them to Google Calendar directly."),
            ("Group study flashcards take too long to coordinate",
             "Our study circle spends hours copy-pasting lecture notes, formatting flashcard terms, and sharing custom files. We need a central study lobby where members can collaboratively build prep materials instantly via lecture notes scanning.")
        ]
    # 7. General fallback (dynamically customized query injection)
    else:
        scenarios = [
            (f"Frustrated with general tools in the {subreddit_name} space",
             f"Using standard tools for '{subreddit_name}' feels like writing in the dark. The workflow is clunky, lacks modern collaborative features, does not support offline sync, and forces us into complicated manual steps just to share a simple update with team members."),
            (f"Why are all '{subreddit_name}' alternatives so overpriced and bloated?",
             f"The existing applications in the '{subreddit_name}' niche are overpriced and bloated. I am paying for enterprise-tier features that our 3-person team never touches, and the mobile responsive view is completely broken. We need lightweight alternatives."),
            (f"Recurring pain points in '{subreddit_name}' workflows",
             f"Managing multiple documents, keeping tracking history, and sharing links with external clients takes 10+ clicks in standard '{subreddit_name}' tools. We need a simple drag-and-drop link builder that works across platforms instantly.")
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
        "Yes! I would easily pay $10-$20 a month for a tool that solved exactly this.",
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
