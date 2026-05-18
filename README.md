# RedditGapFinder

Discover startup ideas from real Reddit frustrations.

RedditGapFinder is an AI-powered, full-stack SaaS platform designed to scan massive amounts of Reddit discussions to discover unmet needs, product gaps, and highly-lucrative business opportunities. By analyzing user sentiment and clustering recurring complaints, it acts as a crystal ball for your next big startup idea.

## Features

- **AI Pain Point Cards:** Discover beautifully organized insight cards showing user complaints, trend directions, and sentiment scores.
- **AI Startup Idea Generator:** Transforms recurring user problems into actionable startup ideas complete with revenue models and features.
- **Trend Visualization Dashboard:** Live interactive charts tracking complaint volume against opportunity scores.
- **Search Explorer:** Query our AI to find specific market gaps (e.g., "What do developers complain about the most?").
- **100% Free NLP Stack:** Utilizes local, open-source models including SentenceTransformers (all-MiniLM-L6-v2) for semantic representations, BERTopic for clustering, vaderSentiment for polarity analysis, and HuggingFace pipelines (sshleifer/distilbart-cnn-12-6) for abstractive summarization.
- **Mock-Fallback Sandbox Mode:** Run the application immediately without Reddit API keys or heavy Python machine learning dependencies. The app seamlessly falls back to pre-seeded SQLite databases and smart contextual data generators.

## Project Structure

The project is split into a React frontend and a FastAPI backend:

```
RedditGapFinder/
├── backend/
│   ├── main.py              # FastAPI server exposing analytical endpoints
│   ├── database.py          # SQLite engine and automated data seeding pipeline
│   ├── models.py            # SQLAlchemy database models (Clusters, Ideas, Trends, etc.)
│   ├── schemas.py           # Pydantic schemas for data validation
│   ├── scraper.py           # PRAW scraper and contextual sandbox fallback simulator
│   ├── nlp.py               # Local HuggingFace engines and zero-dependency NLP fallbacks
│   └── requirements.txt     # Backend dependencies list
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── LeftSidebar.jsx    # Glassmorphic application navigation sidebar
    │   │   ├── RightSidebar.jsx   # Quick action drawer for bookmarks and notifications
    │   │   └── TopNavbar.jsx      # Global search and live API connection status bar
    │   ├── pages/
    │   │   ├── LandingPage.jsx    # Premium high-converting landing page
    │   │   ├── Dashboard.jsx      # Navigation layout wrapping dashboard views
    │   │   ├── Overview.jsx       # Interactive metric charts and system statistics
    │   │   ├── PainPoints.jsx     # Clustered complaints, size, and opportunity scores
    │   │   ├── StartupIdeas.jsx   # Mapped startup templates with monetization strategies
    │   │   ├── Trends.jsx         # Subreddit volume tracking and growth vectors
    │   │   ├── SubredditTracker.jsx # Custom target list management
    │   │   ├── Competitors.jsx    # Existing solutions and recorded customer friction
    │   │   ├── SearchExplorer.jsx # Natural language semantic query pipeline
    │   │   ├── Reports.jsx        # PDF-like dynamic executive summary documents
    │   │   └── Saved.jsx          # Bookmarks dashboard
    │   ├── App.jsx          # Routing configuration
    │   └── main.jsx         # Application bootstrapper
    ├── package.json         # Frontend configuration
    └── vite.config.js       # Vite bundler parameters
```

## Backend Pipeline Architecture

### 1. Database & Seeding Pipeline (database.py, models.py)
Uses SQLAlchemy to configure a SQLite database. On application boot, it dynamically seeds initial records into the following models:
- **SubredditTracker:** Tracks subreddits such as r/cscareerquestions, r/SaaS, and r/productivity.
- **Competitor:** Records existing solutions like Notion, LinkedIn, and Jira and their documented customer complaints.
- **Trend:** Monitors micro-trends like "SaaS Subscription Fatigue" or "Solo Founder Burnout".
- **Cluster:** Stores categorized customer complaints along with computed Opportunity Scores (computed using a combination of average sentiment and cluster volume).
- **Idea:** Holds startup models with target audience, key features, and monetization models mapped to each pain-point cluster.
- **Post & Comment:** Caches crawled text blocks and polarity metrics.

### 2. Natural Language Processing (nlp.py)
Features a dual-mode NLP pipeline that detects installed libraries and swaps engines automatically:
- **Semantic Representation:** Employs sentence-transformers (all-MiniLM-L6-v2) for generating sentence embeddings.
- **Topic Clustering:** Utilizes BERTopic for automated text categorization. Fallback: A zero-dependency keyword matcher using pre-configured categories.
- **Sentiment Analysis:** Utilizes vaderSentiment for polarity calculation. Fallback: A zero-dependency rule-based lexical scorer matching positive and negative word occurrences.
- **Summarization:** Employs transformers summarization pipelines (sshleifer/distilbart-cnn-12-6) for abstracting long customer complaints. Fallback: Sentence truncation with contextual template generation.

### 3. PRAW Scraper & Sandbox Simulator (scraper.py)
Crawls Reddit using the official PRAW client if API credentials exist. If credentials are missing or standard API calls fail:
- Automatically activates mock-fallback sandbox mode.
- Context-specifically simulates new subreddit posts and comment threads matching the theme of the target category.

### 4. FastAPI Gateway (main.py)
Exposes the following endpoints:
- GET /api/status: Returns server health, active mode (mock vs live), and Reddit configuration state.
- GET /api/posts: Searches and retrieves scraped Reddit posts.
- GET /api/comments/{post_id}: Retrieves cached comments or triggers dynamic contextual crawls.
- POST /api/scan: Performs semantic scraper loops, NLP classifications, and populates clusters/startup ideas.
- POST /api/analyze: Processes query arguments through the semantic search explorer.
- GET /api/painpoints: Retrieves pain point clusters sorted by opportunity score or size.
- GET /api/ideas: Retrieves generated startup templates.
- GET /api/trends: Exposes market growth trend vectors.
- GET /api/competitors: Exposes seeded competitor profiles and complaints.
- GET /api/reports: Retrives dynamic analytical digests.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python (3.10 or higher)

### 1. Run the Backend

Navigate to the backend directory and launch the server:

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The FastAPI backend will start on http://127.0.0.1:8000. You can inspect endpoints using the interactive Swagger documentation at http://127.0.0.1:8000/docs.

### 2. Run the Frontend

Open a new terminal window, navigate to the frontend directory, install dependencies, and launch the development server:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server will run locally (typically at http://localhost:5173). Open this URL in your web browser to interact with the RedditGapFinder dashboard.

## Environment Configuration

To enable live Reddit scraping, create a .env file inside the backend/ directory:

```env
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=RedditGapFinder/1.0
```

If these keys are left empty or omitted, the application will proceed to run successfully using the robust, context-aware mock-fallback simulator.

## Design System

Designed to look like an investor-ready SaaS platform:
- Deep dark theme matching the slate palettes of premium products.
- Blur-based glassmorphism panels using backdrop filters.
- Subtle pulsing CSS animations indicating active states and network status.
- Fully responsive interface utilizing smooth layouts and flexible typography.
