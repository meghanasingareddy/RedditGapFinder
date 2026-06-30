import time
import random
import re
import requests
import scraper
import nlp
import ai_analyzer

# Depth configurations matching the UI
DEPTH_CONFIGS = {
    "quick": {"subreddits": 4, "posts_per_sub": 3, "label": "Quick Insight", "expected_time": "10s"},
    "standard": {"subreddits": 8, "posts_per_sub": 8, "label": "Standard Analysis", "expected_time": "30s"},
    "deep": {"subreddits": 15, "posts_per_sub": 8, "label": "Deep Research", "expected_time": "60s"},
    "market": {"subreddits": 20, "posts_per_sub": 8, "label": "Market Intelligence", "expected_time": "2m"}
}

def generate_fallback_subreddits(topic: str, limit: int = 25) -> list[str]:
    """
    Generates a list of highly relevant, real-world subreddits based on the topic keywords,
    serving as a robust mock or fallback when the live Reddit Search API is blocked or rate-limited.
    """
    topic_lower = topic.lower().strip()
    cleaned_topic = re.sub(r'[^a-zA-Z0-9]', '', topic.title())
    
    # Always prioritize the user's actual query to ensure unique scraping per query
    base_subreddits = [
        cleaned_topic,
        f"{cleaned_topic}Startups",
        f"Learn{cleaned_topic}",
        f"{cleaned_topic}Community"
    ]
    
    # 1. Tech & CS & Software & AI
    if any(k in topic_lower for k in ["cs", "dev", "code", "tech", "web", "program", "software", "ai", "ml", "chatgpt", "machine", "algorithm", "data", "javascript", "python", "react", "node", "devops"]):
        subreddits = base_subreddits + [
            "cscareerquestions", "webdev", "programming", "technology", "ChatGPT",
            "MachineLearning", "softwareengineering", "learnprogramming", "artificial",
            "datascience", "node", "reactjs", "python", "javascript", "devops"
        ]
    # 2. SaaS & Startups & Business & Indie & Marketing
    elif any(k in topic_lower for k in ["saas", "startup", "entrepreneur", "business", "indie", "hustle", "marketing", "sales", "solopreneur", "founder", "product", "growth"]):
        subreddits = base_subreddits + [
            "SideHustle", "SaaS", "startups", "Entrepreneur", "Business", "indiehackers",
            "marketing", "sales", "solopreneur", "smallbusiness", "ProductManagement",
            "GrowthHacking", "ecommerce", "workfromhome"
        ]
    # 3. Finance & Money & Investing & Crypto & Budgeting
    elif any(k in topic_lower for k in ["finance", "money", "budget", "crypto", "bitcoin", "invest", "passive", "fire", "stock", "wealth", "saving", "dividend", "tax"]):
        subreddits = base_subreddits + [
            "personalfinance", "FinancialIndependence", "investing", "stocks", "CryptoCurrency",
            "passiveincome", "Budgeting", "povertyfinance", "WallStreetBets", "Finance",
            "financialplanning", "tax", "dividends", "etfs", "Bitcoin"
        ]
    # 4. Design & UI/UX & Creative
    elif any(k in topic_lower for k in ["design", "figma", "ui", "ux", "graphic", "illustration", "creative", "art", "frontend"]):
        subreddits = base_subreddits + [
            "UIUX", "FigmaDesign", "webdesign", "graphicdesign", "ProductDesign",
            "userexperience", "designthought", "CreativeProfessionals", "frontend", "ArtistLounge"
        ]
    # 5. Education & Studying & Career
    elif any(k in topic_lower for k in ["education", "study", "college", "school", "student", "course", "learn", "career", "job", "resume", "university"]):
        subreddits = base_subreddits + [
            "education", "study", "college", "school", "students", "learning",
            "homeworkhelp", "onlinelearning", "careerguidance", "jobs", "resumes"
        ]
    # 6. Fashion & Style & Beauty
    elif any(k in topic_lower for k in ["fashion", "style", "clothing", "outfit", "wardrobe", "streetwear", "beauty", "skincare", "makeup", "sneakers", "thrift", "vintage"]):
        subreddits = base_subreddits + [
            "fashion", "streetwear", "malefashionadvice", "femalefashionadvice", "sneakers",
            "thriftstorehauls", "sewing", "FrugalFemaleFashion", "SkincareAddiction",
            "MakeupAddiction", "beauty", "VintageFashion", "sustainablefashion"
        ]
    # 7. Health & Fitness & Wellness
    elif any(k in topic_lower for k in ["health", "fitness", "gym", "workout", "nutrition", "diet", "mental", "meditation", "yoga", "running", "weight", "biohack", "sleep", "wellness"]):
        subreddits = base_subreddits + [
            "fitness", "loseit", "nutrition", "MealPrepSunday", "bodyweightfitness",
            "running", "yoga", "Meditation", "mentalhealth", "Biohackers",
            "sleep", "HealthyFood", "intermittentfasting", "keto", "PlantBasedDiet"
        ]
    # 8. Gaming
    elif any(k in topic_lower for k in ["gaming", "game", "gamer", "steam", "playstation", "xbox", "nintendo", "esport", "twitch", "stream"]):
        subreddits = base_subreddits + [
            "gaming", "pcgaming", "IndieGaming", "GameDeals", "patientgamers",
            "Games", "Steam", "NintendoSwitch", "PS5", "Twitch",
            "gamedev", "truegaming", "gamingsuggestions"
        ]
    # 9. Food & Cooking
    elif any(k in topic_lower for k in ["food", "cook", "recipe", "chef", "baking", "meal", "kitchen", "restaurant", "vegan", "keto"]):
        subreddits = base_subreddits + [
            "cooking", "recipes", "food", "MealPrepSunday", "EatCheapAndHealthy",
            "Baking", "slowcooking", "veganrecipes", "ketorecipes", "foodhacks",
            "AskCulinary", "Breadit", "seriouseats"
        ]
    # 10. Travel
    elif any(k in topic_lower for k in ["travel", "backpack", "nomad", "flight", "hotel", "vacation", "tourism", "adventure", "hiking"]):
        subreddits = base_subreddits + [
            "travel", "solotravel", "backpacking", "digitalnomad", "TravelHacks",
            "Shoestring", "roadtrip", "camping", "hiking", "AwardTravel",
            "TravelNoPics", "flights", "TravelPartners"
        ]
    # 11. Relationships & Social
    elif any(k in topic_lower for k in ["relationship", "dating", "marriage", "parenting", "family", "social", "friendship", "divorce"]):
        subreddits = base_subreddits + [
            "relationships", "relationship_advice", "dating_advice", "Marriage",
            "Parenting", "datingoverthirty", "Divorce", "socialskills",
            "MakingFriends", "LongDistance", "BreakUps"
        ]
    # 12. Pets & Animals
    elif any(k in topic_lower for k in ["pet", "dog", "cat", "puppy", "kitten", "veterinary", "animal"]):
        subreddits = base_subreddits + [
            "dogs", "cats", "pets", "puppy101", "DogTraining",
            "CatAdvice", "AskVet", "Dogfood", "PetAdvice",
            "AnimalRescue", "rabbits", "Aquariums"
        ]
    # 13. Remote Work & Productivity & Freelance
    elif any(k in topic_lower for k in ["remote", "productivity", "wfh", "work", "freelance", "freelancing", "timemanagement"]):
        subreddits = base_subreddits + [
            "remotework", "freelance", "productivity", "digitalnomad",
            "WorkOnline", "antiwork", "overemployed", "Upwork",
            "selfimprovement", "worklifebalance"
        ]
    # 14. General fallback based on the topic name itself
    else:
        subreddits = base_subreddits + [
            f"{cleaned_topic}Pro",
            "productivity",
            "selfimprovement",
            "digitalnomad",
            "worklifebalance"
        ]
        
    # Standardize list formatting
    result = []
    for sub in subreddits:
        sub_clean = sub.replace("r/", "").strip()
        if sub_clean and sub_clean not in result:
            result.append(sub_clean)
            
    return result[:limit]

