import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, AlertCircle, Lightbulb, TrendingUp, Search, FileText, Bookmark, Eye, Activity, LogOut, Lock, LogIn, X, Trash2, Edit3, Download, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { CONFIG } from '../config';
import Logo from './Logo';
import { useTopic, getRelativeTime } from '../context/TopicContext';

function LeftSidebar({ isOpen, onClose, isMobile }) {
  const { user, logout, loginWithGoogle } = useAuth();
  const [liveSubs, setLiveSubs] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const { 
    history, 
    activeTopicId, 
    selectAnalysis, 
    deleteAnalysis, 
    clearAllHistory, 
    renameAnalysis,
    setPendingTopicTrigger
  } = useTopic();

  const [historySearch, setHistorySearch] = useState('');
  const [trendingCollapsed, setTrendingCollapsed] = useState(true);

  const dashboardPaths = ['/', '/pain-points', '/ideas', '/trends', '/competitors'];

  const handleSelectHistory = (id) => {
    selectAnalysis(id);
    if (!dashboardPaths.includes(location.pathname)) {
      navigate('/');
    }
  };

  const handleExportJson = (e, item) => {
    e.stopPropagation();
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `gapfinder_analysis_${item.topic.replace(/\s+/g, '_').toLowerCase()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Failed to export analysis:", err);
    }
  };

  const handleRename = (e, item) => {
    e.stopPropagation();
    const newName = prompt(`Rename "${item.topic}" analysis:`, item.topic);
    if (newName && newName.trim() && newName.trim() !== item.topic) {
      renameAnalysis(item.id, newName);
    }
  };

  const handleDelete = (e, item) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete the analysis for "${item.topic}"?`)) {
      deleteAnalysis(item.id);
    }
  };

  const filteredHistory = (history || []).filter(h => 
    h.topic.toLowerCase().includes(historySearch.toLowerCase())
  );

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const res = await axios.get(`${CONFIG.API_BASE_URL}/api/stats`);
        const subs = (res.data.tracked_subreddits || []).slice(0, 3).map(s => ({
          name: s.name.startsWith('r/') ? s.name : `r/${s.name}`,
          posts: s.posts
        }));
        setLiveSubs(subs);
      } catch (e) {
        // Fallback: try to get from subreddits endpoint
        try {
          const res = await axios.get(`${CONFIG.API_BASE_URL}/api/subreddits`);
          setLiveSubs(res.data.slice(0, 3).map(s => ({
            name: s.subreddit,
            posts: s.mentions || 0
          })));
        } catch (e2) {}
      }
    };
    fetchLiveData();
  }, []);

  // Pages that require authentication
  const protectedPaths = ['/search', '/reports', '/saved', '/subreddits'];

  const renderNavLink = (to, icon, label) => {
    const isProtected = protectedPaths.includes(to);
    const showLock = isProtected && !user;

    return (
      <NavLink 
        to={to} 
        onClick={onClose}
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
      >
        {icon}
        <span style={{ flex: 1 }}>{label}</span>
        {showLock && (
          <Lock size={12} style={{ opacity: 0.4, marginLeft: 'auto' }} />
        )}
      </NavLink>
    );
  };

  return (
    <div className={`left-sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div style={{ marginBottom: '2rem', paddingLeft: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size={28} />
        {isMobile && (
          <button 
            onClick={onClose}
            className="mobile-menu-close"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-title">Main</div>
        {renderNavLink('/', <Home size={16} />, 'Overview')}
        {renderNavLink('/pain-points', <AlertCircle size={16} />, 'Pain Points')}
        {renderNavLink('/ideas', <Lightbulb size={16} />, 'Startup Ideas')}
        {renderNavLink('/trends', <TrendingUp size={16} />, 'Trends')}
        {renderNavLink('/search', <Search size={16} />, 'Search Explorer')}
        {renderNavLink('/reports', <FileText size={16} />, 'Reports')}
        {renderNavLink('/saved', <Bookmark size={16} />, 'Saved')}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-title">Monitoring</div>
        {renderNavLink('/competitors', <Eye size={16} />, 'Competitors')}
        {renderNavLink('/subreddits', <Activity size={16} />, 'Subreddit Tracker')}
      </div>

      {/* Collapsible Trending Topics */}
      <div className="sidebar-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <div 
          className="sidebar-title" 
          onClick={() => setTrendingCollapsed(!trendingCollapsed)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', marginBottom: '0.25rem' }}
        >
          <span>Trending Topics</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#8b7cff', opacity: 0.8 }}>
            {trendingCollapsed ? 'Expand' : 'Collapse'}
          </span>
        </div>
        
        {!trendingCollapsed && (
          <div style={{
            maxHeight: '180px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            paddingRight: '4px'
          }} className="custom-scrollbar">
            {TRENDING_TOPICS.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setPendingTopicTrigger({ topic: item, ts: Date.now() });
                  navigate('/');
                  onClose?.();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.725rem',
                  color: 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
                className="trending-sidebar-item"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <TrendingUp size={11} color="#8b7cff" style={{ opacity: 0.7 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <div className="sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <span>My Analyses</span>
          {history.length > 0 && (
            <button 
              onClick={() => {
                if (confirm("Are you sure you want to clear all history? This will delete all cached analyses from local storage.")) {
                  clearAllHistory();
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.65rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 4px',
                transition: 'opacity 0.2s',
                opacity: 0.7
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
            >
              Clear All
            </button>
          )}
        </div>

        {/* History Search Bar if history is long */}
        {history.length > 2 && (
          <div style={{ position: 'relative', marginBottom: '0.5rem', padding: '0 0.25rem' }}>
            <Search size={11} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder="Search history..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px 4px 22px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
                fontSize: '0.7rem',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        <div style={{
          maxHeight: '180px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          paddingRight: '4px'
        }} className="custom-scrollbar">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => {
              const isActive = item.id === activeTopicId;
              const formattedDepth = {
                quick: 'Quick',
                quick_insight: 'Quick',
                standard: 'Standard',
                standard_analysis: 'Standard',
                deep: 'Deep',
                deep_research: 'Deep',
                market: 'Market',
                market_intelligence: 'Market'
              }[item.depth] || 'Standard';

              const depthColors = {
                Quick: { bg: 'rgba(139, 124, 255, 0.1)', color: '#8b7cff' },
                Standard: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
                Deep: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
                Market: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }
              }[formattedDepth] || { bg: 'rgba(255,255,255,0.05)', color: '#ccc' };

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectHistory(item.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(139, 124, 255, 0.08)' : 'transparent',
                    border: '1px solid',
                    borderColor: isActive ? 'rgba(139, 124, 255, 0.2)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  className="history-item-row"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      <Database size={11} color={isActive ? '#8b7cff' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#fff' : 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.topic}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      padding: '1px 5px',
                      borderRadius: '3px',
                      background: depthColors.bg,
                      color: depthColors.color,
                      marginLeft: '6px',
                      flexShrink: 0
                    }}>
                      {formattedDepth}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                      {getRelativeTime(item.timestamp)}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        title="Rename analysis"
                        onClick={(e) => handleRename(e, item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          padding: '2px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px',
                          transition: 'color 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Edit3 size={10} />
                      </button>
                      <button
                        title="Export JSON payload"
                        onClick={(e) => handleExportJson(e, item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          padding: '2px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px',
                          transition: 'color 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-color)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Download size={10} />
                      </button>
                      <button
                        title="Delete analysis"
                        onClick={(e) => handleDelete(e, item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          padding: '2px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px',
                          transition: 'color 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '8px 4px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: '6px' }}>
              {historySearch ? "No matches found" : "No analyses saved yet"}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div className="sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Live Scanning
          <span style={{ color: 'var(--success-color)', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-color)' }}></span>
            Active
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
          {liveSubs.length > 0 ? liveSubs.map((sub, idx) => (
            <div key={idx} style={{ marginBottom: idx < liveSubs.length - 1 ? '0.5rem' : 0 }}>
              <span style={{ color: 'var(--text-main)' }}>{sub.name}</span><br/>
              {sub.posts.toLocaleString()} new posts
            </div>
          )) : (
            <div style={{ color: 'var(--text-muted)' }}>No active scans</div>
          )}
        </div>

        {/* Google User Profile Card or Sign In CTA */}
        {user ? (
          <div style={{
            marginTop: '1.5rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            position: 'relative'
          }}>
            <img 
              src={user.photoURL || 'https://via.placeholder.com/32'} 
              alt={user.displayName || 'User'} 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user.displayName || 'Active Member'}
              </div>
              <div style={{ 
                fontSize: '0.65rem', 
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user.email}
              </div>
            </div>
            <button 
              onClick={logout}
              title="Sign Out"
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div style={{
            marginTop: '1.5rem',
            padding: '0.75rem',
            background: 'rgba(139, 92, 246, 0.04)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
              Sign in to unlock all features
            </div>
            <button 
              onClick={loginWithGoogle}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                color: '#a78bfa',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
              }}
            >
              <LogIn size={13} />
              Sign In with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeftSidebar;

const TRENDING_TOPICS = [
  "AI", "ChatGPT", "Machine Learning", "Tech Startups", "SaaS Tools", "Developer Tools",
  "Remote Work", "Side Hustles", "Freelancing", "Time Management", "Productivity", "Entrepreneurship",
  "Fitness & Nutrition", "Mental Health", "Biohacking", "Longevity", "Sleep Optimization",
  "Crypto & Bitcoin", "Personal Finance", "Investing", "Passive Income", "FIRE Movement",
  "Sustainability", "Climate Change", "Sustainable Fashion", "Minimalism", "Digital Nomad",
  "Work-Life Balance", "Indie Games", "Gaming", "Streetwear", "Fashion", "Beauty & Skincare",
  "Career Growth", "Job Searching", "Online Learning", "Coding Bootcamps", "Parenting",
  "Relationships", "Travel Hacking", "Pet Care"
];
