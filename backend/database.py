import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables if not already loaded
for path in [".env", "../.env", "backend/.env"]:
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        if k.strip() not in os.environ:
                            os.environ[k.strip()] = v.strip().strip('"').strip("'")
        except Exception as e:
            pass

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./redditgapfinder.db")

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
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

    if db.query(models.SubredditTracker).count() == 0:
        db.add_all([
            models.SubredditTracker(subreddit="r/cscareerquestions", is_active=1, growth_percent=32.4, mentions=1240),
            models.SubredditTracker(subreddit="r/SaaS", is_active=1, growth_percent=28.1, mentions=982),
            models.SubredditTracker(subreddit="r/startups", is_active=1, growth_percent=18.5, mentions=756),
        ])
        db.commit()

    if db.query(models.Competitor).count() == 0:
        db.add_all([
            models.Competitor(name="LinkedIn", mentions=342, frustrations="Spammy recruiter messages, connection limits, fake engagement."),
            models.Competitor(name="Notion", mentions=215, frustrations="Slow to load, unreliable offline mode, high learning curve."),
        ])
        db.commit()

    if db.query(models.Trend).count() == 0:
        db.add_all([
            models.Trend(topic="SaaS Subscription Fatigue", growth_percent=35.6, mentions=756),
            models.Trend(topic="Solo Founder Burnout", growth_percent=28.4, mentions=643),
        ])
        db.commit()

    if db.query(models.Cluster).count() == 0:
        db.add_all([
            models.Cluster(id=1, topic_name="Finding CS internships is competitive and black-hole", keywords="internship, resume, apply, rejected", size=1248, opportunity_score=92.0),
            models.Cluster(id=2, topic_name="Too many SaaS tools, complex billing", keywords="saas, subscription, budget, fatigue", size=756, opportunity_score=88.5),
        ])
        db.commit()

    if db.query(models.Idea).count() == 0:
        db.add_all([
            models.Idea(id=1, cluster_id=1, name="SkillMatch AI", problem="College CS students apply to hundreds of jobs and get ghosted.", audience="College CS majors", features="Automated resume tailoring", revenue_model="Freemium ($9/mo)"),
            models.Idea(id=2, cluster_id=2, name="SaaS Pricing Radar", problem="Founders lose track of recurring software subscriptions.", audience="Bootstrappers, startups", features="Unified subscription dashboard", revenue_model="SaaS ($15/mo)"),
        ])
        db.commit()

