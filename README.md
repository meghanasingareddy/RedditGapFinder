<h2 align="center">
  <code>RedditGapFinder</code>
</h2>

<p align="center">
  <img src="frontend/src/assets/logo.svg" alt="RedditGapFinder Logo" width="120" />
</p>

<p align="center">
  <strong>Find real problems people want solved.</strong>
</p>

<p align="center">
  <a href="https://frontend-xi-taupe-49.vercel.app"><img src="https://img.shields.io/badge/Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo"></a>
  <a href="https://github.com/meghanasingareddy/RedditGapFinder"><img src="https://img.shields.io/github/stars/meghanasingareddy/RedditGapFinder?style=for-the-badge&logo=github&color=181717" alt="GitHub Stars"></a>
</p>

---

RedditGapFinder is an AI-powered, full-stack market-research and SaaS discovery platform. It scans Reddit discussions in real-time to locate unmet needs, product gaps, and lucrative business opportunities. By parsing user frustrations and clustering recurring complaints, it acts as a crystal ball for your next startup idea.

## Features

**Topic Search (Any Topic)**
Query ANY topic, niche, or custom query (e.g., "sustainable fashion", "web3 gaming") to discover relevant subreddits and analyze real-time discussions.

**4 Analysis Depths**
Tailor your market scanning from lightweight lookups to thorough intelligence gathering:
- Quick Insight: Fast scan (4 subreddits, 3 posts each)
- Standard Analysis: Balanced lookup (8 subreddits, 8 posts each)
- Deep Research: Detailed crawl (15 subreddits, 8 posts each)
- Market Intelligence: Comprehensive intelligence (20 subreddits, 8 posts each)

**Credential-Free RSS Scraping**
Scrapes and processes subreddit discussions using clean, asynchronous XML RSS/Atom feed parser pipelines — no official Reddit Developer API keys or PRAW accounts required.

**My Analyses (Persistent History)**
Save and manage up to 50 topic analyses locally in the browser. Features include:
- Instant toggle / switching between past analyses
- Relative timestamps ("2 hours ago") and depth badges
- In-sidebar renaming, exporting as JSON, and deleting items

**AI Pain Point Cards**
Discover organized frustration cards showing user complaints, trend directions, and calculated Opportunity Scores.

**AI Startup Idea Generator**
Transforms recurring customer complaints into actionable startup blueprints containing revenue models and MVP features.

**Trend Visualization Dashboard**
Live interactive charts tracking category complaint volume against calculated opportunities.

**Search Explorer**
Query compiled datasets with natural language to find specific market gaps (e.g., "What do developers complain about the most?").

## Built With

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** FastAPI (Python)
- **NLP:** SentenceTransformers, BERTopic, VADER
- **Deployment:** Vercel (frontend) + Render (backend)

## Project Structure

The project is split into a React frontend and a FastAPI backend:

```
RedditGapFinder/
├── backend/
│   ├── main.py              # FastAPI gateway server and endpoints
│   ├── database.py          # SQLite database configuration and initial seeding
│   ├── models.py            # SQLAlchemy database schemas (Clusters, Ideas, Trends)
│   ├── schemas.py           # Pydantic schemas for request validation
│   ├── scraper.py           # Asynchronous XML RSS/Atom feed crawler & parser
│   ├── topic_search.py      # Subreddit query searcher & ValueError validator
│   ├── nlp.py               # Local keyword semantic analysis and clustering fallbacks
│   └── requirements.txt     # Python backend dependencies
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── LeftSidebar.jsx    # Glassmorphic sidebar navigation & My Analyses list
    │   │   ├── RightSidebar.jsx   # Quick action drawer for bookmarks and notifications
    │   │   └── TopicSearch.jsx    # Search input widget with mobile-friendly dropdown
    │   ├── context/
    │   │   └── TopicContext.jsx   # Global React context, history, and LocalStorage sync
    │   ├── pages/
    │   │   ├── LandingPage.jsx    # High-converting landing page
    │   │   ├── Overview.jsx       # Main search dashboard and statistics
    │   │   ├── PainPoints.jsx     # Clustered complaints & Opportunity Scores
    │   │   ├── StartupIdeas.jsx   # Actionable startup ideas & blueprints
    │   │   ├── Trends.jsx         # Category volume tracking & growth charts
    │   │   ├── SubredditTracker.jsx # Custom tracked subreddits
    │   │   ├── Competitors.jsx    # Existing solutions and customer friction
    │   │   └── Saved.jsx          # Bookmarked cards dashboard
    │   └── App.jsx          # Application routing & Protected Route walls
```

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python (3.10 or higher)

### 1. Run the Backend

Navigate to the backend directory, set up your environment, and launch the server:

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The FastAPI backend will start on `http://127.0.0.1:8000`. You can inspect all endpoints using the interactive Swagger documentation at `http://127.0.0.1:8000/docs`.

### 2. Run the Frontend

Open a new terminal window, navigate to the frontend directory, install dependencies, and launch the development server:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server will run locally (typically at `http://localhost:5173`). Open this URL in your web browser to interact with the RedditGapFinder dashboard.

---

## Environment Configuration

By default, the application runs entirely **credential-free** out of the box. Subreddit scanning operates seamlessly using direct Reddit RSS/Atom XML feeds.

If you wish to configure optional credentials or override behavior, you can create a `.env` file inside the `backend/` directory:

```env
# Optional credentials or custom user-agents
USER_AGENT=RedditGapFinder/1.0
FORCE_MOCK_DATA=false
```

---

## Design System

Designed to look like an investor-ready SaaS platform:
- **Premium Dark Mode:** Slate and charcoal color schemes accented with vibrant glassmorphic gradients.
- **Micro-Animations:** Fluid transitions powered by Framer Motion and smooth CSS transitions.
- **Glassmorphism:** Elegant panels overlaying soft backgrounds with backdrop filtering.
- **Responsive Layout:** Optimized and scroll-corrected layout from large monitors to mobile viewports.
