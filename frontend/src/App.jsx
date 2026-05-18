import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
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
import AuthPage from './pages/AuthPage';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: '#090a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: "'Outfit', sans-serif"
      }}>
        {/* Sleek Spinner */}
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.05)',
          borderTop: '3px solid #8b5cf6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="app-container">
      <LeftSidebar />
      
      <div className="center-content">
        <TopNavbar />
        <main className="main-view">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/pain-points" element={<PainPoints />} />
              <Route path="/ideas" element={<StartupIdeas />} />
              <Route path="/trends" element={<Trends />} />
              <Route path="/search" element={<SearchExplorer />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/competitors" element={<Competitors />} />
              <Route path="/tracker" element={<SubredditTracker />} />
              <Route path="*" element={<Overview />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>

      <RightSidebar />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
