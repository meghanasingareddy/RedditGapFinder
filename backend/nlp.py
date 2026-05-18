import re
import random

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

def cluster_texts(docs: list[str]):
    # Try BERTopic
    topic_model_instance = get_topic_model()
    if topic_model_instance:
        try:
            topics, probs = topic_model_instance.fit_transform(docs)
            return topic_model_instance, topics
        except Exception:
            pass
            
    # Zero-dependency simple keyword clustering
    signatures = {
        "Career & Internships": ["intern", "job", "resume", "apply", "career", "interview", "hiring"],
        "SaaS Billing & Pricing": ["saas", "subscription", "price", "billing", "pay", "charge", "expensive"],
        "Productivity & Bloat": ["jira", "tool", "bloat", "slow", "complex", "clunky", "interface", "linear"],
        "Founder Burnout": ["founder", "burnout", "exhausted", "manual", "marketing", "scaling", "solo"],
        "Personal Finance Automation": ["budget", "finance", "track", "expense", "sms", "whatsapp", "automated"],
        "Marketing & Leads Outreach": ["market", "sale", "lead", "email", "cold", "outreach", "ads", "seo"],
        "Design Systems & UX": ["design", "figma", "ui", "ux", "graphic", "illustration"],
        "Educational Platforms": ["education", "study", "college", "school", "student", "course", "lms"]
    }
    
    topics = []
    for doc in docs:
        doc_lower = doc.lower()
        matched = "General Frustration"
        max_matches = 0
        for name, keywords in signatures.items():
            matches = sum(1 for kw in keywords if kw in doc_lower)
            if matches > max_matches:
                max_matches = matches
                matched = name
        topics.append(matched)
        
    return "FallbackClustering", topics

def generate_idea_from_cluster(topic_name: str, representative_docs: list[str]) -> dict:
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
            
    if not problem_statement:
        problem_statement = representative_docs[0] if representative_docs else "Users experiencing high friction in this area."
        if len(problem_statement) > 150:
            problem_statement = problem_statement[:147] + "..."
            
    # Map topics to specific, realistic startup templates
    templates = {
        "Career & Internships": {
            "name": "SkillMatch AI",
            "problem": "Job seekers face a competitive black hole where ATS filters reject customized resumes, making applications feel useless.",
            "audience": "New grads, CS career switchers, active job hunters",
            "features": "• ATS matching rating\n• AI-assisted bullet point optimization\n• Direct routing to hiring managers",
            "revenue_model": "Freemium ($9/mo for priority matches)"
        },
        "SaaS Billing & Pricing": {
            "name": "SaaS Pricing Radar",
            "problem": "Small businesses and bootstrappers suffer from subscription fatigue and billing spikes due to double-paying and active license waste.",
            "audience": "Founders, digital agencies, freelancers",
            "features": "• Browser extension checkout detector\n• Unified team license utilization audit\n• Renewal date smart push alerts",
            "revenue_model": "SaaS ($12/mo flat per company)"
        },
        "Productivity & Bloat": {
            "name": "SimpleSprint",
            "problem": "Productivity suites like Jira and Notion are slow, confusing, and cluttered, leading to abandoned tasks and poor team alignment.",
            "audience": "Indie developer teams, startup crews",
            "features": "• Single-click ticket creation\n• Automatic Slack/Discord webhook updates\n• Config-free velocity and burndown grids",
            "revenue_model": "Flat $19/mo per workspace"
        },
        "Founder Burnout": {
            "name": "SoloFlow",
            "problem": "Solo founders waste 70% of their day on tedious operational work like manual social publishing, email follow-ups, and active scraping.",
            "audience": "Solopreneurs, side-hustlers, creators",
            "features": "• Cross-channel marketing queue parser\n• Smart auto-responding CRM lead triggers\n• Weekly time-saved scorecard",
            "revenue_model": "Subscription ($15/mo)"
        },
        "Personal Finance Automation": {
            "name": "TextLedger",
            "problem": "Budget tracking is too complex, leading to app abandonment when users must sync bank accounts or manually key database forms.",
            "audience": "Young professionals, gig workers, students",
            "features": "• Instant WhatsApp/SMS text ledger logging\n• Automatic categorical sorting via rule dictionary\n• Sunday SMS summaries",
            "revenue_model": "Free 14-day trial, then $4/mo"
        },
        "Marketing & Leads Outreach": {
            "name": "LeadPulse",
            "problem": "Small business sales crews spend hours manually writing personalized cold outreach, warming domains, and getting blacklisted by spam filters.",
            "audience": "Growth marketers, B2B sales teams, agency owners",
            "features": "• Automated domain warming\n• AI email personalization sequences\n• Real-time sender blacklists monitoring",
            "revenue_model": "SaaS ($29/mo usage-tier model)"
        },
        "Design Systems & UX": {
            "name": "FigmaFlow",
            "problem": "Design handoffs suffer from style package drift, broken CSS margins, and manual styling redos due to absolute frame outputs.",
            "audience": "Frontend developers, UI/UX designers, digital agencies",
            "features": "• Figma components to clean CSS classes export\n• Variable margins and grid layout linting\n• Instant auto-layout compiler",
            "revenue_model": "Standard seat SaaS ($19/mo)"
        },
        "Educational Platforms": {
            "name": "StudyBuddy AI",
            "problem": "College students find standard Canvas/Blackboard interfaces sluggish, cluttered, and disconnected from calendar study groups.",
            "audience": "Active students, course takers, study circles",
            "features": "• Canvas dashboard task dates sync\n• Integrated group flashcards study lobby\n• Custom exam study plan timeline generator",
            "revenue_model": "Freemium ($5/mo study plan generation)"
        }
    }
    
    # Match or fallback
    idea = templates.get(topic_name)
    if not idea:
        # Create a dynamic custom template if query was matched in search explorer
        idea = {
            "name": f"{topic_name.split(' ')[0]} Antidote",
            "problem": problem_statement,
            "audience": "Consumers seeking a fast, lightweight dashboard solving this specific workflow friction.",
            "features": "• Single-click automated task setup\n• Direct webhook Slack updates\n• Config-free velocity and burndown summaries",
            "revenue_model": "Freemium ($29/month usage-based model)"
        }
        
    return idea
