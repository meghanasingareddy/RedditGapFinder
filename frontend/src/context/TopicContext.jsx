import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';

const TopicContext = createContext();

export function TopicProvider({ children }) {
  const [activeTopicSearch, setActiveTopicSearch] = useState(null);
  const [activeTopicDepth, setActiveTopicDepth] = useState(null);
  const [topicData, setTopicData] = useState(null);
  const [scannedSubreddits, setScannedSubreddits] = useState([]);
  const [viewingMode, setViewingMode] = useState('empty');

  const setTopicSearchSuccess = (data) => {
    setActiveTopicSearch(data.topic);
    setViewingMode('topic');
    const depthLabels = { 
      quick: 'Quick Insight', 
      standard: 'Standard Analysis', 
      deep: 'Deep Research', 
      market: 'Market Intelligence' 
    };
    setActiveTopicDepth(depthLabels[data.depth] || 'Standard Analysis');
    setScannedSubreddits(data.stats?.scanned_subreddits || []);
    setTopicData(data);
  };

  const clearTopicSearch = () => {
    setActiveTopicSearch(null);
    setActiveTopicDepth(null);
    setTopicData(null);
    setScannedSubreddits([]);
    setViewingMode('empty');
  };

  return (
    <TopicContext.Provider value={{
      activeTopicSearch,
      activeTopicDepth,
      topicData,
      scannedSubreddits,
      viewingMode,
      setViewingMode,
      setTopicSearchSuccess,
      clearTopicSearch
    }}>
      {children}
    </TopicContext.Provider>
  );
}

export function useTopic() {
  return useContext(TopicContext);
}

/**
 * A beautiful, premium, glassmorphic empty state component
 * matching the visual intelligence dashboard style.
 */
export function EmptyState({ title = "Data Context Needed" }) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      width: '100%',
      padding: '2rem',
      boxSizing: 'border-box'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          background: 'rgba(23, 27, 34, 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '3.5rem 2.5rem',
          textAlign: 'center',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
        }}
      >
        {/* Glowing Centered Icon Container */}
        <div style={{
          position: 'relative',
          width: '72px',
          height: '72px',
          margin: '0 auto 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Radial Gradient Glow behind icon */}
          <div style={{
            position: 'absolute',
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle, rgba(139, 124, 255, 0.25) 0%, rgba(139, 124, 255, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, rgba(139, 124, 255, 0.15) 0%, rgba(109, 90, 230, 0.15) 100%)',
            border: '1px solid rgba(139, 124, 255, 0.35)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            boxShadow: '0 8px 30px rgba(139, 124, 255, 0.15)'
          }}>
            <Search color="#8b7cff" size={28} />
          </div>
        </div>

        <h3 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#fff',
          marginBottom: '0.75rem',
          letterSpacing: '-0.3px',
          fontFamily: "'Cabinet Grotesk', -apple-system, sans-serif"
        }}>
          {title}
        </h3>

        <p style={{
          fontSize: '0.925rem',
          color: 'rgba(255, 255, 255, 0.65)',
          lineHeight: 1.6,
          marginBottom: '2.25rem',
          padding: '0 1rem'
        }}>
          No data loaded. Search for a topic on the Overview page first.
        </p>

        <motion.button
          whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(139, 124, 255, 0.3)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/')}
          style={{
            background: 'linear-gradient(135deg, #8b7cff, #6d5ae6)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '0.85rem 2rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(139, 124, 255, 0.2)'
          }}
        >
          <Sparkles size={16} />
          Go to Overview to Search
        </motion.button>
      </motion.div>
    </div>
  );
}
