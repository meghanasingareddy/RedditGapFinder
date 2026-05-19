import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';

function RightSidebar() {
  const [trending, setTrending] = useState([]);
  const [sentiment, setSentiment] = useState({ total: 0, buckets: [] });
  const [topIdeas, setTopIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        const res = await axios.get(`${CONFIG.API_BASE_URL}/api/stats`);
        const data = res.data;

        // Trending subreddits from tracked data + fallback from trends
        let subs = (data.tracked_subreddits || []).map(s => ({
          name: s.name.startsWith('r/') ? s.name : `r/${s.name}`,
          posts: formatCount(s.posts),
          growth: `+ ${s.growth_percent}%`
        }));

        // If no tracked subs, derive from trends endpoint
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
        setTrending(subs.slice(0, 4));

        // Sentiment distribution
        const dist = data.sentiment_distribution || {};
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

        // Top ideas
        setTopIdeas(data.top_ideas || []);
      } catch (err) {
        console.error('Error fetching sidebar data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSidebarData();
  }, []);

  const formatCount = (n) => {
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

  return (
    <div className="right-sidebar">
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Trending Subreddits</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', cursor: 'pointer' }}>View all</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {trending.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No tracked subreddits yet</div>
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

      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Sentiment Overview</h3>
        </div>
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: `8px solid ${sentiment.buckets[0]?.color || '#ef4444'}`, borderTopColor: sentiment.buckets[1]?.color || '#f59e0b', borderRightColor: sentiment.buckets[2]?.color || '#8b7cff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
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
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Top Startup Ideas</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', cursor: 'pointer' }}>View all</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {topIdeas.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No ideas generated yet</div>
          ) : (
            topIdeas.map((idea, idx) => (
              <div key={idx} className="panel" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>{idea.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{idea.desc}</div>
                </div>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 600 }}>
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
