import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sun, Bell, ChevronDown, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, RotateCcw, LogIn, Menu } from 'lucide-react';
import axios from 'axios';
import { CONFIG } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTopic } from '../context/TopicContext';

import Logo from './Logo';

function TopNavbar({ onToggleMenu }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState({ loading: true, online: false, mode: 'offline', details: '', reddit_client_configured: false });
  const [showTooltip, setShowTooltip] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { user, loginWithGoogle, logout } = useAuth();
  const { activeTopicSearch, clearTopicSearch } = useTopic();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  };

  const fetchStatus = async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(`${CONFIG.API_BASE_URL}/api/status`);
      setStatus({
        loading: false,
        online: true,
        mode: res.data.mode,
        details: res.data.details,
        reddit_client_configured: res.data.reddit_client_configured
      });
    } catch (e) {
      setStatus({
        loading: false,
        online: false,
        mode: 'offline',
        details: 'Cannot connect to backend API server. Make sure the FastAPI application is running locally on port 8000.',
        reddit_client_configured: false
      });
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll connection status every 15 seconds
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Determine badge styling based on connection state
  const getBadgeStyle = () => {
    if (!status.online) {
      return {
        text: 'API Offline',
        color: '#f04438',
        bgColor: 'rgba(240, 68, 56, 0.1)',
        borderColor: 'rgba(240, 68, 56, 0.3)',
        glowColor: 'rgba(240, 68, 56, 0.4)',
        icon: <ShieldAlert size={13} color="#f04438" />
      };
    }
    if (status.mode === 'mock_fallback') {
      return {
        text: 'Simulated Sandbox',
        color: '#f79009',
        bgColor: 'rgba(247, 144, 9, 0.08)',
        borderColor: 'rgba(247, 144, 9, 0.25)',
        glowColor: 'rgba(247, 144, 9, 0.35)',
        icon: <AlertTriangle size={13} color="#f79009" />
      };
    }
    return {
      text: 'Reddit Live',
      color: '#12b76a',
      bgColor: 'rgba(18, 183, 106, 0.08)',
      borderColor: 'rgba(18, 183, 106, 0.25)',
      glowColor: 'rgba(18, 183, 106, 0.35)',
      icon: <CheckCircle2 size={13} color="#12b76a" />
    };
  };

  const badge = getBadgeStyle();

  return (
    <div className="top-navbar" style={{ position: 'relative' }}>
      {/* Injecting micro-animations and glow effects */}
      <style>{`
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 4px ${badge.glowColor}; opacity: 0.9; }
          50% { box-shadow: 0 0 12px ${badge.glowColor}; opacity: 1; }
          100% { box-shadow: 0 0 4px ${badge.glowColor}; opacity: 0.9; }
        }
        @keyframes rotate-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 0.725rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid ${badge.borderColor};
          background: ${badge.bgColor};
          color: ${badge.color};
          letter-spacing: 0.02em;
          animation: pulse-glow 2.5s infinite ease-in-out;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          user-select: none;
        }
        .status-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px ${badge.glowColor} !important;
          border-color: ${badge.color};
        }
        .spin-active {
          animation: rotate-spin 1s infinite linear;
        }
        .status-tooltip {
          position: absolute;
          top: 55px;
          right: 8rem;
          width: 320px;
          background: rgba(23, 27, 34, 0.96);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          z-index: 1000;
          transition: all 0.2s ease;
        }
        .user-menu-dropdown {
          position: absolute;
          top: 55px;
          right: 0;
          width: 220px;
          background: rgba(23, 27, 34, 0.96);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 0.5rem;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6);
          backdrop-filter: blur(16px);
          z-index: 1000;
        }
        .user-menu-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          color: var(--text-muted);
          cursor: pointer;
          border: none;
          background: none;
          width: 100%;
          transition: all 0.15s;
        }
        .user-menu-item:hover {
          background: var(--hover-bg);
          color: #fff;
        }
        .sign-in-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid rgba(139, 92, 246, 0.4);
          background: rgba(139, 92, 246, 0.1);
          color: #a78bfa;
          transition: all 0.2s;
        }
        .sign-in-btn:hover {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.6);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        <button 
          onClick={onToggleMenu}
          className="mobile-menu-toggle"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-main)',
            cursor: 'pointer',
            padding: '4px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Menu size={20} />
        </button>
        
        <Logo size={24} />
        
        <div className="navbar-search-wrapper" style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search problems, subreddits, topics..." 
            className="search-bar"
            style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box', color: '#ffffff' }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px' }}>
            Enter
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {activeTopicSearch && (
          <button
            onClick={() => {
              clearTopicSearch();
              navigate('/');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.725rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              letterSpacing: '0.02em',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
              e.currentTarget.style.borderColor = '#ef4444';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <RotateCcw size={12} />
            Clear Results
          </button>
        )}

        {/* Glowing Network Status Badge */}
        <div 
          className="status-badge" 
          onClick={() => setShowTooltip(!showTooltip)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {badge.icon}
          <span>{badge.text}</span>
        </div>

        {/* Dropdown status guide popup */}
        {showTooltip && (
          <div 
            className="status-tooltip"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>System Connection</span>
              <button 
                onClick={(e) => { e.stopPropagation(); fetchStatus(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                title="Refresh Status"
              >
                <RefreshCw size={13} className={refreshing ? 'spin-active' : ''} />
              </button>
            </div>
            
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.75rem' }}>
              {status.details}
            </div>

            {status.online && !status.reddit_client_configured && (
              <div style={{ background: 'rgba(139, 124, 255, 0.04)', border: '1px solid rgba(139, 124, 255, 0.15)', borderRadius: '8px', padding: '0.75rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--primary-color)', display: 'block', marginBottom: '0.25rem' }}>💡 Enable Live Reddit Scraping</span>
                <p style={{ fontSize: '0.675rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.3' }}>
                  Create a <code style={{ color: 'var(--text-main)', background: 'var(--hover-bg)', padding: '1px 4px', borderRadius: '3px' }}>.env</code> file in your <code style={{ color: 'var(--text-main)' }}>backend/</code> directory with:
                </p>
                <pre style={{ fontSize: '0.625rem', background: '#0f1115', color: 'var(--primary-color)', padding: '6px 8px', borderRadius: '4px', marginTop: '6px', border: '1px solid var(--border-color)', overflowX: 'auto', fontFamily: 'monospace' }}>
{`REDDIT_CLIENT_ID=your_id
REDDIT_CLIENT_SECRET=your_secret
REDDIT_USER_AGENT=RedditGapFinder/1.0`}
                </pre>
              </div>
            )}
          </div>
        )}

        <Sun size={18} color="var(--text-muted)" className="navbar-icon" style={{ cursor: 'pointer' }} />
        <Bell size={18} color="var(--text-muted)" className="navbar-icon" style={{ cursor: 'pointer' }} />

        {/* User section — real user data or Sign In button */}
        {user ? (
          <div 
            className="navbar-user-section"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', position: 'relative' }}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=171b22&color=f5f7fb`} 
              alt={user.displayName || 'User'} 
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-color)' }} 
            />
            <div className="navbar-user-info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user.displayName || 'User'}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pro Access</span>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="user-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>{user.displayName}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                </div>
                <button className="user-menu-item" onClick={logout} style={{ color: '#ef4444' }}>
                  <LogIn size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="sign-in-btn" onClick={loginWithGoogle}>
            <svg width="16" height="16" viewBox="0 0 18 18">
              <path fill="#EA4335" d="M9 3.58c1.12 0 2.12.39 2.92 1.15l2.17-2.17C12.78.88 11.02 0 9 0 5.48 0 2.52 2.02 1.12 4.96l2.76 2.14C4.54 4.88 6.58 3.58 9 3.58z" />
              <path fill="#4285F4" d="M17.64 9.2c0-.59-.05-1.17-.16-1.73H9v3.26h4.84c-.21 1.1-.83 2.03-1.76 2.66l2.73 2.13c1.6-1.48 2.53-3.66 2.53-6.32z" />
              <path fill="#FBBC05" d="M3.88 10.78A5.36 5.36 0 0 1 3.5 9c0-.62.11-1.22.3-1.78L1.04 5.08A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.73-2.13c-.76.51-1.73.82-2.93.82-2.42 0-4.46-1.3-5.19-3.52L1.12 13.1C2.52 16.02 5.48 18 9 18z" />
            </svg>
            Sign In
          </button>
        )}
      </div>
    </div>
  );
}

export default TopNavbar;
