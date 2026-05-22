import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Sparkles, Database } from 'lucide-react';

const TopicContext = createContext();

export function getRelativeTime(timestamp) {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDays}d ago`;
}

export function CachedAnalysisBanner() {
  const { activeTopicSearch, activeTopicDepth } = useTopic();
  
  if (!activeTopicSearch) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(139, 124, 255, 0.05)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(139, 124, 255, 0.2)',
        borderRadius: '8px',
        padding: '6px 12px',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: '#b3a9ff',
        boxShadow: '0 4px 12px rgba(139, 124, 255, 0.03)',
        marginBottom: '1.25rem',
        userSelect: 'none',
        alignSelf: 'flex-start'
      }}
    >
      <Database size={12} color="#8b7cff" />
      <span>Viewing: <strong style={{ color: '#fff' }}>{activeTopicSearch}</strong></span>
      <span style={{ fontSize: '0.65rem', background: 'rgba(139, 124, 255, 0.15)', padding: '1px 6px', borderRadius: '4px', color: '#8b7cff', fontWeight: 600 }}>
        {activeTopicDepth} (cached)
      </span>
    </motion.div>
  );
}

export function TopicProvider({ children }) {
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('topic_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load topic history from localStorage:", e);
      return [];
    }
  });

  const [activeTopicId, setActiveTopicId] = useState(() => {
    try {
      const savedActive = localStorage.getItem('active_topic_id');
      return savedActive || null;
    } catch (e) {
      return null;
    }
  });

  const [activeTopicSearch, setActiveTopicSearch] = useState(null);
  const [activeTopicDepth, setActiveTopicDepth] = useState(null);
  const [topicData, setTopicData] = useState(null);
  const [scannedSubreddits, setScannedSubreddits] = useState([]);
  const [viewingMode, setViewingMode] = useState('empty');
  const [pendingTopicTrigger, setPendingTopicTrigger] = useState(null);

  // Sync activeTopicId to localStorage
  useEffect(() => {
    try {
      if (activeTopicId) {
        localStorage.setItem('active_topic_id', activeTopicId);
      } else {
        localStorage.removeItem('active_topic_id');
      }
    } catch (e) {}
  }, [activeTopicId]);

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('topic_history', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage:", e);
    }
  }, [history]);

  // Sync active analysis variables when activeTopicId or history changes
  useEffect(() => {
    if (activeTopicId && history.length > 0) {
      const item = history.find(h => h.id === activeTopicId);
      if (item) {
        setActiveTopicSearch(item.topic);
        const depthLabels = { 
          quick: 'Quick Insight', 
          quick_insight: 'Quick Insight',
          standard: 'Standard Analysis', 
          standard_analysis: 'Standard Analysis',
          deep: 'Deep Research', 
          deep_research: 'Deep Research',
          market: 'Market Intelligence',
          market_intelligence: 'Market Intelligence'
        };
        setActiveTopicDepth(depthLabels[item.depth] || 'Standard Analysis');
        setScannedSubreddits(item.data?.stats?.scanned_subreddits || []);
        setTopicData(item.data);
        setViewingMode('topic');
      } else {
        setActiveTopicSearch(null);
        setActiveTopicDepth(null);
        setTopicData(null);
        setScannedSubreddits([]);
        setViewingMode('empty');
      }
    } else {
      setActiveTopicSearch(null);
      setActiveTopicDepth(null);
      setTopicData(null);
      setScannedSubreddits([]);
      setViewingMode('empty');
    }
  }, [activeTopicId, history]);

  const setTopicSearchSuccess = (data) => {
    const timestamp = Date.now();
    const id = `${data.topic}_${timestamp}`;
    const newAnalysis = {
      id,
      topic: data.topic,
      depth: data.depth,
      timestamp,
      data
    };

    setHistory(prev => {
      // Remove duplicate topic names (case-insensitive) to prevent listing clutters
      const filtered = prev.filter(h => h.topic.toLowerCase() !== data.topic.toLowerCase());
      // Slice to maximum 50 elements to prevent localStorage bloat
      return [newAnalysis, ...filtered].slice(0, 50);
    });

    setActiveTopicId(id);
    setViewingMode('topic');
  };

  const selectAnalysis = (id) => {
    const item = history.find(h => h.id === id);
    if (item) {
      setActiveTopicId(id);
      setViewingMode('topic');
    }
  };

  const deleteAnalysis = (id) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== id);
      // Auto-fallback if the deleted was active
      if (activeTopicId === id) {
        if (filtered.length > 0) {
          setActiveTopicId(filtered[0].id);
        } else {
          setActiveTopicId(null);
        }
      }
      return filtered;
    });
  };

  const clearAllHistory = () => {
    setHistory([]);
    setActiveTopicId(null);
    setViewingMode('empty');
  };

  const renameAnalysis = (id, newName) => {
    if (!newName || !newName.trim()) return;
    setHistory(prev => prev.map(h => {
      if (h.id === id) {
        return { ...h, topic: newName.trim() };
      }
      return h;
    }));
  };

  const clearTopicSearch = () => {
    setActiveTopicId(null);
    setViewingMode('empty');
  };

  return (
    <TopicContext.Provider value={{
      history,
      activeTopicId,
      activeTopicSearch,
      activeTopicDepth,
      topicData,
      scannedSubreddits,
      viewingMode,
      setViewingMode,
      setTopicSearchSuccess,
      selectAnalysis,
      deleteAnalysis,
      clearAllHistory,
      renameAnalysis,
      clearTopicSearch,
      pendingTopicTrigger,
      setPendingTopicTrigger
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
