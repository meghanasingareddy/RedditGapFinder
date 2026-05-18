import time
import json
from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

import models, schemas
import scraper
import nlp
from database import engine, get_db, SessionLocal, seed_database

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
    mode = "MOCK-FALLBACK" if scraper.is_using_mock_fallback() else "LIVE RSS/ATOM"
    print("\n" + "="*60)
    print(f"RedditGapFinder backend started in {mode} mode.")
    if scraper.is_using_mock_fallback():
        print("Set FORCE_MOCK_DATA to 'false' to enable live feed scraping.")
    else:
        print("Live RSS/Atom scraper is active (Authentication-free).")
    print("="*60 + "\n")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev purposes
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
            "GET /api/posts",
            "GET /api/comments/{post_id}",
            "POST /api/scan",
            "POST /api/analyze",
            "GET /api/painpoints",
            "GET /api/ideas",
            "GET /api/trends",
            "GET /api/subreddits",
            "GET /api/competitors",
            "GET /api/reports",
            "GET /api/saved"
        ]
    }

@app.get("/api/status")
def get_api_status():
    using_mock = scraper.is_using_mock_fallback()
    return {
        "status": "online",
        "api_connected": not using_mock,
        "mode": "mock_fallback" if using_mock else "live_rss",
        "details": "Using robust simulated mock-fallback. FORCE_MOCK_DATA is active." if using_mock else "Connected to Live RSS Feed Scraper (Authentication-free).",
        "reddit_client_configured": True
    }

# ==================================================
# POSTS & COMMENTS
# ==================================================

@app.get("/api/posts", response_model=List[schemas.PostBase])
def get_posts(
    subreddit: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.Post)
    if subreddit:
        # Support both 'r/cscareerquestions' and 'cscareerquestions' formats
        clean_sub = subreddit.replace("r/", "")
        query = query.filter(models.Post.subreddit.like(f"%{clean_sub}%"))
    if search:
        query = query.filter(
            (models.Post.title.like(f"%{search}%")) |
            (models.Post.selftext.like(f"%{search}%"))
        )
    return query.order_by(models.Post.score.desc()).offset(skip).limit(limit).all()

@app.get("/api/comments/{post_id}", response_model=List[schemas.CommentBase])
def get_comments(post_id: str, db: Session = Depends(get_db)):
    comments = db.query(models.Comment).filter(models.Comment.post_id == post_id).all()
    if not comments:
        # If comments are not cached, scrape them dynamically and save
        scraped = scraper.scrape_comments(post_id, limit=10)
        comments = []
        for c in scraped:
            sentiment = nlp.analyze_sentiment(c["body"])
            db_comment = models.Comment(
                id=c["id"],
                post_id=post_id,
                body=c["body"],
                score=c["score"],
                sentiment_score=sentiment
            )
            db.merge(db_comment)
            comments.append(db_comment)
        db.commit()
    return comments

# ==================================================
# SCAN & ANALYZE PIPELINES
# ==================================================

