import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { CONFIG } from '../config';
import { Bookmark, X, Search, Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTopic, EmptyState, CachedAnalysisBanner } from '../context/TopicContext';

function PainPoints() {
  const { activeTopicSearch, topicData } = useTopic();
  const [painPoints, setPainPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [generatedIdeas, setGeneratedIdeas] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    if (!activeTopicSearch || !topicData) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Perform local client-side sorting on the global clusters context
    const sorted = [...(topicData.clusters || [])];
    if (sortBy === 'score') {
      sorted.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));
    } else if (sortBy === 'size') {
      sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
    }
    setPainPoints(sorted);
    setLoading(false);
  }, [sortBy, topicData, activeTopicSearch]);

  const handleOpenDetails = async (point) => {
    setSelectedPoint(point);
    setModalLoading(true);
    setRelatedPosts([]);
    setGeneratedIdeas([]);

    try {
      if (topicData) {
        // Use global topicData discoveries directly (no backend database hits)
        const matchedPosts = (topicData.discoveries || []).slice(0, 3);
        setRelatedPosts(matchedPosts);

        // Filter ideas that match this cluster id from topicData.ideas
        const matched = (topicData.ideas || []).filter(idea => idea.cluster_id === point.id);
        setGeneratedIdeas(matched);
      } else {
        // Fallback to fetch from database if somehow topicData is missing
        const postsRes = await axios.get(`${CONFIG.API_BASE_URL}/api/posts?search=${point.keywords.split(',')[0]}`);
        setRelatedPosts(postsRes.data.slice(0, 3));

        const ideasRes = await axios.get(`${CONFIG.API_BASE_URL}/api/ideas`);
        const matched = ideasRes.data.filter(idea => idea.cluster_id === point.id);
        setGeneratedIdeas(matched);
      }
    } catch (err) {
      console.error('Error fetching cluster details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleBookmarkPainpoint = async (point) => {
    try {
      await axios.post(`${CONFIG.API_BASE_URL}/api/saved`, {
        item_type: 'painpoint',
        item_id: point.id,
        name: point.topic_name,
        details: `Pain point cluster size: ${point.size} posts, Viability score: ${Math.round(point.opportunity_score)}/100`
      });
      setToast({ show: true, message: `Successfully bookmarked: ${point.topic_name}` });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
    } catch (err) {
      console.error('Error saving bookmark:', err);
    }
  };

  const filteredPoints = painPoints.filter(p => 
    p.topic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.keywords.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!activeTopicSearch) {
    return <EmptyState title="Pain Point Clusters" />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="page-container"
    >
      {/* Toast Alert */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#10b981',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={16} />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Drill-Down Modal */}
      <AnimatePresence>
        {selectedPoint && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 17, 21, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', padding: '2rem' }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="panel" 
              style={{ width: '800px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}
            >
              <button 
                onClick={() => setSelectedPoint(null)}
                style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cluster Viability Breakdown</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'white', marginTop: '0.25rem', paddingRight: '2rem' }}>
                  {selectedPoint.topic_name}
                </h2>
              </div>

              {modalLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Analyzing database indexes...</span>
                </div>
              ) : (
                <div className="painpoints-details-grid" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem' }}>
                  {/* Left Column: Reddit Mentions & Ideas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Reddit mentions */}
                    <div>
                      <h4 style={{ fontSize: '0.85rem', color: 'white', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} color="#ef4444" /> Live Reddit Discussion Gaps
                      </h4>
                      {relatedPosts.length === 0 ? (
                        <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          No specific threads indexed yet. Try scanning a related subreddit!
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {relatedPosts.map((post) => (
                            <div key={post.id} style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.01)' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>{post.title}</div>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {post.selftext || 'Link posting without context text.'}
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                <span>Subreddit: <strong>{post.subreddit}</strong></span>
                                <span>Score: ↑ {post.score}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Startup Solutions mapping */}
                    <div>
                      <h4 style={{ fontSize: '0.85rem', color: 'white', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} color="var(--primary-color)" /> Matching Startup Concepts
                      </h4>
                      {generatedIdeas.length === 0 ? (
                        <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          No startup ideas mapped to this cluster yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {generatedIdeas.map((idea) => (
                            <div key={idea.id} style={{ border: '1px solid var(--primary-color)', padding: '1rem', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.03)' }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>{idea.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                <strong>Problem:</strong> {idea.problem}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Revenue: {idea.revenue_model}</span>
                                <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>Opp Score: {idea.score}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Statistics & Bookmarking */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Opportunity Index</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-color)' }}>{Math.round(selectedPoint.opportunity_score)}/100</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '0.25rem' }}>
                        <TrendingUp size={12} /> High Demand Gap
                      </div>
                    </div>

                    <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Cluster Metadata</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Total Mentions:</span>
                          <span style={{ color: 'white', fontWeight: 600 }}>{selectedPoint.size} posts</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Associated Keywords:</span>
                          <span style={{ color: 'white', fontSize: '0.75rem', background: 'var(--hover-bg)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{selectedPoint.keywords}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleBookmarkPainpoint(selectedPoint)}
                      className="btn-primary" 
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: 'auto' }}
                    >
                      <Bookmark size={16} /> Bookmark Gaps
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
        <div>
          <CachedAnalysisBanner />
          <h2 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', color: 'white' }}>AI Pain Point Clusters</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px' }}>
            We've clustered thousands of user complaints to identify the most severe problems people are facing right now.
          </p>
        </div>

        {/* Sorting & Search */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.45rem 1rem 0.45rem 2rem', background: 'var(--panel-bg)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{ background: 'var(--panel-bg)', color: 'white', border: '1px solid var(--border-color)', padding: '0.45rem 1rem', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
          >
            <option value="score">Sort by Opp Score</option>
            <option value="size">Sort by Mentions</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Structuring clusters...</span>
        </div>
      ) : filteredPoints.length === 0 ? (
        <div className="panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No pain point clusters found matching your query.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
          {filteredPoints.map((point, idx) => (
            <motion.div 
              key={point.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              whileHover={{ y: -5, borderColor: 'var(--primary-color)' }}
              onClick={() => handleOpenDetails(point)}
              className="panel"
              style={{ position: 'relative', overflow: 'hidden', borderTop: '4px solid var(--primary-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '240px' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>Active Cluster #{point.id}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Mentions: <strong>{point.size} posts</strong>
                  </span>
                </div>
                
                <h3 style={{ fontSize: '1.05rem', marginBottom: '1.5rem', lineHeight: 1.4, color: 'white', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  "{point.topic_name}"
                </h3>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sentiment</div>
                  <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem' }}>Negative</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Opp Score</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{Math.round(point.opportunity_score)}/100</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default PainPoints;
