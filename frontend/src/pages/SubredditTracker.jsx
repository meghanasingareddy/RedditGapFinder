import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Activity, Plus, Trash2, TrendingUp, RefreshCw } from 'lucide-react';

function SubredditTracker() {
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSub, setNewSub] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTrackers();
  }, []);

  const fetchTrackers = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/subreddits');
      setTrackers(res.data);
    } catch (err) {
      console.error('Error fetching subreddits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubreddit = async (e) => {
    e.preventDefault();
    if (!newSub.trim()) return;
    setSubmitting(true);

    try {
      // Ensure r/ prefix is handled on backend, let's pass cleanly
      const res = await axios.post('http://127.0.0.1:8000/api/subreddits', {
        subreddit: newSub.trim()
      });
      setTrackers(prev => [...prev, res.data]);
      setNewSub('');
    } catch (err) {
      console.error('Error adding subreddit:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSubreddit = async (id) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/subreddits/${id}`);
      setTrackers(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error untracking subreddit:', err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Reddit Monitoring
          </div>
          <h1 className="editorial-headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Subreddit Tracker</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configure specific subreddits to monitor. Our AI will automatically index their threads every hour.</p>
        </div>

        {/* Quick manual reload */}
        <button onClick={fetchTrackers} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
          <RefreshCw size={14} /> Sync Status
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
        {/* Main List */}
        <div className="panel" style={{ padding: '0' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Active Subreddit Webhooks</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-color)' }}></span>
              {trackers.length} Streamers Running
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading trackers...</div>
          ) : trackers.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No subreddits currently tracked. Register one on the right to start!
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 100px', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                <div>SUBREDDIT CHANNEL</div>
                <div style={{ textAlign: 'right' }}>MONTHLY MENTIONS</div>
                <div style={{ textAlign: 'right' }}>GROWTH INTENSITY</div>
                <div style={{ textAlign: 'right' }}>ACTION</div>
              </div>
              <AnimatePresence>
                {trackers.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 100px', padding: '1.25rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center', fontSize: '0.85rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'white' }}>
                      <Activity size={14} color="var(--primary-color)" />
                      {item.subreddit}
                    </div>
                    <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{item.mentions} discussions</div>
                    <div style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      <TrendingUp size={12} /> {item.growth_percent}%
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleRemoveSubreddit(item.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Configuration Sidebar Form */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Track New Channel</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Register any niche subreddit. RedditGapFinder will index daily feeds to uncover user issues and generate business ideas.
          </p>

          <form onSubmit={handleAddSubreddit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Subreddit Name</label>
              <input 
                type="text" 
                placeholder="e.g. cscareerquestions"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-color)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Plus size={16} /> {submitting ? 'Connecting...' : 'Hook Stream'}
            </button>
          </form>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>Recommended Channels:</h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['nocode', 'webdev', 'productivity', 'personalfinance'].map((tag) => (
                <span 
                  key={tag} 
                  onClick={() => setNewSub(tag)}
                  style={{ cursor: 'pointer', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                >
                  r/{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default SubredditTracker;