@app.post("/api/scan")
def scan_reddit(
    subreddit: str = Query(..., description="Subreddit name (e.g. 'SaaS') or custom RSS URL"),
    db: Session = Depends(get_db)
):
    from urllib.parse import urlparse
    
    clean_sub = subreddit.strip()
    if clean_sub.startswith("http://") or clean_sub.startswith("https://"):
        parsed_url = urlparse(clean_sub)
        domain = parsed_url.netloc or "custom_feed"
        subreddit_db_value = f"RSS ({domain})"
    else:
        clean_sub = clean_sub.replace("r/", "")
        subreddit_db_value = f"r/{clean_sub}"
    
    # 1. Scrape posts
    scraped_posts = scraper.scrape_subreddit(clean_sub, limit=10)
    
    saved_posts_count = 0
    sentiment_sum = 0.0
    text_corpus = []
    
    # 2. Analyze sentiment and store posts
    for p in scraped_posts:
        cleaned_selftext = nlp.clean_text(p["selftext"] or "")
        sentiment = nlp.analyze_sentiment(p["title"] + " " + cleaned_selftext)
        sentiment_sum += sentiment
        text_corpus.append(p["title"] + " " + cleaned_selftext)
        
        db_post = models.Post(
            id=p["id"],
            subreddit=subreddit_db_value,
            title=p["title"],
            selftext=p["selftext"],
            url=p["url"],
            score=p["score"],
            created_utc=p["created_utc"]
        )
        db.merge(db_post)
        saved_posts_count += 1
        
    db.commit()
    
    if not text_corpus:
        raise HTTPException(status_code=400, detail="No posts found to analyze")

    # 3. Cluster pain points
    model_or_fallback, topics = nlp.cluster_texts(text_corpus)
    
    # Extract unique clusters from this scan
    unique_topics = list(set(topics))
    added_clusters = []
    added_ideas = []
    
    for raw_topic in unique_topics:
        # Convert raw topic (could be int from BERTopic or string category) to string
        if isinstance(raw_topic, int) or str(raw_topic).lstrip('-').isdigit():
            topic_idx = int(raw_topic)
            if topic_idx == -1:
                topic_name = "General Frustration"
            elif model_or_fallback != "FallbackClustering" and hasattr(model_or_fallback, "get_topic"):
                try:
                    words = [w[0] for w in model_or_fallback.get_topic(topic_idx)]
                    topic_name = " ".join(words[:3]).title()
                except Exception:
                    topic_name = f"Topic {topic_idx}"
            else:
                topic_name = f"Topic {topic_idx}"
        else:
            topic_name = str(raw_topic)
            
        if topic_name == "General Frustration" or not topic_name.strip():
            continue
            
        # Check if cluster already exists
        existing_cluster = db.query(models.Cluster).filter(models.Cluster.topic_name == topic_name).first()
        topic_docs = [text_corpus[i] for i, t in enumerate(topics) if t == raw_topic]
        
        if existing_cluster:
            existing_cluster.size += len(topic_docs)
            db.commit()
            added_clusters.append(existing_cluster)
        else:
            # Create a new cluster
            opp_score = round(random_opportunity_score(), 1)
            keywords = ", ".join(topic_name.split(" ")[-2:]) if " " in topic_name else topic_name
            new_cluster = models.Cluster(
                topic_name=topic_name,
                keywords=keywords,
                size=len(topic_docs),
                opportunity_score=opp_score
            )
            db.add(new_cluster)
            db.commit()
            db.refresh(new_cluster)
            added_clusters.append(new_cluster)
            
            # Generate a startup idea for this new cluster
            idea_data = nlp.generate_idea_from_cluster(topic_name, topic_docs)
            new_idea = models.Idea(
                cluster_id=new_cluster.id,
                name=idea_data["name"],
                problem=idea_data["problem"],
                audience=idea_data["audience"],
                features=idea_data["features"],
                revenue_model=idea_data["revenue_model"]
            )
            db.add(new_idea)
            db.commit()
            db.refresh(new_idea)
            added_ideas.append(new_idea)

    # 4. Update Trend growth for this subreddit/channel
    avg_sentiment = sentiment_sum / len(scraped_posts) if scraped_posts else 0.0
    existing_trend = db.query(models.Trend).filter(models.Trend.topic.like(f"%{subreddit_db_value}%")).first()
    if existing_trend:
        existing_trend.mentions += saved_posts_count
        existing_trend.growth_percent = round(existing_trend.growth_percent + 2.5, 1)
    else:
        new_trend = models.Trend(
            topic=f"{subreddit_db_value} Activity",
            growth_percent=15.0,
            mentions=saved_posts_count
        )
        db.add(new_trend)
    db.commit()

    return {
        "status": "success",
        "subreddit": subreddit_db_value,
        "posts_scanned": saved_posts_count,
        "average_sentiment": round(avg_sentiment, 2),
        "clusters_discovered": len(added_clusters),
        "ideas_generated": len(added_ideas),
        "new_ideas": [i.name for i in added_ideas]
    }

@app.post("/api/analyze")
def analyze_query(query: str = Query(..., description="Query to analyze, e.g., 'SaaS struggles'")):
    # Instant query analysis (Search Explorer endpoint)
    # 1. Generate text corpus contextually based on query
    posts = scraper.generate_contextual_posts(query, limit=5)
    corpus = [p["title"] + " " + (p["selftext"] or "") for p in posts]
    
    # 2. Extract sentiment
    sentiments = [nlp.analyze_sentiment(doc) for doc in corpus]
    avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0.0
    
    # 3. Categorize topic
    _, topics = nlp.cluster_texts(corpus)
    primary_topic = topics[0] if topics else "General Frustration"
    
    # 4. Generate direct idea
    idea = nlp.generate_idea_from_cluster(primary_topic, corpus)
    
    # Simple formatting of output for frontend search
    sentiment_str = "Negative" if avg_sentiment < -0.1 else "Neutral" if avg_sentiment < 0.2 else "Positive"
    opp_score = int(75 + (avg_sentiment * -20) + (len(corpus) * 2)) # Negative sentiment yields higher opportunity
    opp_score = max(50, min(98, opp_score))
    
    return {
        "query": query,
        "summary": f"Based on analysis of conversations around '{query}', we detected strong frustrations regarding {primary_topic.lower()}.",
        "sentiment": sentiment_str,
        "opportunity_score": opp_score,
        "primary_topic": primary_topic,
        "ideas": [
            f"Build {idea['name']}: {idea['problem'][:80]}...",
            f"Create a niche automated pipeline solving: {corpus[0][:80]}..."
        ],
        "full_idea": idea
    }

def random_opportunity_score():
    import random
    return random.uniform(70.0, 95.0)

