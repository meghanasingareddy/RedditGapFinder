"""
ai_analyzer.py — Free AI-powered analysis using Google Gemini Flash.

Gemini 1.5 Flash free tier: 15 requests/min, 1M tokens/day — plenty for this app.
Get your free API key at: https://aistudio.google.com/app/apikey
"""
import os
import json
import re

# Load .env for local dev
def _load_env():
    for path in [".env", "../.env", "backend/.env"]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            except Exception:
                pass
_load_env()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
_gemini_model = None

def _get_model():
    global _gemini_model
    if _gemini_model:
        return _gemini_model
    if not GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel("gemini-1.5-flash")
        print("[AI] Gemini Flash model loaded ✓")
        return _gemini_model
    except Exception as e:
        print(f"[AI] Failed to load Gemini: {e}")
        return None

def is_ai_available() -> bool:
    return bool(GEMINI_API_KEY)

def _call_gemini(prompt: str, temperature: float = 0.4) -> str:
    """Call Gemini and return raw text response."""
    model = _get_model()
    if not model:
        return ""
    try:
        import google.generativeai as genai
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=1024,
            )
        )
        return response.text.strip()
    except Exception as e:
        print(f"[AI] Gemini call failed: {e}")
        return ""

def discover_subreddits(topic: str, limit: int = 10) -> list[str]:
    """
    Use Gemini to intelligently discover the most relevant subreddits for any topic.
    Works for niche topics like 'Boutique', 'Sourdough Bakery', 'Pet Grooming', etc.
    """
    if not is_ai_available():
        return []

    prompt = f"""You are a Reddit expert. I need to find real Reddit communities that discuss "{topic}".

List the {limit} most relevant and active subreddits where people genuinely discuss pain points, problems, frustrations, and business opportunities related to "{topic}".

Rules:
- Only list REAL subreddits that actually exist on Reddit
- Focus on communities where people share problems, ask for help, or discuss business opportunities
- Include both niche-specific and broader related communities
- Do NOT include adult/NSFW communities
- Do NOT add "r/" prefix

Return ONLY a JSON array of subreddit names, nothing else. Example:
["Entrepreneur", "smallbusiness", "startups"]

Subreddits for "{topic}":"""

    raw = _call_gemini(prompt, temperature=0.3)
    if not raw:
        return []

    # Extract JSON array from response
    try:
        # Find the JSON array in the response
        match = re.search(r'\[.*?\]', raw, re.DOTALL)
        if match:
            subs = json.loads(match.group())
            # Clean and validate
            cleaned = []
            for s in subs:
                if isinstance(s, str):
                    s = s.strip().lstrip("r/").strip()
                    if s and len(s) > 1 and " " not in s:
                        cleaned.append(s)
            print(f"[AI] Discovered {len(cleaned)} subreddits for '{topic}': {cleaned}")
            return cleaned[:limit]
    except Exception as e:
        print(f"[AI] Subreddit parse error: {e} — raw: {raw[:200]}")

    return []

def generate_startup_ideas(topic: str, posts: list[dict], num_ideas: int = 5) -> list[dict]:
    """
    Use Gemini to analyze real Reddit posts and generate genuine startup ideas.
    Returns structured ideas based on actual pain points found in the posts.
    """
    if not is_ai_available() or not posts:
        return []

    # Build a concise digest of the posts for Gemini
    post_digest = []
    for i, p in enumerate(posts[:20]):  # limit to 20 posts
        title = p.get("title", "")
        body = p.get("selftext", "")[:300]
        score = p.get("score", 0)
        text = f"[Post {i+1}] (upvotes: {score}) {title}"
        if body:
            text += f" — {body}"
        post_digest.append(text)

    posts_text = "\n".join(post_digest)

    prompt = f"""You are a creative startup advisor. Analyze these real Reddit posts about "{topic}" and identify genuine market gaps and opportunities.

REAL REDDIT POSTS:
{posts_text}

Based on these posts, brainstorm {num_ideas} specific, highly engaging startup ideas or side-hustles that solve REAL problems mentioned by these users.

Make the language conversational, exciting, and easy to understand for normal humans (avoid boring corporate jargon). Be highly creative!

For each idea, return a JSON object with these exact fields:
- "name": A catchy, fun product name (1-2 words)
- "problem": The specific pain point explained in a relatable, human way (e.g. "People are sick of...")
- "audience": Who exactly would love this (e.g. "Busy moms who...")
- "features": 3 killer features that actually sound useful (bullet points starting with •)
- "revenue_model": How it makes money (e.g. "$5/mo subscription because it saves them hours")
- "score": opportunity score 60-99 based on how much people need this

Return ONLY a valid JSON array of {num_ideas} objects. No markdown, no explanation.

Example format:
[{{"name": "AppName", "problem": "...", "audience": "...", "features": "• Feature 1\\n• Feature 2\\n• Feature 3", "revenue_model": "...", "score": 85}}]"""

    raw = _call_gemini(prompt, temperature=0.7)
    if not raw:
        return []

    try:
        # Strip markdown code fences if present
        raw = re.sub(r'```(?:json)?', '', raw).strip('` \n')
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if match:
            ideas = json.loads(match.group())
            print(f"[AI] Generated {len(ideas)} startup ideas for '{topic}'")
            return ideas
    except Exception as e:
        print(f"[AI] Ideas parse error: {e} — raw: {raw[:300]}")

    return []

def generate_cluster_names(topic: str, posts: list[dict]) -> list[dict]:
    """
    Use Gemini to identify meaningful problem clusters/themes from Reddit posts.
    Returns a list of clusters with proper names and keywords.
    """
    if not is_ai_available() or not posts:
        return []

    titles = [p.get("title", "") for p in posts[:25]]
    titles_text = "\n".join(f"- {t}" for t in titles if t)

    prompt = f"""Analyze these Reddit post titles about "{topic}" and group them into 3-5 meaningful problem themes/clusters.

POST TITLES:
{titles_text}

Return ONLY a JSON array where each object has:
- "topic_name": 2-3 word descriptive name for the theme (e.g. "Price Sensitivity", "Learning Curve")
- "keywords": 3-5 comma-separated keywords representing this cluster
- "description": one sentence describing what problem this cluster represents

Return ONLY valid JSON, no explanation:
[{{"topic_name": "...", "keywords": "...", "description": "..."}}]"""

    raw = _call_gemini(prompt, temperature=0.3)
    if not raw:
        return []

    try:
        raw = re.sub(r'```(?:json)?', '', raw).strip('` \n')
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if match:
            clusters = json.loads(match.group())
            print(f"[AI] Generated {len(clusters)} clusters for '{topic}'")
            return clusters
    except Exception as e:
        print(f"[AI] Cluster parse error: {e}")

    return []
