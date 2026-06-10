import re
import random
import hashlib
from collections import Counter

# Try importing the heavy libraries, but don't fail if they aren't installed
try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

try:
    from bertopic import BERTopic
    HAS_BERTOPIC = True
except ImportError:
    HAS_BERTOPIC = False

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    HAS_VADER = True
except ImportError:
    HAS_VADER = False

try:
    from transformers import pipeline
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False

# Lazy-loaded models
embedding_model = None
topic_model = None
sentiment_analyzer = None
summarizer = None

def get_embedding_model():
    global embedding_model
    if not HAS_SENTENCE_TRANSFORMERS:
        return None
    if embedding_model is None:
        try:
            embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception:
            return None
    return embedding_model

def get_topic_model():
    global topic_model
    if not HAS_BERTOPIC:
        return None
    if topic_model is None:
        try:
            emb = get_embedding_model()
            if emb:
                topic_model = BERTopic(embedding_model=emb)
        except Exception:
            return None
    return topic_model

def get_sentiment_analyzer():
    global sentiment_analyzer
    if not HAS_VADER:
        return None
    if sentiment_analyzer is None:
        try:
            sentiment_analyzer = SentimentIntensityAnalyzer()
        except Exception:
            return None
    return sentiment_analyzer

def get_summarizer():
    global summarizer
    if not HAS_TRANSFORMERS:
        return None
    if summarizer is None:
        try:
            summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
        except Exception:
            return None
    return summarizer

def analyze_sentiment(text: str) -> float:
    if not text:
        return 0.0
    analyzer = get_sentiment_analyzer()
    if analyzer:
        try:
            scores = analyzer.polarity_scores(text)
            return scores['compound']
        except Exception:
            pass
            
    # Advanced zero-dependency rule-based sentiment fallback
    negatives = {"hate", "sucks", "annoy", "annoying", "frustrated", "frustrating", "terrible", "bad", 
                 "pain", "painpoint", "problem", "broken", "nightmare", "clunky", "bloated", "slow",
                 "expensive", "waste", "useless", "worst", "buggy", "broken", "fail", "difficult", "struggle"}
    positives = {"love", "great", "awesome", "perfect", "good", "amazing", "easy", "simple", "fast",
                 "cheap", "useful", "best", "helper", "nice", "clean", "wonderful", "solved", "helper"}
    
    words = re.findall(r'\w+', text.lower())
    score = 0.0
    for w in words:
        if w in negatives:
            score -= 0.25
        elif w in positives:
            score += 0.20
            
    # Clamp between -1.0 and 1.0
    return max(-1.0, min(1.0, score))

def clean_text(text: str) -> str:
    if not text:
        return ""
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    # Remove multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ============================================================
# STOP WORDS — comprehensive list for better keyword extraction
# ============================================================