# ==================================================
# PAIN POINTS (CLUSTERS)
# ==================================================

@app.get("/api/painpoints", response_model=List[schemas.ClusterBase])
def get_painpoints(
    search: Optional[str] = None,
    sort_by: str = "score", # "score" or "size"
    db: Session = Depends(get_db)
):
    query = db.query(models.Cluster)
    if search:
        query = query.filter(
            (models.Cluster.topic_name.like(f"%{search}%")) |
            (models.Cluster.keywords.like(f"%{search}%"))
        )
    if sort_by == "size":
        return query.order_by(models.Cluster.size.desc()).all()
    else:
        return query.order_by(models.Cluster.opportunity_score.desc()).all()

# ==================================================
# STARTUP IDEAS
# ==================================================

@app.get("/api/ideas", response_model=List[schemas.IdeaBase])
def get_ideas(db: Session = Depends(get_db)):
    ideas = db.query(models.Idea).all()
    # Ensure all ideas have scores mapped based on cluster opportunity
    for idea in ideas:
        cluster = db.query(models.Cluster).filter(models.Cluster.id == idea.cluster_id).first()
        if cluster:
            idea.score = int(cluster.opportunity_score)
        else:
            idea.score = 85
    return ideas

# ==================================================
# TRENDS
# ==================================================

@app.get("/api/trends", response_model=List[schemas.TrendBase])
def get_trends(db: Session = Depends(get_db)):
    return db.query(models.Trend).order_by(models.Trend.growth_percent.desc()).all()

# ==================================================
# TRACKED SUBREDDITS
# ==================================================

@app.get("/api/subreddits", response_model=List[schemas.SubredditTrackerBase])
def get_subreddits(db: Session = Depends(get_db)):
    return db.query(models.SubredditTracker).all()

@app.post("/api/subreddits", response_model=schemas.SubredditTrackerBase)
def add_subreddit(tracker: schemas.SubredditTrackerCreate, db: Session = Depends(get_db)):
    clean_sub = tracker.subreddit.replace("r/", "")
    existing = db.query(models.SubredditTracker).filter(models.SubredditTracker.subreddit == f"r/{clean_sub}").first()
    if existing:
        return existing
        
    new_tracker = models.SubredditTracker(
        subreddit=f"r/{clean_sub}",
        is_active=1,
        growth_percent=round(random_opportunity_score() / 3, 1),
        mentions=100
    )
    db.add(new_tracker)
    db.commit()
    db.refresh(new_tracker)
    return new_tracker

@app.delete("/api/subreddits/{id}")
def delete_subreddit(id: int, db: Session = Depends(get_db)):
    item = db.query(models.SubredditTracker).filter(models.SubredditTracker.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Tracked subreddit not found")
    db.delete(item)
    db.commit()
    return {"status": "success", "message": f"Untracked subreddit ID {id}"}

# ==================================================
# COMPETITORS
# ==================================================

@app.get("/api/competitors", response_model=List[schemas.CompetitorBase])
def get_competitors(db: Session = Depends(get_db)):
    return db.query(models.Competitor).order_by(models.Competitor.mentions.desc()).all()

# ==================================================
# REPORTS
# ==================================================

@app.get("/api/reports", response_model=List[schemas.ReportBase])
def get_reports(db: Session = Depends(get_db)):
    return db.query(models.Report).all()

@app.post("/api/reports", response_model=schemas.ReportBase)
def create_report(report: schemas.ReportCreate, db: Session = Depends(get_db)):
    new_report = models.Report(
        name=report.name,
        created_at=time.time(),
        data=report.data
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

# ==================================================
# SAVED (BOOKMARKS)
# ==================================================

@app.get("/api/saved", response_model=List[schemas.SavedItemBase])
def get_saved(db: Session = Depends(get_db)):
    return db.query(models.SavedItem).order_by(models.SavedItem.saved_at.desc()).all()

@app.post("/api/saved", response_model=schemas.SavedItemBase)
def save_item(item: schemas.SavedItemCreate, db: Session = Depends(get_db)):
    # Avoid duplicate saves
    existing = db.query(models.SavedItem).filter(
        (models.SavedItem.item_type == item.item_type) &
        (models.SavedItem.item_id == item.item_id)
    ).first()
    if existing:
        return existing
        
    new_save = models.SavedItem(
        item_type=item.item_type,
        item_id=item.item_id,
        saved_at=time.time(),
        name=item.name,
        details=item.details
    )
    db.add(new_save)
    db.commit()
    db.refresh(new_save)
    return new_save

@app.delete("/api/saved/{id}")
def delete_saved(id: int, db: Session = Depends(get_db)):
    item = db.query(models.SavedItem).filter(models.SavedItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Saved item not found")
    db.delete(item)
    db.commit()
    return {"status": "success", "message": f"Bookmark ID {id} removed"}
