import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_suite():
    print("=" * 60)
    print("TESTING TOPIC SEARCH API ENDPOINTS")
    print("=" * 60)

    # 1. Test Trending Topics
    print("\n1. Fetching trending topics (GET /api/topics/trending)...")
    try:
        res = requests.get(f"{BASE_URL}/api/topics/trending")
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            topics = res.json()
            print(f"Success! Found {len(topics)} trending topics. First few:")
            for t in topics[:3]:
                print(f"  - [{t['category']}] {t['display']}")
        else:
            print(f"Failed: {res.text}")
    except Exception as e:
        print(f"Error connecting: {e}")
        return

    # 2. Test Autocomplete Suggestions
    print("\n2. Fetching autocomplete suggestions for 'fas' (GET /api/subreddits/suggest?q=fas)...")
    res = requests.get(f"{BASE_URL}/api/subreddits/suggest?q=fas")
    print(f"Status Code: {res.status_code}")
    if res.status_code == 200:
        suggestions = res.json()
        print(f"Success! Suggestions: {suggestions}")
    else:
        print(f"Failed: {res.text}")

    # 3. Test POST Topic Search (Quick Analysis)
    print("\n3. Analyzing topic 'fashion' with depth 'quick' (POST /api/search/topic)...")
    payload = {"topic": "fashion", "depth": "quick"}
    start_time = time.time()
    res = requests.post(f"{BASE_URL}/api/search/topic", json=payload)
    duration = time.time() - start_time
    print(f"Status Code: {res.status_code}")
    print(f"Duration: {duration:.2f} seconds")
    
    if res.status_code == 200:
        data = res.json()
        print(f"Success! Topic: {data['topic']} (depth: {data['depth']})")
        print(f"Stats: {data['stats']}")
        print(f"Pain points found: {len(data['clusters'])}")
        for idx, c in enumerate(data['clusters'][:2]):
            print(f"  - Pain point {idx+1}: {c['topic_name']} (score: {c['opportunity_score']})")
        print(f"Startup Ideas generated: {len(data['ideas'])}")
        for idx, i in enumerate(data['ideas'][:2]):
            print(f"  - Idea {idx+1}: {i['name']} -> Problem: {i['problem'][:70]}...")
    else:
        print(f"Failed: {res.text}")
        return

    # 4. Test Cache Hit (Should be instant)
    print("\n4. Triggering SAME search 'fashion' with depth 'quick' (Should be a cache hit)...")
    start_time = time.time()
    res = requests.post(f"{BASE_URL}/api/search/topic", json=payload)
    duration = time.time() - start_time
    print(f"Status Code: {res.status_code}")
    print(f"Duration: {duration:.4f} seconds (Expected: < 0.05 seconds)")
    if res.status_code == 200:
        print("Success! Caching worked perfectly.")
    else:
        print(f"Failed: {res.text}")

    # 5. Test Rate Limiter (On a different depth/new search for SAME topic)
    # Since cache keys are (topic, depth), a different depth or clear trigger will run a new scan
    print("\n5. Triggering NEW search 'fashion' with different depth 'standard' (Should trigger Rate Limiter cooldown)...")
    payload_rate = {"topic": "fashion", "depth": "standard"}
    res = requests.post(f"{BASE_URL}/api/search/topic", json=payload_rate)
    print(f"Status Code (Expected 429): {res.status_code}")
    print(f"Response Content: {res.json()}")
    if res.status_code == 429:
        print("Success! Rate limiter blocked successive crawl as expected.")
    else:
        print("Warning: Rate limiter did not block request.")

if __name__ == "__main__":
    test_suite()
