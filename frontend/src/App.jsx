import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';

import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import TopNavbar from './components/TopNavbar';

import Overview from './pages/Overview';
import PainPoints from './pages/PainPoints';
import StartupIdeas from './pages/StartupIdeas';
import Trends from './pages/Trends';
import SearchExplorer from './pages/SearchExplorer';
import Reports from './pages/Reports';
import Saved from './pages/Saved';
import Competitors from './pages/Competitors';
import SubredditTracker from './pages/SubredditTracker';

import { AuthProvider, useAuth } from './context/AuthContext';
import { TopicProvider } from './context/TopicContext';
import { Lock, Sparkles, AlertTriangle } from 'lucide-react';

// Protected Route wrapper — shows blurred preview + login prompt for unauthenticated users
function ProtectedRoute({ children }) {
  const { user, loginWithGoogle } = useAuth();

  if (user) {
    return children;
  }

  return (
    <div style={{ position: 'relative', minHeight: '70vh' }}>
      {/* Blurred preview of the page behind */}
      <div style={{
        filter: 'blur(8px)',
        opacity: 0.35,
        pointerEvents: 'none',
        userSelect: 'none'
      }}>
        {children}
      </div>

      {/* Login overlay */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
      >
        <div style={{
          background: 'rgba(17, 18, 27, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          maxWidth: '400px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
          }}>
            <Lock color="#fff" size={22} />
          </div>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '0.5rem',
            letterSpacing: '-0.3px'
          }}>
            Unlock Full Access
          </h3>

          <p style={{
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.5)',
            lineHeight: 1.5,
            marginBottom: '1.75rem',
            padding: '0 0.5rem'
          }}>
            Sign in with Google to access advanced features like Search Explorer, Reports, Saved Bookmarks, and Subreddit Tracking.
          </p>

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(255,255,255,0.06)' }}
            whileTap={{ scale: 0.98 }}
            onClick={loginWithGoogle}
            style={{
              width: '100%',
              height: '46px',
              background: '#fff',
              color: '#11121b',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            {/* Google icon */}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#EA4335" d="M9 3.58c1.12 0 2.12.39 2.92 1.15l2.17-2.17C12.78.88 11.02 0 9 0 5.48 0 2.52 2.02 1.12 4.96l2.76 2.14C4.54 4.88 6.58 3.58 9 3.58z" />
              <path fill="#4285F4" d="M17.64 9.2c0-.59-.05-1.17-.16-1.73H9v3.26h4.84c-.21 1.1-.83 2.03-1.76 2.66l2.73 2.13c1.6-1.48 2.53-3.66 2.53-6.32z" />
              <path fill="#FBBC05" d="M3.88 10.78A5.36 5.36 0 0 1 3.5 9c0-.62.11-1.22.3-1.78L1.04 5.08A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.73-2.13c-.76.51-1.73.82-2.93.82-2.42 0-4.46-1.3-5.19-3.52L1.12 13.1C2.52 16.02 5.48 18 9 18z" />
            </svg>
            Sign In with Google
          </motion.button>

          <div style={{
            marginTop: '1.25rem',
            fontSize: '0.65rem',
            color: 'rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <Sparkles size={10} />
            Free access • No credit card required
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(300);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth <= 1200;
  const isDesktop = windowWidth > 1200;

  const startResizeLeft = (e) => {
    e.preventDefault();
    setIsResizingLeft(true);
  };

  const startResizeRight = (e) => {
    e.preventDefault();
    setIsResizingRight(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingLeft) {
        const newWidth = Math.max(180, Math.min(400, e.clientX));
        setLeftWidth(newWidth);
      } else if (isResizingRight) {
        const newWidth = Math.max(240, Math.min(480, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: '#0f1115',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(139, 124, 255, 0.12) 0%, rgba(139, 124, 255, 0) 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 1
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
          <div style={{ marginBottom: '24px', animation: 'pulse 2s infinite ease-in-out' }}>
            <svg width="56" height="56" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="lensBgReact" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#4c0519" />
                  <stop offset="100%" stopColor="#1e0008" />
                </radialGradient>
                <linearGradient id="glassRingReact" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb923c" />
                  <stop offset="50%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
                <linearGradient id="handleGradReact" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#9a3412" />
                </linearGradient>
                <filter id="glowReact" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <rect x="12" y="68" width="12" height="28" rx="6" transform="rotate(-45 18 82)" fill="url(#handleGradReact)" />
              <circle cx="56" cy="44" r="26" fill="url(#lensBgReact)" />
              <path d="M 38 52 L 48 42 L 56 48 L 68 32" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="38" cy="52" r="4" fill="#ffffff" />
              <circle cx="48" cy="42" r="4" fill="#ffffff" />
              <circle cx="56" cy="48" r="4" fill="#ffffff" />
              <circle cx="68" cy="32" r="4" fill="#ffffff" />
              <circle cx="56" cy="44" r="26" stroke="url(#glassRingReact)" strokeWidth="5" fill="none" filter="url(#glowReact)" />
            </svg>
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(255,255,255,0.03)',
            borderTop: '3px solid #8b7cff',
            borderRadius: '50%',
            animation: 'spin 1s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite',
            marginBottom: '16px'
          }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 500, letterSpacing: '-0.2px', color: '#98a2b3' }}>
            Loading Reddit<span style={{ color: '#f97316', fontWeight: 800 }}>GapFinder</span>...
          </div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.95; }
            50% { transform: scale(1.05); opacity: 1; filter: drop-shadow(0 0 12px rgba(249,115,22,0.35)); }
            100% { transform: scale(1); opacity: 0.95; }
          }
        `}</style>
      </div>
    );
  }

  const isMockUser = user && user.uid === "mock-dev-user-id";

  // Dashboard is always visible — no auth wall
  return (
    <div 
      className={`app-container ${isMobile ? 'is-mobile' : isTablet ? 'is-tablet' : 'is-desktop'} ${isResizingLeft || isResizingRight ? 'is-resizing' : ''}`}
      style={{
        '--left-width': isMobile ? '0px' : `${leftWidth}px`,
        '--right-width': isMobile ? '0px' : isTablet ? '0px' : `${rightWidth}px`
      }}
    >
      {/* Mobile backdrop */}
      {isMobile && mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="mobile-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9, 10, 13, 0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9999
          }}
        />
      )}

      <LeftSidebar isOpen={isMobile && mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} isMobile={isMobile} />
      
      {!isMobile && (
        <div 
          className={`layout-divider left-divider ${isResizingLeft ? 'active' : ''}`}
          onMouseDown={startResizeLeft}
        />
      )}
      
      <div className="center-content">
        <TopNavbar onToggleMenu={() => setMobileMenuOpen(true)} isMobile={isMobile} />
        
        {isMockUser && (
          <div style={{
            background: 'rgba(247, 144, 9, 0.05)',
            borderBottom: '1px solid rgba(247, 144, 9, 0.15)',
            padding: '0.75rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            zIndex: 9,
            transition: 'all 0.3s ease'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  background: 'rgba(247, 144, 9, 0.15)',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertTriangle size={16} color="#f79009" />
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f79009', display: 'block' }}>
                    Firebase OAuth Domain Not Authorized
                  </span>
                  <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Google Sign-in failed (auth/unauthorized-domain). You are logged in with a <strong>Developer Sandbox profile</strong>.
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowSetupInstructions(!showSetupInstructions)}
                style={{
                  background: 'rgba(247, 144, 9, 0.1)',
                  border: '1px solid rgba(247, 144, 9, 0.3)',
                  color: '#f79009',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(247, 144, 9, 0.2)';
                  e.target.style.borderColor = '#f79009';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(247, 144, 9, 0.1)';
                  e.target.style.borderColor = 'rgba(247, 144, 9, 0.3)';
                }}
              >
                {showSetupInstructions ? 'Hide Setup Guide' : 'How to Enable Real Google Sign-In'}
              </button>
            </div>

            {showSetupInstructions && (
              <div style={{
                background: 'rgba(15, 17, 21, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '0.25rem',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: 1.5
              }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '0.5rem' }}>
                  Follow these quick steps to authorize 'localhost' for real Google Account logins:
                </strong>
                <ol style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <li>
                    Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#8b5cf6', textDecoration: 'underline', fontWeight: 600 }}>Firebase Console</a> and select your project (<code>redditgapfinder-meghna</code>).
                  </li>
                  <li>
                    On the left menu, navigate to <strong>Build &gt; Authentication</strong>, then select the <strong>Settings</strong> tab at the top.
                  </li>
                  <li>
                    In the <strong>Authorized domains</strong> section, click the <strong>Add domain</strong> button.
                  </li>
                  <li>
                    Type <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', color: '#a78bfa', fontFamily: 'monospace' }}>localhost</code> and click <strong>Add</strong>.
                  </li>
                  <li>
                    Sign out of your Sandbox account and sign back in using your real Google account!
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        <main className="main-view">
          <AnimatePresence mode="wait">
            <Routes>
              {/* PUBLIC PAGES — visible to everyone */}
              <Route path="/" element={<Overview />} />
              <Route path="/pain-points" element={<PainPoints />} />
              <Route path="/ideas" element={<StartupIdeas />} />
              <Route path="/trends" element={<Trends />} />
              <Route path="/competitors" element={<Competitors />} />

              {/* PROTECTED PAGES — require Google auth */}
              <Route path="/search" element={<ProtectedRoute><SearchExplorer /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />
              <Route path="/tracker" element={<ProtectedRoute><SubredditTracker /></ProtectedRoute>} />
              <Route path="/subreddits" element={<ProtectedRoute><SubredditTracker /></ProtectedRoute>} />

              <Route path="*" element={<Overview />} />
            </Routes>
          </AnimatePresence>
        </main>

        {(isMobile || isTablet) && (
          <RightSidebar />
        )}
      </div>

      {isDesktop && (
        <div 
          className={`layout-divider right-divider ${isResizingRight ? 'active' : ''}`}
          onMouseDown={startResizeRight}
        />
      )}

      {isDesktop && (
        <RightSidebar />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <TopicProvider>
        <Router>
          <AppContent />
        </Router>
      </TopicProvider>
    </AuthProvider>
  );
}

export default App;
