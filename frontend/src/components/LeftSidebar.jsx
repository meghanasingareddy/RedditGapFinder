import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, AlertCircle, Lightbulb, TrendingUp, Search, FileText, Bookmark, Eye, Activity, LogOut, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { CONFIG } from '../config';
import Logo from './Logo';

function LeftSidebar() {
  const { user, logout, loginWithGoogle } = useAuth();
  const [liveSubs, setLiveSubs] = useState([]);

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
      <NavLink to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
        {icon}
        <span style={{ flex: 1 }}>{label}</span>
        {showLock && (
          <Lock size={12} style={{ opacity: 0.4, marginLeft: 'auto' }} />
        )}
      </NavLink>
    );
  };

  return (
    <div className="left-sidebar">
      <div style={{ marginBottom: '2rem', paddingLeft: '0.25rem' }}>
        <Logo size={28} />
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
