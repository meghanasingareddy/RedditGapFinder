from sqlalchemy import Column, Integer, String, Float, Text
from database import Base

class Post(Base):
    __tablename__ = "posts"
    id = Column(String, primary_key=True, index=True)
    subreddit = Column(String, index=True)
    title = Column(String)
    selftext = Column(Text)
    url = Column(String)
    score = Column(Integer)
    created_utc = Column(Float)

class Comment(Base):
    __tablename__ = "comments"
    id = Column(String, primary_key=True, index=True)
    post_id = Column(String, index=True)
    body = Column(Text)
    score = Column(Integer)
    sentiment_score = Column(Float)

class Cluster(Base):
    __tablename__ = "clusters"
    id = Column(Integer, primary_key=True, index=True)
    topic_name = Column(String)
    keywords = Column(Text)
    size = Column(Integer)
    opportunity_score = Column(Float)

class Idea(Base):
    __tablename__ = "ideas"
    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer)
    name = Column(String)
    problem = Column(Text)
    audience = Column(String)
    features = Column(Text)
    revenue_model = Column(String)

class Trend(Base):
    __tablename__ = "trends"
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String)
    growth_percent = Column(Float)
    mentions = Column(Integer)

class Competitor(Base):
    __tablename__ = "competitors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    mentions = Column(Integer)
    frustrations = Column(Text)

class SavedItem(Base):
    __tablename__ = "saved_items"
    id = Column(Integer, primary_key=True, index=True)
    item_type = Column(String) # 'idea' or 'painpoint'
    item_id = Column(Integer)
    saved_at = Column(Float)
    name = Column(String)
    details = Column(Text)

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    created_at = Column(Float)
    data = Column(Text) # JSON string representing the report data

class SubredditTracker(Base):
    __tablename__ = "subreddit_trackers"
    id = Column(Integer, primary_key=True, index=True)
    subreddit = Column(String, index=True)
    is_active = Column(Integer, default=1)
    growth_percent = Column(Float)
    mentions = Column(Integer)
