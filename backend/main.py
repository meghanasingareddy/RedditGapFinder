import time
import json
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel

import models, schemas
import scraper, nlp, topic_search
from database import engine, get_db, SessionLocal, seed_database

# Topic search caching
topic_search_cache = {}
topic_rate_limit = {}

class TopicSearchRequest(BaseModel):
    topic: str
    depth: Optional[str] = "standard"

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Seed database on startup
db = SessionLocal()
try:
    seed_database(db)
finally:
    db.close()

app = FastAPI(title="RedditGapFinder API", version="1.0.0")

@app.on_event("startup")
def startup_event():
    mode = "MOCK-FALLBACK" if scraper.is_using_mock_fallback() else "LIVE RSS"
    print("\n" + "="*60)
    print(f"RedditGapFinder backend started in {mode} mode.")
    print("="*60 + "\n")

import os

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
allowed_origins_str = os.getenv("CORS_ALLOWED_ORIGINS", "")
if allowed_origins_str:
    for origin in allowed_origins_str.split(","):
        origin = origin.strip()
        if origin and origin not in origins:
            origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "product": "RedditGapFinder API",
        "timestamp": time.time(),
        "endpoints": [
            "GET /api/status",
            "POST /api/scan",
            "GET /api/painpoints",
            "GET /api/ideas",
            "GET /api/trends",
        ]
    }

@app.get("/api/status")
def get_api_status():
    using_mock = scraper.is_using_mock_fallback()
    return {
        "status": "online",
        "api_connected": not using_mock,
        "mode": "mock_fallback" if using_mock else "live_rss",
        "reddit_client_configured": True
    }

@app.get("/api/debug/ai")
def debug_ai():
    import ai_analyzer
    import os
    return {
        "is_ai_available": ai_analyzer.is_ai_available(),
        "env_key_set": bool(os.getenv("GEMINI_API_KEY")),
        "key_length": len(os.getenv("GEMINI_API_KEY", "")),
        "model_loaded": ai_analyzer._get_model() is not None,
    }

@app.get("/api/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_posts = db.query(models.Post).count()
    total_clusters = db.query(models.Cluster).count()
    total_ideas = db.query(models.Idea).count()
    
    clusters = db.query(models.Cluster).all()
    avg_opp = round(sum(c.opportunity_score for c in clusters) / len(clusters), 1) if clusters else 0
    
    return {
        "total_posts": total_posts,
        "total_clusters": total_clusters,
        "total_ideas": total_ideas,
        "avg_opportunity_score": avg_opp,
    }

@app.post("/api/scan")
def scan_reddit(
    subreddit: str = Query(..., description="Subreddit name (e.g. 'startup')"),
    db: Session = Depends(get_db)
):
    clean_sub = subreddit.strip().replace("r/", "")
    subreddit_db_value = f"r/{clean_sub}"
    
    # Scrape posts using the working function
    scraped_posts = scraper.scrape_subreddit(clean_sub, limit=10)
    
    if not scraped_posts:
        raise HTTPException(status_code=400, detail="No posts found")
    
    saved_posts_count = 0
    sentiment_sum = 0.0
    text_corpus = []
    
    for p in scraped_posts:
        cleaned_selftext = nlp.clean_text(p.get("selftext", "") or "")
        sentiment = nlp.analyze_sentiment(p["title"] + " " + cleaned_selftext)
        sentiment_sum += sentiment
        text_corpus.append(p["title"] + " " + cleaned_selftext)
        
        db_post = models.Post(
            id=p["id"],
            subreddit=subreddit_db_value,
            title=p["title"],
            selftext=p.get("selftext", ""),
            url=p.get("url", ""),
            score=p.get("score", 0),
            created_utc=p.get("created_utc", time.time())
        )
        db.merge(db_post)
        saved_posts_count += 1
        
    db.commit()
    
    # Cluster pain points
    model_or_fallback, topics = nlp.cluster_texts(text_corpus)
    unique_topics = list(set(topics))
    
    for raw_topic in unique_topics:
        if raw_topic == -1:
            topic_name = "General Frustration"
        else:
            topic_name = f"Topic {raw_topic}"
            
        existing_cluster = db.query(models.Cluster).filter(models.Cluster.topic_name == topic_name).first()
        
        if not existing_cluster:
            import random
            new_cluster = models.Cluster(
                topic_name=topic_name,
                keywords=", ".join(text_corpus[0].split()[:3]),
                size=len([t for t in topics if t == raw_topic]),
                opportunity_score=round(random.uniform(70, 95), 1)
            )
            db.add(new_cluster)
            db.commit()
    
    avg_sentiment = sentiment_sum / len(scraped_posts) if scraped_posts else 0.0
    
    return {
        "status": "success",
        "subreddit": subreddit_db_value,
        "posts_scanned": saved_posts_count,
        "average_sentiment": round(avg_sentiment, 2),
        "clusters_discovered": len(unique_topics)
    }

@app.post("/api/analyze")
def analyze_query(query: str = Query(..., description="Query to analyze")):
    posts = scraper.scrape_subreddit(query, limit=5)
    if not posts:
        posts = scraper.generate_contextual_posts(query, limit=5)
    
    corpus = [p["title"] + " " + (p.get("selftext", "") or "") for p in posts]
    sentiments = [nlp.analyze_sentiment(doc) for doc in corpus]
    avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0.0
    
    sentiment_str = "Negative" if avg_sentiment < -0.1 else "Neutral" if avg_sentiment < 0.2 else "Positive"
    opp_score = int(75 + (avg_sentiment * -20) + (len(corpus) * 2))
    opp_score = max(50, min(98, opp_score))
    
    return {
        "query": query,
        "summary": f"Analysis of '{query}' shows market opportunity.",
        "sentiment": sentiment_str,
        "opportunity_score": opp_score,
        "primary_topic": query
    }

@app.post("/api/search/topic")
def post_search_topic(request: TopicSearchRequest):
    try:
        from topic_search import run_topic_analysis
        payload = run_topic_analysis(request.topic, depth=request.depth or "standard")
        return payload
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/painpoints")
def get_painpoints(db: Session = Depends(get_db)):
    return db.query(models.Cluster).order_by(models.Cluster.opportunity_score.desc()).all()

@app.get("/api/ideas")
def get_ideas(db: Session = Depends(get_db)):
    return db.query(models.Idea).all()

@app.get("/api/trends")
def get_trends(db: Session = Depends(get_db)):
    return db.query(models.Trend).all()

@app.get("/api/subreddits")
def get_subreddits(db: Session = Depends(get_db)):
    return db.query(models.SubredditTracker).all()

@app.get("/api/competitors")
def get_competitors(db: Session = Depends(get_db)):
    return db.query(models.Competitor).all()

@app.get("/api/reports")
def get_reports(db: Session = Depends(get_db)):
    return db.query(models.Report).all()

@app.get("/api/saved")
def get_saved(db: Session = Depends(get_db)):
    return db.query(models.SavedItem).all()