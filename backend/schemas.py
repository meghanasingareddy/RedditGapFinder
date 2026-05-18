from pydantic import BaseModel
from typing import List, Optional

class ConfiguredModel(BaseModel):
    class Config:
        orm_mode = True
        from_attributes = True

class PostBase(ConfiguredModel):
    id: str
    subreddit: str
    title: str
    selftext: Optional[str] = None
    url: str
    score: int
    created_utc: float

class CommentBase(ConfiguredModel):
    id: str
    post_id: str
    body: str
    score: int
    sentiment_score: float

class ClusterBase(ConfiguredModel):
    id: int
    topic_name: str
    keywords: str
    size: int
    opportunity_score: float

class IdeaBase(ConfiguredModel):
    id: int
    cluster_id: int
    name: str
    problem: str
    audience: str
    features: str
    revenue_model: str
    score: Optional[int] = 85

class TrendBase(ConfiguredModel):
    id: int
    topic: str
    growth_percent: float
    mentions: int

class CompetitorBase(ConfiguredModel):
    id: int
    name: str
    mentions: int
    frustrations: str

class SavedItemBase(ConfiguredModel):
    id: int
    item_type: str
    item_id: int
    saved_at: float
    name: str
    details: str

class SavedItemCreate(BaseModel):
    item_type: str
    item_id: int
    name: str
    details: str

class ReportBase(ConfiguredModel):
    id: int
    name: str
    created_at: float
    data: str

class ReportCreate(BaseModel):
    name: str
    data: str

class SubredditTrackerBase(ConfiguredModel):
    id: int
    subreddit: str
    is_active: int
    growth_percent: float
    mentions: int

class SubredditTrackerCreate(BaseModel):
    subreddit: str
    growth_percent: Optional[float] = 0.0
    mentions: Optional[int] = 0
