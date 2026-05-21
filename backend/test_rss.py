"""Full integration test for RSS scraper with real Reddit data"""
import sys, os
sys.path.insert(0, '.')
os.environ['FORCE_MOCK_DATA'] = 'false'

from scraper import fetch_reddit_rss, fetch_reddit_comments, scrape_subreddit

def safe_print(text):
    """Safely print unicode text to windows console without throwing UnicodeEncodeError"""
    print(text.encode('ascii', 'replace').decode('ascii'))

print("=" * 60)
print("TEST 1: fetch_reddit_rss('SaaS', limit=5)")
print("=" * 60)
posts = fetch_reddit_rss("SaaS", limit=5)
print(f"\nGot {len(posts)} posts:")
for p in posts[:5]:
    safe_print(f"  ID: {p['id']}")
    safe_print(f"  Title: {p['title']}")
    body_preview = p['selftext'][:120] if p['selftext'] else '(no body)'
    safe_print(f"  Body: {body_preview}...")
    safe_print(f"  URL: {p['url']}")
    print()

# Test 2: Comments
if posts and not posts[0]['id'].startswith('sim_'):
    post_id = posts[1]['id']  # Skip sticky
    print("=" * 60)
    print(f"TEST 2: fetch_reddit_comments('{post_id}', limit=5)")
    print("=" * 60)
    comments = fetch_reddit_comments(post_id, limit=5)
    print(f"\nGot {len(comments)} comments:")
    for c in comments[:5]:
        body = c['body'][:120].replace('\n', ' ')
        safe_print(f"  [{c['id']}] score={c['score']} | {body}")
    print()

# Test 3: Another subreddit
print("=" * 60)
print("TEST 3: scrape_subreddit('startups', limit=3)")
print("=" * 60)
posts2 = scrape_subreddit("startups", limit=3)
print(f"\nGot {len(posts2)} posts:")
for p in posts2[:3]:
    safe_print(f"  [{p['id']}] {p['title']}")

print("\nAll tests complete!")

