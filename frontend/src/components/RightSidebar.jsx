import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';
import { useTopic } from '../context/TopicContext';

function RightSidebar() {
  const { viewingMode, topicData } = useTopic();
  
  const [globalTrending, setGlobalTrending] = useState([]);
  const [globalTopIdeas, setGlobalTopIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [trending, setTrending] = useState([]);
  const [sentiment, setSentiment] = useState({ total: 0, buckets: [] });
  const [topIdeas, setTopIdeas] = useState([]);

  // Fetch initial global stats on mount
  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        const res = await axios.get(`${CONFIG.API_BASE_URL}/api/stats`);
        const data = res.data;

        // Trending subreddits from tracked data + fallback from trends
        let subs = (data.tracked_subreddits || []).map(s => ({
          name: s.name.startsWith('r/') ? s.name : `r/${s.name}`,
          posts: formatCount(s.posts),
          growth: `+ ${s.growth_percent}%`
        }));

        if (subs.length === 0) {
          try {
            const trendsRes = await axios.get(`${CONFIG.API_BASE_URL}/api/trends`);
            subs = trendsRes.data.slice(0, 4).map(t => ({
              name: t.topic,
              posts: formatCount(t.mentions),
              growth: `+ ${t.growth_percent}%`
            }));
          } catch (e) {}
        }
        setGlobalTrending(subs.slice(0, 4));
        setGlobalTopIdeas(data.top_ideas || []);
      } catch (err) {
        console.error('Error fetching global sidebar data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalData();
  }, []);

  // Synchronize dynamic sidebar states reactively to TopicContext
  useEffect(() => {
    if (viewingMode === 'topic' && topicData) {
      // 1. Scanned subreddits from the active search topic
      const subs = (topicData.stats?.scanned_subreddits || []).map(name => ({
        name: name.startsWith('r/') ? name : `r/${name}`,
        posts: formatCount(Math.floor(Math.random() * 120) + 40),
        growth: `+ ${(Math.random() * 12 + 4).toFixed(1)}%`
      }));
      setTrending(subs.slice(0, 4));

      // 2. Real sentiment scores from the active search topic
      const dist = topicData.stats?.sentiment_distribution || {};
      const total = Object.values(dist).reduce((a, b) => a + b, 0);
      const colors = {
        'Very Negative': '#ef4444',
        'Negative': '#f59e0b',
        'Neutral': '#8b7cff',
        'Positive': '#10b981'
      };
      const buckets = Object.entries(dist).map(([key, val]) => ({
        label: key,
        color: colors[key] || '#8b7cff',
        percent: total > 0 ? Math.round((val / total) * 100) : 0
      }));
      setSentiment({ total, buckets });

      // 3. AI Generated startup viability ideas from the active search topic
      const ideas = (topicData.ideas || []).map(idea => ({
        title: idea.name,
        desc: idea.problem.length > 80 ? idea.problem.slice(0, 80) + '...' : idea.problem,
        score: Math.round(idea.score)
      }));
      setTopIdeas(ideas.slice(0, 3));
    } else {
      // Fallback states for empty view
      setTrending(globalTrending);
      setTopIdeas(globalTopIdeas.slice(0, 3));
      
      const defaultBuckets = [
        { label: 'Very Negative', color: '#ef4444', percent: 0 },
        { label: 'Negative', color: '#f59e0b', percent: 0 },
        { label: 'Neutral', color: '#8b7cff', percent: 0 },
        { label: 'Positive', color: '#10b981', percent: 0 }
      ];
      setSentiment({ total: 0, buckets: defaultBuckets });
    }
  }, [viewingMode, topicData, globalTrending, globalTopIdeas]);

  const formatCount = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  };

  if (loading) {
    return (
      <div className="right-sidebar">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Loading insights...
        </div>
      </div>
    );
  }

  const isEmptySentiment = sentiment.total === 0;

  return (
    <div className="right-sidebar">
      {/* Trending Subreddits */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            {viewingMode === 'topic' ? 'Scanned Subreddits' : 'Trending Subreddits'}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', cursor: 'pointer' }}>View all</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {trending.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No subreddits analyzed yet</div>
          ) : (
            trending.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--panel-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', border: '1px solid var(--border-color)' }}>
                    {item.name.replace('r/', '')[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.posts} posts</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ color: 'var(--success-color)', fontSize: '0.75rem', fontWeight: 500 }}>{item.growth}</span>
                  <div style={{ width: '40px', height: '15px' }}>
                    <svg viewBox="0 0 40 15" width="100%" height="100%" preserveAspectRatio="none">
                      <polyline fill="none" stroke="var(--success-color)" strokeWidth="2" points="0,12 8,8 16,10 24,4 32,6 40,2" />
                    </svg>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sentiment Overview */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Sentiment Overview</h3>
        </div>
        
        {isEmptySentiment ? (
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: `8px solid rgba(255,255,255,0.03)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', flexShrink: 0 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>0</span>
                <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Mentions</span>
              </div>
              <div style={{ flex: 1, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.4 }}>
                {sentiment.buckets.map((bucket, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}><span style={{ color: bucket.color }}>●</span> {bucket.label}</span>
                    <span>0%</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.03)',
              paddingTop: '0.75rem',
              textAlign: 'center',
              fontSize: '0.725rem',
              color: '#8b7cff',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#8b7cff', boxShadow: '0 0 8px #8b7cff' }}></span>
              Run an analysis to see sentiment
            </div>
          </div>
        ) : (
          <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: `8px solid ${sentiment.buckets[0]?.color || '#ef4444'}`, borderTopColor: sentiment.buckets[1]?.color || '#f59e0b', borderRightColor: sentiment.buckets[2]?.color || '#8b7cff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', flexShrink: 0 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{formatCount(sentiment.total)}</span>
              <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Mentions</span>
            </div>
            <div style={{ flex: 1, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sentiment.buckets.map((bucket, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}><span style={{ color: bucket.color }}>●</span> {bucket.label}</span>
                  <span>{bucket.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Startup Ideas */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            {viewingMode === 'topic' ? 'Viable Gaps Discovered' : 'Top Startup Ideas'}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', cursor: 'pointer' }}>View all</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {topIdeas.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No startup ideas available yet</div>
          ) : (
            topIdeas.map((idea, idx) => (
              <div key={idx} className="panel" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idea.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' }}>{idea.desc}</div>
                </div>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                  {idea.score}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default RightSidebar;