STOP_WORDS = {
    "about", "above", "after", "again", "against", "also", "among", "another",
    "because", "been", "before", "being", "below", "between", "both", "could",
    "does", "doing", "done", "down", "during", "each", "even", "every",
    "from", "getting", "going", "gotten", "have", "having", "here", "into",
    "just", "keep", "know", "like", "looking", "make", "making", "many",
    "more", "most", "much", "need", "never", "only", "other", "over",
    "people", "really", "right", "same", "should", "since", "some", "something",
    "someone", "still", "such", "take", "than", "that", "their", "them",
    "then", "there", "these", "they", "thing", "things", "think", "this",
    "those", "through", "time", "trying", "until", "upon", "using", "very",
    "want", "well", "were", "what", "when", "where", "which", "while",
    "will", "with", "without", "would", "your", "able", "already", "always",
    "around", "away", "back", "basically", "best", "better", "come", "completely",
    "currently", "didn", "doesn", "don", "else", "enough", "ever", "feel",
    "find", "first", "full", "give", "good", "great", "half", "help",
    "however", "isn", "it's", "its", "kind", "last", "least", "less",
    "long", "look", "made", "might", "myself", "nothing", "often", "once",
    "open", "part", "pretty", "probably", "quite", "seem", "seems", "seen",
    "show", "simply", "sort", "start", "sure", "tell", "though", "told",
    "took", "true", "turn", "used", "uses", "wasn", "went", "whole",
    "work", "works", "working", "years", "post", "posts", "reddit", "subreddit",
    "anyone", "anything", "everything", "can't", "won't", "it", "you",
    "the", "and", "for", "are", "but", "not", "had", "has", "was",
    "all", "can", "her", "him", "his", "how", "may", "new", "now",
    "old", "one", "our", "out", "own", "say", "she", "too", "two",
    "way", "who", "why", "big", "did", "get", "got", "let", "put",
    "run", "set", "try", "day", "end", "far", "few", "off",
    # Temporal / generic words that make poor cluster names
    "week", "weeks", "month", "months", "year", "today", "yesterday",
    "tomorrow", "hours", "hour", "minute", "minutes", "second", "seconds",
    "setting", "settings", "setup", "getting", "being", "doing", "having",
    "going", "coming", "trying", "making", "taking", "giving", "keeping",
    "spent", "spend", "spending", "absolutely", "absolute", "incredibly",
    "completely", "literally", "entire", "actually", "basically", "essentially",
    "massive", "huge", "small", "little", "large", "simple", "real",
    "literally", "honestly", "entire", "single", "every", "another",
}


def _extract_keywords(text: str, max_words: int = 8) -> list[str]:
    """Extract meaningful keywords from text, filtering stop words."""
    words = re.findall(r'[a-zA-Z]{3,}', text.lower())
    filtered = [w for w in words if w not in STOP_WORDS and len(w) > 3]
    return filtered[:max_words]


def _extract_bigrams(docs: list[str]) -> Counter:
    """Extract meaningful bigrams (2-word phrases) from documents."""
    bigram_counter = Counter()
    for doc in docs:
        words = re.findall(r'[a-zA-Z]{3,}', doc.lower())
        filtered = [w for w in words if w not in STOP_WORDS and len(w) > 3]
        for i in range(len(filtered) - 1):
            bigram = f"{filtered[i]} {filtered[i+1]}"
            bigram_counter[bigram] += 1
    return bigram_counter


def cluster_texts(docs: list[str]):
    """
    Cluster a list of text documents into meaningful topic groups.
    Uses BERTopic when available, otherwise falls back to a sophisticated
    keyword-frequency + bigram clustering approach that produces diverse,
    content-specific cluster names.
    """
    # Try BERTopic
    topic_model_instance = get_topic_model()
    if topic_model_instance:
        try:
            topics, probs = topic_model_instance.fit_transform(docs)
            return topic_model_instance, topics
        except Exception:
            pass
            
    # ============================================================
    # ENHANCED ZERO-DEPENDENCY CLUSTERING
    # Uses bigram extraction + TF weighting to create meaningful clusters
    # ============================================================
    
    if not docs:
        return "FallbackClustering", ["General Issues"]
    
    # 1. Extract bigrams and unigrams across the entire corpus
    bigram_counts = _extract_bigrams(docs)
    
    # 2. Also extract top unigrams
    all_words = []
    for doc in docs:
        words = re.findall(r'[a-zA-Z]{3,}', doc.lower())
        all_words.extend([w for w in words if w not in STOP_WORDS and len(w) > 3])
    unigram_counts = Counter(all_words)
    
    # 3. Build candidate topic labels from top bigrams first, then unigrams
    # Bigrams make better, more specific cluster names
    topic_labels = []
    seen_roots = set()
    
    # Add top bigrams as cluster labels (min 2 occurrences)
    for bigram, count in bigram_counts.most_common(20):
        if count < 2:
            continue
        # Skip if either word in the bigram is already represented
        parts = bigram.split()
        if parts[0] in seen_roots and parts[1] in seen_roots:
            continue
        label = bigram.title()
        topic_labels.append((label, bigram, count))
        seen_roots.update(parts)
        if len(topic_labels) >= 6:
            break
    
    # Fill remaining slots with top unigrams not already covered
    for word, count in unigram_counts.most_common(30):
        if count < 2:
            continue
        if word in seen_roots:
            continue
        label = word.title()
        topic_labels.append((label, word, count))
        seen_roots.add(word)
        if len(topic_labels) >= 10:
            break
    
    if not topic_labels:
        # Ultimate fallback — create labels from the first few docs
        for i, doc in enumerate(docs[:3]):
            kws = _extract_keywords(doc, 3)
            if kws:
                label = " ".join(kws[:2]).title()
                topic_labels.append((label, " ".join(kws[:2]).lower(), 1))
    
    if not topic_labels:
        topic_labels = [("General Discussion", "general", 1)]
    
    # 4. Assign each document to the best-matching cluster
    topics = []
    for doc in docs:
        doc_lower = doc.lower()
        best_label = None
        best_score = 0
        
        for label, pattern, freq in topic_labels:
            # Score = number of pattern word matches * frequency weight
            pattern_words = pattern.split()
            match_count = sum(1 for pw in pattern_words if pw in doc_lower)
            score = match_count * (1 + freq * 0.1)
            
            if score > best_score:
                best_score = score
                best_label = label
        
        if best_label and best_score > 0:
            topics.append(best_label)
        else:
            # Assign to the least-used existing cluster to balance sizes
            label_usage = Counter(topics)
            if label_usage:
                least_used = min(topic_labels, key=lambda t: label_usage.get(t[0], 0))
                topics.append(least_used[0])
            else:
                topics.append(topic_labels[0][0])
    
    return "FallbackClustering", topics