def search_reddit_subreddits(topic: str, limit: int = 25) -> list[str]:
    """
    Search for subreddits matching a topic.
    Priority: Reddit API → Gemini AI discovery → curated fallback.
    """
    if scraper.is_using_mock_fallback():
        print(f"[TOPIC SEARCH] Mock fallback ACTIVE for '{topic}'.")
        return generate_fallback_subreddits(topic, limit)

    # 1. Try Reddit's own search API
    subs = scraper.search_subreddits_api(topic, limit=limit)
    if subs:
        return subs

    # 2. Use Gemini AI to intelligently discover relevant subreddits
    if ai_analyzer.is_ai_available():
        print(f"[TOPIC SEARCH] Using Gemini AI to discover subreddits for '{topic}'")
        ai_subs = ai_analyzer.discover_subreddits(topic, limit=limit)
        if ai_subs:
            return ai_subs

    # 3. Fall back to curated keyword-based list
    print(f"[TOPIC SEARCH] Using curated fallback for '{topic}'.")
    return generate_fallback_subreddits(topic, limit)


def run_topic_analysis(topic: str, depth: str = "standard", progress_callback=None) -> dict:
    """
    Executes a thorough crawl and NLP pipeline analysis for a given topic.
    Returns a unified dashboard payload.
    """
    depth_normalized = depth.lower().strip() if depth else "standard"
    depth_map = {
        "quick_insight": "quick",
        "standard_analysis": "standard",
        "deep_research": "deep",
        "market_intelligence": "market"
    }
    resolved_depth = depth_map.get(depth_normalized, depth_normalized)
    depth_key = resolved_depth if resolved_depth in DEPTH_CONFIGS else "standard"
    cfg = DEPTH_CONFIGS[depth_key]
    
    # 1. Search for subreddits
    if progress_callback:
        progress_callback("Searching subreddits...", 0, cfg["subreddits"])
        
    raw_subreddits = search_reddit_subreddits(topic, limit=cfg["subreddits"] + 5)
    
    # Enforce validation on no communities found
    if not raw_subreddits:
        raise ValueError(f"No communities found for '{topic}'. Try a different term.")
        
    subreddits_to_scan = raw_subreddits[:cfg["subreddits"]]
    total_subs = len(subreddits_to_scan)

    corpus_posts = []
    scanned_subs_list = []
    tried_subs: set = set(s.lower() for s in subreddits_to_scan)

    # 2. Fetch posts in parallel, retrying with extra subreddits if needed
    from concurrent.futures import ThreadPoolExecutor, as_completed

    def scrape_single_subreddit(sub_name):
        clean_sub = sub_name.replace("r/", "").strip()
        display_sub = f"r/{clean_sub}"
        print(f"[TOPIC SEARCH] Scraping '{display_sub}'")
        try:
            posts = scraper.scrape_subreddit(clean_sub, limit=cfg["posts_per_sub"])
            if posts:
                for p in posts:
                    p["subreddit"] = display_sub
                return display_sub, posts
        except Exception as e:
            print(f"[TOPIC SEARCH] Error scraping '{display_sub}': {e}")
        return display_sub, []

    completed_count = 0

    def run_batch(subs):
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(scrape_single_subreddit, s): s for s in subs}
            for future in as_completed(futures):
                display_sub, posts = future.result()
                if progress_callback:
                    progress_callback(f"Scanned {display_sub}...", len(scanned_subs_list), total_subs)
                if posts:
                    scanned_subs_list.append(display_sub)
                    corpus_posts.extend(posts)

    run_batch(subreddits_to_scan)

    # If we got nothing, expand the fallback list and try more subreddits
    if not corpus_posts:
        print("[TOPIC SEARCH] First batch empty — trying extended fallback subreddits")
        extended = generate_fallback_subreddits(topic, limit=30)
        extra = [s for s in extended if s.lower() not in tried_subs][:10]
        tried_subs.update(s.lower() for s in extra)
        if extra:
            run_batch(extra)

    # Still nothing — try universal high-traffic subreddits that always work
    if not corpus_posts:
        print("[TOPIC SEARCH] Extended batch also empty — trying universal subreddits")
        universal = ["startups", "Entrepreneur", "SideHustle", "productivity",
                     "business", "marketing", "technology", "selfimprovement"]
        last_resort = [s for s in universal if s.lower() not in tried_subs][:5]
        if last_resort:
            run_batch(last_resort)

    # Only use mock if absolutely everything failed
    if not corpus_posts:
        print("[TOPIC SEARCH] All real sources failed. Using contextual mock posts.")
        corpus_posts = scraper.generate_contextual_posts(topic, limit=15)
        scanned_subs_list = [f"r/{topic.lower().replace(' ', '')}"]
        for p in corpus_posts:
            p["subreddit"] = scanned_subs_list[0]

            
    # 3. Sentiment Analysis and NLP Clustering
    if progress_callback:
        progress_callback("Running NLP Sentiment & Clustering...", total_subs, total_subs)
        
    text_corpus = []
    posts_by_id = {}
    sentiment_sum = 0.0
    
    for p in corpus_posts:
        title = p["title"] or ""
        body = nlp.clean_text(p["selftext"] or "")
        combined_text = title + " " + body
        
        sentiment = nlp.analyze_sentiment(combined_text)
        p["sentiment"] = sentiment
        sentiment_sum += sentiment
        
        text_corpus.append(combined_text)
        posts_by_id[p["id"]] = p
        
    # Execute clustering
    model_or_fallback, topics = nlp.cluster_texts(text_corpus)
    unique_topics = list(set(topics))
    
    clusters = []
    chart_data = []
    ideas = []
    
    # 4. Aggregate Clusters (Pain Points)
    for topic_idx, raw_topic in enumerate(unique_topics):
        if isinstance(raw_topic, int) or str(raw_topic).lstrip('-').isdigit():
            t_idx = int(raw_topic)
            if t_idx == -1:
                topic_name = "General Frustration"
            elif model_or_fallback != "FallbackClustering" and hasattr(model_or_fallback, "get_topic"):
                try:
                    words = [w[0] for w in model_or_fallback.get_topic(t_idx)]
                    topic_name = " ".join(words[:3]).title()
                except Exception:
                    topic_name = f"Frustrations {t_idx}"
            else:
                topic_name = f"Frustrations {t_idx}"
        else:
            topic_name = str(raw_topic)
            
        if topic_name == "General Frustration" or not topic_name.strip():
            continue
            
        # Get docs in this cluster
        topic_docs = [text_corpus[i] for i, t in enumerate(topics) if t == raw_topic]
        
        # Calculate cluster specific sentiment
        cluster_sentiments = [p["sentiment"] for i, p in enumerate(corpus_posts) if topics[i] == raw_topic]
        avg_cluster_sent = sum(cluster_sentiments) / len(cluster_sentiments) if cluster_sentiments else 0.0
        
        # Calculate opportunity score (negative sentiment = higher opportunity)
        opp_score = int(80 + (avg_cluster_sent * -25) + (len(topic_docs) * 1.5))
        opp_score = max(60, min(98, opp_score))
        
        keywords = ", ".join(topic_name.split(" ")[-2:]) if " " in topic_name else topic_name
        
        # Format painpoint (matches ClusterBase)
        cluster_data = {
            "id": topic_idx + 1000,  # Offset to prevent conflict
            "topic_name": topic_name,
            "keywords": keywords,
            "size": len(topic_docs),
            "opportunity_score": float(opp_score)
        }
        clusters.append(cluster_data)
        
        # Format chart data
        chart_data.append({
            "name": topic_name[:15],
            "score": opp_score
        })
        
        # Generate startup ideas (NLP template as placeholder, AI will enhance below)
        idea_template = nlp.generate_idea_from_cluster(topic_name, topic_docs)
        ideas.append({
            "id": topic_idx + 2000,
            "cluster_id": topic_idx + 1000,
            "name": idea_template["name"],
            "problem": idea_template["problem"],
            "audience": idea_template["audience"],
            "features": idea_template["features"],
            "revenue_model": idea_template["revenue_model"],
            "score": opp_score
        })

    # Sort clusters and ideas by opportunity score descending
    clusters.sort(key=lambda x: x["opportunity_score"], reverse=True)
    ideas.sort(key=lambda x: x["score"], reverse=True)

    # 5. AI-powered idea enhancement — replace NLP template ideas with real Gemini analysis
    if ai_analyzer.is_ai_available() and corpus_posts:
        print(f"[AI] Generating enhanced startup ideas for '{topic}'...")
        ai_ideas = ai_analyzer.generate_startup_ideas(topic, corpus_posts, num_ideas=6)
        if ai_ideas:
            # Merge AI ideas with existing cluster IDs and scores
            ideas = []
            for i, ai_idea in enumerate(ai_ideas):
                cluster_id = clusters[i]["id"] if i < len(clusters) else 2000 + i
                score = clusters[i]["opportunity_score"] if i < len(clusters) else 75
                ideas.append({
                    "id": 2000 + i,
                    "cluster_id": cluster_id,
                    "name": ai_idea.get("name", f"Idea {i+1}"),
                    "problem": ai_idea.get("problem", ""),
                    "audience": ai_idea.get("audience", ""),
                    "features": ai_idea.get("features", ""),
                    "revenue_model": ai_idea.get("revenue_model", ""),
                    "score": int(ai_idea.get("score", score))
                })
            print(f"[AI] Enhanced {len(ideas)} ideas with Gemini analysis")
    
    # Calculate aggregate stats
    total_posts = len(corpus_posts)
    avg_opportunity = round(sum(c["opportunity_score"] for c in clusters) / len(clusters), 1) if clusters else 0.0
    
    # Sentiment distribution
    sentiment_distribution = {"Very Negative": 0, "Negative": 0, "Neutral": 0, "Positive": 0}
    for p in corpus_posts:
        s = p["sentiment"]
        if s < -0.3:
            sentiment_distribution["Very Negative"] += 1
        elif s < 0:
            sentiment_distribution["Negative"] += 1
        elif s < 0.3:
            sentiment_distribution["Neutral"] += 1
        else:
            sentiment_distribution["Positive"] += 1
            
    # Compile stats output
    stats = {
        "total_posts": total_posts,
        "total_clusters": len(clusters),
        "total_ideas": len(ideas),
        "avg_opportunity_score": avg_opportunity,
        "sentiment_distribution": sentiment_distribution,
        "scanned_subreddits": scanned_subs_list
    }
    
    # Format discoveries list (matches Post schema)
    discoveries = []
    for p in corpus_posts[:5]:  # Top 5 discoveries
        discoveries.append({
            "id": p["id"],
            "subreddit": p["subreddit"],
            "title": p["title"],
            "selftext": p["selftext"][:300] + "..." if len(p["selftext"] or "") > 300 else p["selftext"],
            "url": p["url"],
            "score": p["score"],
            "created_utc": p["created_utc"]
        })
        
    return {
        "status": "success",
        "topic": topic,
        "depth": depth_key,
        "stats": stats,
        "clusters": clusters,
        "ideas": ideas,
        "chart_data": chart_data[:6],  # Top 6 for chart readability
        "discoveries": discoveries
    }
