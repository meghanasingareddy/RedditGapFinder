from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./redditgapfinder.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_database(db):
    import models
    import time
    
    # 1. Seed SubredditTracker
    if db.query(models.SubredditTracker).count() == 0:
        db.add_all([
            models.SubredditTracker(subreddit="r/cscareerquestions", is_active=1, growth_percent=32.4, mentions=1240),
            models.SubredditTracker(subreddit="r/SaaS", is_active=1, growth_percent=28.1, mentions=982),
            models.SubredditTracker(subreddit="r/startups", is_active=1, growth_percent=18.5, mentions=756),
            models.SubredditTracker(subreddit="r/Entrepreneur", is_active=1, growth_percent=16.2, mentions=643),
            models.SubredditTracker(subreddit="r/personalfinance", is_active=1, growth_percent=12.8, mentions=412),
            models.SubredditTracker(subreddit="r/productivity", is_active=1, growth_percent=22.3, mentions=520),
            models.SubredditTracker(subreddit="r/nocode", is_active=1, growth_percent=25.0, mentions=310),
            models.SubredditTracker(subreddit="r/webdev", is_active=1, growth_percent=14.7, mentions=892),
        ])
        db.commit()

    # 2. Seed Competitor
    if db.query(models.Competitor).count() == 0:
        db.add_all([
            models.Competitor(name="LinkedIn", mentions=342, frustrations="Spammy recruiter messages, connection limits, fake engagement, useless search filters, high cost of Premium, lack of verified job listings."),
            models.Competitor(name="Notion", mentions=215, frustrations="Too slow to load, offline mode is non-existent or unreliable, complex to configure database relations, high learning curve, bloated interfaces."),
            models.Competitor(name="Jira", mentions=289, frustrations="Overwhelmingly complex layout, slow page response times, clutter of tabs/settings for small agile teams, expensive, hard to configure custom workflows."),
            models.Competitor(name="Discord", mentions=156, frustrations="Information gets lost in chat scroll, lacks threaded forum organization for deep topics, hard to search historical advice, noisy notifications, not indexed by Google."),
        ])
        db.commit()

    # 3. Seed Trend
    if db.query(models.Trend).count() == 0:
        db.add_all([
            models.Trend(topic="SaaS Subscription Fatigue", growth_percent=35.6, mentions=756),
            models.Trend(topic="Competitive Internship Struggles", growth_percent=42.1, mentions=1248),
            models.Trend(topic="Solo Founder Burnout", growth_percent=28.4, mentions=643),
            models.Trend(topic="SMS Expense Tracking", growth_percent=22.8, mentions=320),
            models.Trend(topic="Jira Alternatives for Indie Teams", growth_percent=19.5, mentions=512),
            models.Trend(topic="AI Resume Tailoring Tools", growth_percent=55.2, mentions=982),
        ])
        db.commit()

    # 4. Seed Cluster (Pain points)
    if db.query(models.Cluster).count() == 0:
        db.add_all([
            models.Cluster(id=1, topic_name="Finding CS internships is competitive and black-hole", keywords="internship, resume, apply, rejected, ghosted, csmajors", size=1248, opportunity_score=92.0),
            models.Cluster(id=2, topic_name="Too many SaaS tools, complex billing, wish for unified suite", keywords="saas, subscription, paying, budget, fatigue, tool", size=756, opportunity_score=88.5),
            models.Cluster(id=3, topic_name="Young professionals abandon budgeting apps due to manual entry", keywords="budget, manual, track, transaction, cards, lazy", size=643, opportunity_score=85.0),
            models.Cluster(id=4, topic_name="Jira is bloated and slow for small agile team development", keywords="jira, slow, complex, clunky, agile, bloated, alternative", size=512, opportunity_score=81.2),
            models.Cluster(id=5, topic_name="Resume tailoring takes too much manual editing time per application", keywords="resume, tailor, ats, custom, job, edit, matching", size=489, opportunity_score=76.8),
        ])
        db.commit()

    # 5. Seed Idea
    if db.query(models.Idea).count() == 0:
        db.add_all([
            models.Idea(id=1, cluster_id=1, name="SkillMatch AI", problem="College CS students apply to 200+ jobs manually and get ghosted due to generic resumes and blind applications.", audience="College CS majors, entry-level developers", features="• Automated resume tailoring matching job requirements\n• Micro-credential validation verified by recruiters\n• Direct routing of matching profiles to verified hiring managers", revenue_model="Freemium ($9/mo for priority matched notifications & resume rating)"),
            models.Idea(id=2, cluster_id=2, name="SaaS Pricing Radar", problem="Founders and small businesses lose track of recurring software subscriptions, leading to billing surprises and unused tool waste.", audience="Bootstrappers, agency owners, startups", features="• Browser extension that detects checkout pages and compares prices\n• Unified dashboard tracking active licenses across Notion, Slack, Jira\n• Automated alerts for renewal dates and unused software tracking", revenue_model="SaaS ($15/mo per organization)"),
            models.Idea(id=3, cluster_id=3, name="TextLedger", problem="Young professionals abandon personal finance applications because they require linking bank accounts or tedious manual database entry.", audience="Freelancers, gen-z professionals, busy founders", features="• Text/WhatsApp expense logging (e.g., '12 lunch' parses to $12 Food category)\n• Zero UI dashboard: weekly text-based visual report of spending trends\n• Automatic SMS recurring bill reminders", revenue_model="Subscription ($5/month or $45/year)"),
            models.Idea(id=4, cluster_id=4, name="SimpleSprint", problem="Small indie software teams find Jira/Linear too complex or bloated, resulting in poor ticket hygiene and abandoned boards.", audience="Solopreneurs, small dev teams, agency builders", features="• Minimal single-screen Kanban board that updates instantly\n• Slack/Discord commands to create and update tasks in real-time\n• Built-in simplified burndown chart with zero configuration", revenue_model="Free tier up to 3 members; $8/member/mo for larger teams"),
            models.Idea(id=5, cluster_id=5, name="ATS-Tailor Studio", problem="Job seekers spend hours manually modifying resumes to match specific ATS keywords, missing out on hot job postings.", audience="Active job seekers, career switchers", features="• Multi-resume document management dashboard\n• One-click PDF tailor mapping target description to skills\n• Live matching score and bullet-point suggestions generator", revenue_model="Pay-per-tailor ($0.50/resume) or Unlimited ($19/mo)"),
        ])
        db.commit()

    # 6. Seed Post
    if db.query(models.Post).count() == 0:
        db.add_all([
            models.Post(id="p1", subreddit="r/cscareerquestions", title="Applying to 500+ internships, 2 interviews, ghosted by everyone else. What am I doing wrong?", selftext="I have a 3.8 GPA, 2 solid personal projects, and go to a top 50 CS school. I tailor my resume slightly but it takes forever. It feels like my applications are just falling into a black hole. Recruiting is broken.", url="https://reddit.com/r/cscareerquestions/comments/p1", score=340, created_utc=time.time() - 3600*2),
            models.Post(id="p2", subreddit="r/SaaS", title="Seriously sick of subscription billing. Everything is a SaaS.", selftext="Just spent $150 this month on 12 different tools I barely use. I need a single workspace. Why does everything need a $10/mo subscription? I just want a simple product that does what it says without draining my bank.", url="https://reddit.com/r/SaaS/comments/p2", score=512, created_utc=time.time() - 3600*5),
            models.Post(id="p3", subreddit="r/personalfinance", title="Why is budgeting so hard? Is there a lazy way?", selftext="I've tried Monarch, YNAB, and Copilot. They either disconnect from my bank, or force me to spend an hour tagging stuff. I just want to text my expenses and have it magically sorted. Is there anything simple?", url="https://reddit.com/r/personalfinance/comments/p3", score=280, created_utc=time.time() - 3600*12),
            models.Post(id="p4", subreddit="r/webdev", title="Jira is absolute torture for small teams", selftext="We are a 4-person team building a web app. Why are we using Jira? It takes 10 seconds to load a board, setting up epic links is a chore, and half of our standup is spent waiting on the page load. Is there a simple lightweight alternative?", url="https://reddit.com/r/webdev/comments/p4", score=189, created_utc=time.time() - 3600*18),
            models.Post(id="p5", subreddit="r/startups", title="Founder burnout is real. Solo scaling is exhausting.", selftext="Between coding, marketing, sales, and writing blog posts, I am working 14 hours a day. I have no time to focus on product because I'm manually posting to Twitter and LinkedIn. Need simple automation.", url="https://reddit.com/r/startups/comments/p5", score=410, created_utc=time.time() - 3600*24),
        ])
        db.commit()

    # 7. Seed Comment
    if db.query(models.Comment).count() == 0:
        db.add_all([
            models.Comment(id="c1_1", post_id="p1", body="Same here! Applying is a complete black hole now. The ATS filters out 99% of people before a human even sees it. We need tools to match keywords better.", score=80, sentiment_score=-0.75),
            models.Comment(id="c1_2", post_id="p1", body="I built a script to tailor my resume for each job description and my callback rate went from 1% to 15%. Doing it manually is impossible at scale.", score=120, sentiment_score=0.20),
            models.Comment(id="c2_1", post_id="p2", body="Subscription fatigue is very real. I've cancelled almost everything and went back to open source or self-hosting. SaaS builders are pricing themselves out.", score=145, sentiment_score=-0.65),
            models.Comment(id="c2_2", post_id="p2", body="We need a bundle! Like a Setapp but for indie SaaS developers. Paying $15 for every tiny utility is unsustainable.", score=92, sentiment_score=0.10),
            models.Comment(id="c3_1", post_id="p3", body="SMS based tracking is the holy grail. I tried doing it on Telegram but it still required manual Google Sheets setup. A dedicated text finance tool would sell.", score=88, sentiment_score=0.45),
            models.Comment(id="c4_1", post_id="p4", body="We switched to Linear and it's night and day. But even Linear feels bloated. Honestly a shared Trello card is enough if people have good discipline.", score=50, sentiment_score=-0.20),
            models.Comment(id="c5_1", post_id="p5", body="As a fellow solo founder, I feel your pain. I spend 70% of my time doing mundane operations and only 30% building. We need simplified marketing routers.", score=65, sentiment_score=-0.40),
        ])
        db.commit()

    # 8. Seed SavedItem
    if db.query(models.SavedItem).count() == 0:
        db.add_all([
            models.SavedItem(item_type="idea", item_id=1, saved_at=time.time(), name="SkillMatch AI", details="AI resume matching and micro-credential verification to resolve the competitive internship struggle."),
            models.SavedItem(item_type="painpoint", item_id=2, saved_at=time.time(), name="SaaS Subscription Fatigue", details="Widespread customer fatigue due to overpriced, micro-targeted tools with overlapping features."),
        ])
        db.commit()

    # 9. Seed Report
    if db.query(models.Report).count() == 0:
        import json
        report_data = {
            "title": "Quarterly SaaS & Developer Pain Point Analysis",
            "date": "May 2026",
            "summary": "This report details trending customer frustrations extracted from CSCareerQuestions, SaaS, and webdev subreddits.",
            "metrics": {
                "posts_analyzed": 128400,
                "pain_points": 3842,
                "ideas_generated": 312,
                "average_opp_score": 78
            },
            "top_pain_points": [
                {"id": 1, "text": "Finding CS internships is competitive and black-hole", "score": 92},
                {"id": 2, "text": "Too many SaaS tools, complex billing", "score": 88},
                {"id": 3, "text": "Jira is bloated and slow for small agile team development", "score": 81}
            ]
        }
        db.add(models.Report(name="SaaS & Developer Pain Point Analysis (Q2 2026)", created_at=time.time(), data=json.dumps(report_data)))
        db.commit()
