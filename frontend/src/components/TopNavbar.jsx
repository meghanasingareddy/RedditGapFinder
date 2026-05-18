import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sun, Bell, ChevronDown, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import axios from 'axios';

function TopNavbar() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState({ loading: true, online: false, mode: 'offline', details: '', reddit_client_configured: false });
  const [showTooltip, setShowTooltip] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  };

  const fetchStatus = async () => {
    setRefreshing(true);
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/status');
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
      `}</style>

      <div style={{ position: 'relative' }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input 
          type="text" 
          placeholder="Search problems, subreddits, topics..." 
          className="search-bar"
          style={{ paddingLeft: '2.5rem' }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px' }}>
          Enter
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
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

        <Sun size={18} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
        <Bell size={18} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
          <img src="https://ui-avatars.com/api/?name=Arjun+Dev&background=171b22&color=f5f7fb" alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-color)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Arjun Dev</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pro Plan</span>
          </div>
          <ChevronDown size={14} color="var(--text-muted)" />
        </div>
      </div>
    </div>
  );
}

export default TopNavbar;
