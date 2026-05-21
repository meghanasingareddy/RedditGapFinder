import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { CONFIG } from '../config';
import { Bookmark, X, Search, Sparkles, Share2, Download, CheckCircle2, ArrowRight } from 'lucide-react';
import { useTopic, EmptyState } from '../context/TopicContext';

function StartupIdeas() {
  const { activeTopicSearch, topicData } = useTopic();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    if (!activeTopicSearch || !topicData) {
      setLoading(false);
      return;
    }
    setIdeas(topicData.ideas || []);
    setLoading(false);
  }, [activeTopicSearch, topicData]);

  const handleOpenDetails = async (idea) => {
    setSelectedIdea(idea);
    setModalLoading(true);
    setRelatedPosts([]);

    try {
      if (topicData) {
        // Retrieve matching discoveries locally without hitting backend
        const searchTerms = idea.name.split(' ')[0].toLowerCase();
        const matched = (topicData.discoveries || []).filter(post => 
          (post.title || '').toLowerCase().includes(searchTerms) ||
          (post.selftext || '').toLowerCase().includes(searchTerms)
        );
        setRelatedPosts(matched.length > 0 ? matched.slice(0, 3) : (topicData.discoveries || []).slice(0, 3));
      } else {
        // Fallback to fetch from database if somehow topicData is missing
        const searchTerms = idea.name.split(' ')[0];
        const res = await axios.get(`${CONFIG.API_BASE_URL}/api/posts?search=${searchTerms}`);
        setRelatedPosts(res.data.slice(0, 3));
      }
    } catch (err) {
      console.error('Error fetching idea contexts:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleBookmarkIdea = async (idea) => {
    try {
      await axios.post(`${CONFIG.API_BASE_URL}/api/saved`, {
        item_type: 'idea',
        item_id: idea.id,
        name: idea.name,
        details: `Viability score: ${idea.score}%, Problem: ${idea.problem}`
      });
      setToast({ show: true, message: `Idea bookmarked: ${idea.name}` });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
    } catch (err) {
      console.error('Error saving bookmark:', err);
    }
  };

  const handleExportIdea = (idea) => {
    let content = "";
    content += `==================================================\n`;
    content += `        STARTUP CONCEPT EXECUTIVE BRIEF\n`;
    content += `==================================================\n\n`;
    content += `Concept Name: ${idea.name}\n`;
    content += `Viability Score: ${idea.score}/100\n`;
    content += `Monetization Strategy: ${idea.revenue_model}\n\n`;
    content += `--------------------------------------------------\n`;
    content += `1. PROBLEM SOLVED\n`;
    content += `--------------------------------------------------\n`;
    content += `${idea.problem}\n\n`;
    content += `--------------------------------------------------\n`;
    content += `2. TARGET AUDIENCE\n`;
    content += `--------------------------------------------------\n`;
    content += `${idea.audience}\n\n`;
    content += `--------------------------------------------------\n`;
    content += `3. CORE PRODUCT SPECIFICATIONS\n`;
    content += `--------------------------------------------------\n`;
    content += `${idea.features}\n\n`;
    content += `--------------------------------------------------\n`;
    content += `4. MONETIZATION\n`;
    content += `--------------------------------------------------\n`;
    content += `${idea.revenue_model}\n`;
    content += `\n==================================================\n`;
    content += `        REDDITGAPFINDER OPPORTUNITY LABS\n`;
    content += `==================================================\n`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${idea.name.replace(/\s+/g, '_')}_Business_Concept.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareIdea = (idea) => {
    // Copy a clean share text to clipboard
    const text = `Check out this startup idea: ${idea.name} solving "${idea.problem}" with a matched score of ${idea.score}% on RedditGapFinder!`;
    navigator.clipboard.writeText(text);
    setToast({ show: true, message: `Copied share brief to clipboard!` });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const filteredIdeas = ideas.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.audience.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!activeTopicSearch) {
    return <EmptyState title="Startup Viability Ideas" />;
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

      {/* Startup Idea Detail Modal */}
      <AnimatePresence>
        {selectedIdea && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 17, 21, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', padding: '2rem' }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="panel" 
              style={{ width: '800px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}
            >
              <button 
                onClick={() => setSelectedIdea(null)}
                style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginRight: '2rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Opportunity Concept</span>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', marginTop: '0.25rem' }}>{selectedIdea.name}</h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleShareIdea(selectedIdea)} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                    <Share2 size={12} /> Share
                  </button>
                  <button onClick={() => handleExportIdea(selectedIdea)} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                    <Download size={12} /> Export Brief
                  </button>
                  <button onClick={() => handleBookmarkIdea(selectedIdea)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                    <Bookmark size={12} /> Bookmark
                  </button>
                </div>
              </div>

              {modalLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Structuring business brief...</span>
                </div>
              ) : (
                <div className="startup-ideas-modal-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                  {/* Left Column: Business specifications */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', color: 'white', marginBottom: '0.5rem', fontWeight: 600 }}>Problem Solved</h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{selectedIdea.problem}</p>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.85rem', color: 'white', marginBottom: '0.5rem', fontWeight: 600 }}>Target Audience</h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{selectedIdea.audience}</p>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.85rem', color: 'white', marginBottom: '0.5rem', fontWeight: 600 }}>Core Product Features</h4>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        {selectedIdea.features.split('\n').map((line, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '0.25rem' }}>
                            <ArrowRight size={12} color="var(--primary-color)" style={{ marginTop: '5px' }} />
                            <span>{line.replace('•', '').replace('-', '').trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Financial & Reddit conversations */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Monetization Model</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>{selectedIdea.revenue_model}</div>
                    </div>

                    <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Demand Validity Score</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>{selectedIdea.score}%</div>
                    </div>

                    {/* Associated discussions */}
                    <div>
                      <h4 style={{ fontSize: '0.75rem', color: 'white', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>User Backing Discussions</h4>
                      {relatedPosts.length === 0 ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No live context posts found.</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {relatedPosts.map((post) => (
                            <div key={post.id} style={{ fontSize: '0.75rem', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--hover-bg)' }}>
                              <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>"{post.title.substring(0, 75)}..."</div>
                              <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--primary-color)', marginTop: '2px' }}>{post.subreddit} • Score: {post.score}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', color: 'white' }}>AI Startup Idea Generator</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px' }}>
            Actionable business opportunities automatically generated by our NLP pipeline from trending Reddit pain points.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.45rem 1rem 0.45rem 2rem', background: 'var(--panel-bg)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', width: '220px' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Compiling business ideas...</span>
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No startup ideas found matching your search.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          {filteredIdeas.map((idea, idx) => (
            <motion.div 
              key={idea.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.01, borderColor: 'var(--primary-color)' }}
              onClick={() => handleOpenDetails(idea)}
              className="panel startup-ideas-item-grid"
              style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', cursor: 'pointer', background: 'linear-gradient(145deg, rgba(23, 27, 34, 0.9), rgba(15, 17, 21, 0.9))' }}
            >
              <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'inline-block', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary-color)', padding: '0.2rem 0.8rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    Match Score: {idea.score}%
                  </div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'white', fontWeight: 700 }}>{idea.name}</h3>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    <strong>Revenue Model:</strong><br/>
                    {idea.revenue_model}
                  </p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookmarkIdea(idea);
                    }}
                    className="btn-primary" 
                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  >
                    Save Concept
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h4 style={{ color: 'white', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Problem Solved</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{idea.problem}</p>
                </div>
                <div>
                  <h4 style={{ color: 'white', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Target Audience</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{idea.audience}</p>
                </div>
                <div>
                  <h4 style={{ color: 'white', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Core Features Preview</h4>
                  <ul style={{ color: 'var(--text-muted)', paddingLeft: '1.2rem', fontSize: '0.8rem', lineHeight: 1.5 }}>
                    {idea.features.split('\n').slice(0, 2).map((f, i) => (
                      <li key={i} style={{ marginBottom: '0.1rem' }}>{f.replace('•', '').replace('-', '').trim()}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default StartupIdeas;
