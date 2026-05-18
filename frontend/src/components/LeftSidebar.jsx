import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, AlertCircle, Lightbulb, TrendingUp, Search, FileText, Bookmark, Eye, Activity, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function LeftSidebar() {
  const { user, logout } = useAuth();

  return (
    <div className="left-sidebar">
      <div style={{ marginBottom: '2rem', paddingLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '24px', height: '24px', background: 'var(--primary-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
          R
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>RedditGapFinder</h2>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-title">Main</div>
        <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Home size={16} /> Overview
        </NavLink>
        <NavLink to="/pain-points" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <AlertCircle size={16} /> Pain Points
        </NavLink>
        <NavLink to="/ideas" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Lightbulb size={16} /> Startup Ideas
        </NavLink>
        <NavLink to="/trends" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <TrendingUp size={16} /> Trends
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Search size={16} /> Search Explorer
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <FileText size={16} /> Reports
        </NavLink>
        <NavLink to="/saved" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Bookmark size={16} /> Saved
        </NavLink>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-title">Monitoring</div>
        <NavLink to="/competitors" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Eye size={16} /> Competitors
        </NavLink>
        <NavLink to="/tracker" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Activity size={16} /> Subreddit Tracker
        </NavLink>
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
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-main)' }}>r/startups</span><br/>
            1,248 new posts
          </div>
          <div>
            <span style={{ color: 'var(--text-main)' }}>r/SaaS</span><br/>
            892 new posts
          </div>
        </div>

        {/* Google User Profile Card */}
        {user && (
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
        )}
      </div>
    </div>
  );
}

export default LeftSidebar;
