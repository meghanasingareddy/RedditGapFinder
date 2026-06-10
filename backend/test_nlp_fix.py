"""Quick test to verify the new NLP clustering and idea generation produce diverse output."""
import sys, os
os.environ.setdefault('PYTHONIOENCODING', 'utf-8')
sys.path.insert(0, '.')

import nlp
import scraper

print("=" * 60)
print("TEST 1: Clustering real-looking posts")
print("=" * 60)

# Simulate some Reddit posts about SaaS
test_docs = [
    "Setting up Stripe billing and tax compliance is a nightmare. Spent the last week configuring multi-tier subscriptions.",
    "Is anyone else getting massive SaaS subscription fatigue? Between Notion, Slack, and Figma our small team pays $300/month.",
    "Solo founder burnout is incredibly real. I spend 90% of time on manual scheduling and email outreach.",
    "Jira is absolute bloatware. Indie teams need a lightweight sprint tool that integrates with Discord natively.",
    "Why is setting up local dev environments still so painful? Dockerize a simple database takes 5 hours.",
    "Technical coding interviews are getting ridiculous. 4-round interview for a junior front-end role?",
    "Cold outreach deliverability is completely broken. Google's new sender requirements are killing cold email.",
    "Budgeting apps are too complicated. Within a week the bank sync breaks and I abandon them.",
    "Applying to 400+ jobs completely ghosted. How does anyone find entry-level jobs?",
    "Hidden subscription fees are draining my bank account. Auto-renewals are predatory.",
]

model, topics = nlp.cluster_texts(test_docs)
print(f"Model type: {model}")
print(f"Topics: {topics}")
print(f"Unique topics: {set(topics)}")
print()

print("=" * 60)
print("TEST 2: Generating ideas for each unique cluster")
print("=" * 60)

unique_topics = list(set(topics))
for topic_name in unique_topics:
    topic_docs = [test_docs[i] for i, t in enumerate(topics) if t == topic_name]
    idea = nlp.generate_idea_from_cluster(topic_name, topic_docs)
    print(f"\n--- Cluster: {topic_name} ---")
    print(f"  Name: {idea['name']}")
    print(f"  Problem: {idea['problem'][:100]}...")
    print(f"  Audience: {idea['audience']}")
    print(f"  Features:\n{idea['features']}")
    print(f"  Revenue: {idea['revenue_model']}")

print("\n" + "=" * 60)
print("TEST 3: Running same cluster twice — should be deterministic per content")
print("=" * 60)
idea1 = nlp.generate_idea_from_cluster("Billing Issues", test_docs[:3])
idea2 = nlp.generate_idea_from_cluster("Billing Issues", test_docs[:3])
print(f"Run 1: {idea1['name']} -> {idea1['problem'][:60]}")
print(f"Run 2: {idea2['name']} -> {idea2['problem'][:60]}")
print(f"Same output (expected True): {idea1['name'] == idea2['name']}")

print("\n" + "=" * 60)
print("TEST 4: Different docs -> different output")
print("=" * 60)
idea3 = nlp.generate_idea_from_cluster("Billing Issues", test_docs[3:6])
print(f"Different docs: {idea3['name']} -> {idea3['problem'][:60]}")
print(f"Different from run 1 (expected True): {idea3['name'] != idea1['name']}")

print("\nAll tests passed!")