def generate_idea_from_cluster(topic_name: str, representative_docs: list[str]) -> dict:
    """
    Generate a unique startup idea based on the cluster topic and its actual documents.
    Each call produces a contextually different result because it extracts real content
    from the representative docs to build the idea.
    """
    # Try DistilBART summarizer
    sum_pipeline = get_summarizer()
    combined_docs = " ".join(representative_docs[:3])
    problem_statement = ""
    
    if sum_pipeline and len(combined_docs) > 100:
        try:
            summary = sum_pipeline(combined_docs, max_length=50, min_length=10, do_sample=False)
            problem_statement = summary[0]['summary_text']
        except Exception:
            pass

    # ============================================================
    # DYNAMIC PROBLEM EXTRACTION from actual documents
    # ============================================================
    
    # Extract the top keywords from the cluster's documents
    cluster_keywords = []
    for doc in representative_docs[:5]:
        cluster_keywords.extend(_extract_keywords(doc, 6))
    kw_counts = Counter(cluster_keywords)
    top_kws = [w for w, _ in kw_counts.most_common(8)]
    
    # Build a unique content hash to seed randomization per cluster
    content_hash = hashlib.md5(combined_docs[:500].encode()).hexdigest()
    rng = random.Random(content_hash)
    
    # Clean topic name
    base_name = topic_name.replace(" Issues", "").replace(" Frustrations", "").strip()
    if not base_name or base_name.lower() == "general":
        base_name = top_kws[0].title() if top_kws else "Workflow"
    
    # ============================================================
    # DYNAMIC NAME GENERATION using actual keywords
    # ============================================================
    
    # Use the top 2 keywords to create a unique name
    name_kw1 = top_kws[0].title() if len(top_kws) > 0 else base_name
    name_kw2 = top_kws[1].title() if len(top_kws) > 1 else ""
    
    name_patterns = [
        f"{name_kw1}Pilot",
        f"{name_kw1}Lens",
        f"{name_kw1}Scope",
        f"{name_kw1}Dock",
        f"{name_kw1}Beam",
        f"{name_kw1}Craft",
        f"{name_kw1}Wave",
        f"{name_kw1}Axis",
        f"Re{name_kw1}",
        f"Un{name_kw1}",
        f"{name_kw1}Stack",
        f"{name_kw1}Kit",
    ]
    
    if name_kw2:
        name_patterns.extend([
            f"{name_kw1}{name_kw2}",
            f"{name_kw2}{name_kw1}",
            f"{name_kw1}x{name_kw2}",
        ])
    
    idea_name = rng.choice(name_patterns)
    
    # ============================================================
    # DYNAMIC PROBLEM STATEMENT from document content
    # ============================================================
    
    if not problem_statement:
        # Extract actual pain-signal sentences from the docs
        pain_signals = []
        pain_words = {"frustrat", "annoying", "difficult", "struggle", "pain", "broken", 
                      "slow", "expensive", "complicated", "bloat", "hate", "nightmare",
                      "terrible", "waste", "clunky", "manual", "tedious", "overwhelm"}
        
        for doc in representative_docs[:5]:
            sentences = re.split(r'[.!?]+', doc)
            for sent in sentences:
                sent = sent.strip()
                if len(sent) > 30 and any(pw in sent.lower() for pw in pain_words):
                    pain_signals.append(sent[:200])
        
        if pain_signals:
            problem_statement = rng.choice(pain_signals)
        else:
            # Fallback: use the first substantial sentence from the first doc
            for doc in representative_docs[:3]:
                sentences = re.split(r'[.!?]+', doc)
                for sent in sentences:
                    sent = sent.strip()
                    if len(sent) > 40:
                        problem_statement = sent[:200]
                        break
                if problem_statement:
                    break
    
    if not problem_statement:
        problem_statement = f"Users face significant friction with {base_name.lower()}-related workflows, leading to lost productivity and frustration."
    
    # Ensure reasonable length
    if len(problem_statement) > 200:
        problem_statement = problem_statement[:197] + "..."
    
    # ============================================================
    # DYNAMIC AUDIENCE from content keywords
    # ============================================================
    
    audience_keywords = top_kws[2:5] if len(top_kws) > 2 else [base_name.lower()]
    audience_context = ", ".join(audience_keywords)
    
    audience_templates = [
        f"People and small teams dealing with {audience_context} challenges",
        f"Everyday users frustrated by current {base_name.lower()} tools",
        f"Small businesses looking for simple {audience_context} solutions",
        f"Professionals who want an easy way to handle {base_name.lower()}",
        f"Beginners and creators managing {audience_context}",
    ]
    audience = rng.choice(audience_templates)
    
    # ============================================================
    # DYNAMIC FEATURES from content keywords
    # ============================================================
    
    feature_kws = top_kws[:6] if top_kws else [base_name.lower()]
    
    feature_pool = [
        f"• Smart {feature_kws[0]} suggestions and tips",
        f"• One-click {base_name.lower()} setup and tracking",
        f"• Easy-to-read {feature_kws[0]} dashboard",
        f"• Automatic {feature_kws[min(1, len(feature_kws)-1)]} organizer",
        f"• Shared workspace for {base_name.lower()} projects",
        f"• Helpful reminders for {feature_kws[0]} tasks",
        f"• Quick browser add-on to save {base_name.lower()}",
        f"• Connects easily with your favorite {feature_kws[min(1, len(feature_kws)-1)]} apps",
        f"• Safe and secure {base_name.lower()} storage",
        f"• Simple drag-and-drop {feature_kws[0]} builder",
    ]
    
    # Pick 3 unique features
    selected_features = rng.sample(feature_pool, min(3, len(feature_pool)))
    features = "\n".join(selected_features)
    
    # ============================================================
    # DYNAMIC REVENUE MODEL
    # ============================================================
    
    revenue_models = [
        "Free basic plan + Pro (₹499/month)",
        "Monthly subscription (₹299-₹999/month)",
        "Free tier + pay as you go (₹1 per use)",
        "Free for individuals, paid for businesses (₹1499/month)",
        "Marketplace with a small fee (2.5% per sale)",
        "Yearly pass (₹4999/year) with VIP support",
    ]
    revenue_model = rng.choice(revenue_models)
    
    idea = {
        "name": idea_name,
        "problem": problem_statement,
        "audience": audience,
        "features": features,
        "revenue_model": revenue_model
    }
        
    return idea
