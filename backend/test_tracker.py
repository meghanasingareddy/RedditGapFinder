"""Test script for tracked subreddits validation in scan endpoint"""
import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=" * 60)
    print("TESTING TRACKER ENDPOINTS & VALIDATIONS")
    print("=" * 60)

    # 1. Fetch tracked subreddits
    print("\n1. Fetching tracked subreddits via GET /api/subreddits...")
    try:
        res = requests.get(f"{BASE_URL}/api/subreddits")
        if res.status_code == 200:
            tracked = res.json()
            print(f"   Success! Found {len(tracked)} tracked subreddits:")
            for t in tracked[:3]:
                print(f"     - ID {t['id']}: {t['subreddit']} (growth: {t['growth_percent']}%, mentions: {t['mentions']})")
        else:
            print(f"   Failed to fetch tracked: Status {res.status_code}")
            return
    except Exception as e:
        print(f"   Error connecting to backend: {e}")
        print("   Make sure the FastAPI server is running at http://127.0.0.1:8000")
        return

    # 2. Add a new tracked subreddit
    new_sub = "test_only_sub"
    print(f"\n2. Adding new subreddit '{new_sub}' via POST /api/subreddits...")
    res = requests.post(f"{BASE_URL}/api/subreddits", json={"subreddit": new_sub})
    if res.status_code == 200:
        added = res.json()
        added_id = added["id"]
        print(f"   Success! Added subreddit: ID {added_id}: {added['subreddit']}")
    else:
        print(f"   Failed to add subreddit: Status {res.status_code}")
        return

    # 3. Scan a tracked subreddit (should succeed)
    print(f"\n3. Scanning tracked subreddit '{new_sub}' via POST /api/scan...")
    res = requests.post(f"{BASE_URL}/api/scan?subreddit={new_sub}")
    print(f"   Status Code: {res.status_code}")
    print(f"   Response: {res.json()}")
    if res.status_code != 200:
        print("   Failed: Scanning a tracked subreddit should be allowed.")

    # 4. Scan a non-tracked subreddit (should be blocked with 400)
    untracked_sub = "not_tracked_subreddit_abc"
    print(f"\n4. Scanning UNTRACKED subreddit '{untracked_sub}' via POST /api/scan...")
    res = requests.post(f"{BASE_URL}/api/scan?subreddit={untracked_sub}")
    print(f"   Status Code (Expected 400): {res.status_code}")
    print(f"   Response: {res.json()}")
    if res.status_code == 400:
        print("   Success! Non-tracked scanning was correctly blocked.")
    else:
        print("   Failed: Scan should have been blocked for untracked subreddit.")

    # 5. Remove the tracked subreddit
    print(f"\n5. Untracking subreddit ID {added_id} via DELETE /api/subreddits/{{id}}...")
    res = requests.delete(f"{BASE_URL}/api/subreddits/{added_id}")
    if res.status_code == 200:
        print(f"   Success! Response: {res.json()}")
    else:
        print(f"   Failed to untrack: Status {res.status_code}")

    # 6. Verify it is blocked again
    print(f"\n6. Scanning previously tracked subreddit '{new_sub}' again...")
    res = requests.post(f"{BASE_URL}/api/scan?subreddit={new_sub}")
    print(f"   Status Code (Expected 400): {res.status_code}")
    print(f"   Response: {res.json()}")
    if res.status_code == 400:
        print("   Success! Re-blocked after removal.")
    else:
        print("   Failed: Scan should have been blocked after deletion.")

if __name__ == "__main__":
    run_tests()
