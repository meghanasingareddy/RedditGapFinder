import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Search, Compass, Clock, Activity, AlertCircle, CheckCircle2, X, Sparkles, Sliders, Play } from 'lucide-react';
import { CONFIG } from '../config';
import { useTopic } from '../context/TopicContext';

const DEPTHS = [
  {
    id: 'quick',
    name: 'Quick Insight',
    desc: 'Fast overview',
    time: '~10 seconds',
    color: '#8b7cff'
  },
  {
    id: 'standard',
    name: 'Standard Analysis',
    desc: 'Recommended',
    time: '~30 seconds',
    color: '#10b981'
  },
  {
    id: 'deep',
    name: 'Deep Research',
    desc: 'More signals & trends',
    time: '~60 seconds',
    color: '#3b82f6'
  },
  {
    id: 'market',
    name: 'Market Intelligence',
    desc: 'Complete opportunity report',
    time: '~2 minutes',
    color: '#f59e0b'
  }
];

function TopicSearch({ onSearchSuccess, onSearchStart, onSearchError, onProgressUpdate, welcomeMode = false, welcomeDepth = 'standard', triggerTopic = null, onCancelRef = null }) {
  const { clearTopicSearch } = useTopic();
  const [query, setQuery] = useState('');
  const [selectedDepth, setSelectedDepth] = useState(welcomeDepth || 'standard');

  // Sync depth from parent when in welcomeMode
  useEffect(() => {
    if (welcomeMode) setSelectedDepth(welcomeDepth);
  }, [welcomeDepth, welcomeMode]);

  // Fire search when a trending chip is clicked from the welcome board
  useEffect(() => {
    if (triggerTopic && triggerTopic.topic) {
      setQuery(triggerTopic.topic);
      // Small delay so state update flushes before handleSearch reads query
      setTimeout(() => handleSearch(triggerTopic.topic), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerTopic]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  // Progress modal states
  const [progressModal, setProgressModal] = useState(false);
  const [progressText, setProgressText] = useState('Initializing search engine...');
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentSubreddit, setCurrentSubreddit] = useState('');
  const [progressSubCount, setProgressSubCount] = useState(0);
  const [progressSubTotal, setProgressSubTotal] = useState(0);
  const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);
  
  const dropdownRef = useRef(null);
  const inputWrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const progressTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [dropdownRect, setDropdownRect] = useState(null);

  const abortSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    setProgressModal(false);
  };

  useEffect(() => {
    if (onCancelRef) {
      onCancelRef(abortSearch);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCancelRef]);

  // Fetch trending topics on mount
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await axios.get(`${CONFIG.API_BASE_URL}/api/topics/trending`);
        setTrending(res.data || []);
      } catch (err) {
        console.error('Failed to fetch trending topics:', err);
        // Fallback static trending if API fails
        setTrending([
          { topic: 'AI', category: 'Tech' },
          { topic: 'ChatGPT', category: 'Tech' },
          { topic: 'Machine Learning', category: 'Tech' },
          { topic: 'Tech Startups', category: 'Business' },
          { topic: 'SaaS Tools', category: 'Software' },
          { topic: 'Developer Tools', category: 'Software' },
          { topic: 'Remote Work', category: 'Lifestyle' },
          { topic: 'Side Hustles', category: 'Finance' },
          { topic: 'Freelancing', category: 'Lifestyle' },
          { topic: 'Time Management', category: 'Productivity' },
          { topic: 'Productivity', category: 'Productivity' },
          { topic: 'Entrepreneurship', category: 'Business' },
          { topic: 'Fitness & Nutrition', category: 'Health' },
          { topic: 'Mental Health', category: 'Health' },
          { topic: 'Biohacking', category: 'Health' },
          { topic: 'Longevity', category: 'Health' },
          { topic: 'Sleep Optimization', category: 'Health' },
          { topic: 'Crypto & Bitcoin', category: 'Finance' },
          { topic: 'Personal Finance', category: 'Finance' },
          { topic: 'Investing', category: 'Finance' },
          { topic: 'Passive Income', category: 'Finance' },
          { topic: 'FIRE Movement', category: 'Finance' },
          { topic: 'Sustainability', category: 'Lifestyle' },
          { topic: 'Climate Change', category: 'Lifestyle' },
          { topic: 'Sustainable Fashion', category: 'Style' },
          { topic: 'Minimalism', category: 'Lifestyle' },
          { topic: 'Digital Nomad', category: 'Lifestyle' },
          { topic: 'Work-Life Balance', category: 'Lifestyle' },
          { topic: 'Indie Games', category: 'Gaming' },
          { topic: 'Gaming', category: 'Gaming' },
          { topic: 'Streetwear', category: 'Style' },
          { topic: 'Fashion', category: 'Style' },
          { topic: 'Beauty & Skincare', category: 'Style' },
          { topic: 'Career Growth', category: 'Lifestyle' },
          { topic: 'Job Searching', category: 'Lifestyle' },
          { topic: 'Online Learning', category: 'Lifestyle' },
          { topic: 'Coding Bootcamps', category: 'Tech' },
          { topic: 'Parenting', category: 'Lifestyle' },
          { topic: 'Relationships', category: 'Lifestyle' },
          { topic: 'Travel Hacking', category: 'Lifestyle' },
          { topic: 'Pet Care', category: 'Lifestyle' }
        ]);
      }
    };
    fetchTrending();
  }, []);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        inputWrapperRef.current && !inputWrapperRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update dropdown position whenever it opens
  useEffect(() => {
    if (dropdownOpen && inputWrapperRef.current) {
      const rect = inputWrapperRef.current.getBoundingClientRect();
      setDropdownRect(rect);
    }
  }, [dropdownOpen]);

  // Debounced suggestions fetching (300ms)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${CONFIG.API_BASE_URL}/api/subreddits/suggest?q=${encodeURIComponent(cleanQuery)}`);
        setSuggestions(res.data || []);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Rate limiter countdown timer
  useEffect(() => {
    let interval = null;
    if (rateLimitTimeLeft > 0) {
      interval = setInterval(() => {
        setRateLimitTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rateLimitTimeLeft]);

  // Run the Topic Scan
  const handleSearch = async (targetTopic) => {
    const searchTopic = (targetTopic || query).trim();
    if (!searchTopic) return;

    setDropdownOpen(false);
    
    // Trigger callback
    if (onSearchStart) onSearchStart(searchTopic);

    // Trigger anonymous search tracking
    try {
      let sessionId = sessionStorage.getItem('search_session_id');
      if (!sessionId) {
        sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('search_session_id', sessionId);
      }
      axios.post(`${CONFIG.API_BASE_URL}/api/track-search`, {
        topic: searchTopic,
        depth: selectedDepth,
        session_id: sessionId
      }).catch(() => {}); // Fail silently
    } catch (e) {
      console.warn("Failed to track search anonymously:", e);
    }

    // Cancel any previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Setup abort controller
    abortControllerRef.current = new AbortController();

    // 1. Determine parameters based on depth
    let subredditsToScan = 8;
    let expectedDurationSec = 30;
    
    if (selectedDepth === 'quick') {
      subredditsToScan = 4;
      expectedDurationSec = 10;
    } else if (selectedDepth === 'deep') {
      subredditsToScan = 15;
      expectedDurationSec = 60;
    } else if (selectedDepth === 'market') {
      subredditsToScan = 20;
      expectedDurationSec = 120;
    }

    // 2. Open Progress Modal and Reset Progress States
    if (!welcomeMode) {
      setProgressModal(true);
    }
    setProgressPercent(0);
    setProgressSubCount(0);
    setProgressSubTotal(subredditsToScan);
    setProgressText('Querying Reddit API for subreddits...');
    setCurrentSubreddit('');
    if (welcomeMode && onProgressUpdate) {
      onProgressUpdate({ phase: 'start', topic: searchTopic, total: subredditsToScan, percent: 0, text: 'Querying Reddit API for subreddits...', subreddit: '', count: 0 });
    }

    // 3. Pre-fetch subreddits to simulate the scanning steps realistically
    let suggestedSubs = [];
    try {
      const suggestRes = await axios.get(
        `${CONFIG.API_BASE_URL}/api/subreddits/suggest?q=${encodeURIComponent(searchTopic)}`
      );
      suggestedSubs = suggestRes.data || [];
    } catch (e) {
      console.warn('Could not pre-fetch subreddits for progress simulation:', e);
    }

    // Fallback if no subreddits found or search fails
    if (suggestedSubs.length === 0) {
      const cleanSearchTopic = searchTopic.toLowerCase().replace(/[^a-z0-9]/g, '');
      suggestedSubs = [
        cleanSearchTopic,
        `${cleanSearchTopic}dev`,
        `${cleanSearchTopic}talk`,
        `ask${cleanSearchTopic}`,
        `${cleanSearchTopic}trends`,
        `${cleanSearchTopic}business`
      ];
    }

    // Stretch or trim to match target count
    while (suggestedSubs.length < subredditsToScan) {
      const cleanSearchTopic = searchTopic.toLowerCase().replace(/[^a-z0-9]/g, '');
      suggestedSubs.push(`${cleanSearchTopic}_${suggestedSubs.length}`);
    }
    const cleanSubsList = suggestedSubs.slice(0, subredditsToScan);

    // 4. Start the Progress Simulation Timer
    const totalDurationMs = expectedDurationSec * 1000;
    // We leave 5 seconds at the end for clustering, sentiment, and NLP
    const scanningDurationMs = Math.max(2000, totalDurationMs - 5000);
    const msPerSub = scanningDurationMs / subredditsToScan;

    let subIndex = 0;
    const startTime = Date.now();

    const simulateProgress = () => {
      if (subIndex < subredditsToScan) {
        const subName = cleanSubsList[subIndex];
        const subLabel = `r/${subName.replace('r/', '')}`;
        setCurrentSubreddit(subLabel);
        setProgressSubCount(subIndex + 1);
        setProgressText(`Scanning ${subLabel}...`);
        const scanPercent = Math.min(90, Math.floor((subIndex / subredditsToScan) * 90));
        setProgressPercent(scanPercent);
        if (welcomeMode && onProgressUpdate) {
          onProgressUpdate({ phase: 'scanning', topic: searchTopic, total: subredditsToScan, percent: scanPercent, text: `Scanning ${subLabel}...`, subreddit: subLabel, count: subIndex + 1 });
        }
        subIndex++;
        progressTimerRef.current = setTimeout(simulateProgress, msPerSub);
      } else {
        setProgressText('Running NLP Sentiment & Clustering Engine...');
        setProgressPercent(93);
        if (welcomeMode && onProgressUpdate) onProgressUpdate({ phase: 'nlp', percent: 93, text: 'Running NLP Sentiment & Clustering Engine...' });
        progressTimerRef.current = setTimeout(() => {
          setProgressText('Generating Startup Viability Ideas & Pain Points...');
          setProgressPercent(96);
          if (welcomeMode && onProgressUpdate) onProgressUpdate({ phase: 'ideas', percent: 96, text: 'Generating Startup Viability Ideas & Pain Points...' });
          progressTimerRef.current = setTimeout(() => {
            setProgressText('Finalizing opportunity report... Almost ready!');
            setProgressPercent(98);
            if (welcomeMode && onProgressUpdate) onProgressUpdate({ phase: 'finalizing', percent: 98, text: 'Finalizing opportunity report... Almost ready!' });
          }, 2000);
        }, 2000);
      }
    };

    // Trigger simulation
    simulateProgress();

    const depthMapping = {
      quick: 'quick_insight',
      standard: 'standard_analysis',
      deep: 'deep_research',
      market: 'market_intelligence'
    };
    const requestDepth = depthMapping[selectedDepth] || selectedDepth;

    // 5. Send POST request to backend API
    try {
      const response = await axios.post(
        `${CONFIG.API_BASE_URL}/api/search/topic`,
        {
          topic: searchTopic,
          depth: requestDepth
        },
        {
          signal: abortControllerRef.current.signal
        }
      );

      // Clean up timer
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      setProgressPercent(100);
      setProgressText('Analysis completed successfully!');
      if (welcomeMode && onProgressUpdate) {
        onProgressUpdate({ phase: 'complete', percent: 100, text: 'Analysis completed successfully!' });
      }
      setTimeout(() => {
        if (!welcomeMode) setProgressModal(false);
        if (onSearchSuccess) onSearchSuccess(response.data);
      }, 600);

    } catch (err) {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      if (!welcomeMode) setProgressModal(false);
      if (welcomeMode && onProgressUpdate) onProgressUpdate({ phase: 'error' });

      if (axios.isCancel(err) || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        console.log('Scan cancelled:', err.message || 'AbortError');
        return;
      }

      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.message || 'Topic analysis failed';

      if (status === 429) {
        // Rate limit block (60s)
        setRateLimitTimeLeft(60);
        if (onSearchError) onSearchError(`Rate limit active! Please wait before scanning '${searchTopic}' again.`);
      } else {
        if (onSearchError) onSearchError(detail);
      }
    }
  };

  const handleTrendingClick = (topic) => {
    setQuery(topic);
    handleSearch(topic);
  };

  const currentDepthConfig = DEPTHS.find(d => d.id === selectedDepth) || DEPTHS[1];

  // Portal dropdown rendered on document.body to escape overflow:hidden ancestors
  const dropdownPortal = dropdownOpen && dropdownRect ? ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.99 }}
        transition={{ duration: 0.15 }}
        ref={dropdownRef}
        className="search-dropdown"
        style={{
          position: 'fixed',
          top: `${dropdownRect.bottom + 8}px`,
          right: `${window.innerWidth - dropdownRect.right}px`,
          left: 'auto',
          width: '680px',
          zIndex: 99999
        }}
      >
        {/* Left Column: Trending (if empty) or Autocomplete Suggestions (if typing) */}
        <div className="dropdown-col-left">
          {query.trim().length < 2 ? (
            <>
              <div className="section-header">
                <Sparkles size={11} color="var(--primary-color)" />
                <span>Trending Topics</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {trending.slice(0, 8).map((item, idx) => (
                  <div 
                    key={idx} 
                    className="trending-item"
                    onClick={() => handleTrendingClick(item.topic)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Compass size={13} color="var(--text-muted)" />
                      <span>{item.topic}</span>
                    </div>
                    {item.category && (
                      <span style={{ fontSize: '0.625rem', padding: '2px 6px', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                        {item.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="section-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={11} color="var(--primary-color)" />
                  <span>Subreddit Matches</span>
                </div>
                {loadingSuggestions && <div className="spinner-mini"></div>}
              </div>

              {suggestions.length === 0 && !loadingSuggestions ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.775rem', padding: '1rem 0.75rem', textAlign: 'center' }}>
                  No exact subreddit matches found. We will index broad feeds.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {suggestions.map((sub, idx) => (
                    <div 
                      key={idx} 
                      className="suggestion-item"
                      onClick={() => handleTrendingClick(sub)}
                    >
                      <Compass size={13} color="var(--text-muted)" />
                      <span>r/{sub}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column: Premium Depth Selector Panel */}
        <div className="dropdown-col-right">
          <div className="section-header">
            <Sliders size={11} color="var(--primary-color)" />
            <span>Choose Analysis Depth</span>
          </div>

          <div style={{ flex: 1 }}>
            {DEPTHS.map((depth) => {
              const isActive = selectedDepth === depth.id;
              return (
                <div 
                  key={depth.id}
                  className={`depth-option ${isActive ? 'active' : ''}`}
                  style={{ '--active-color': depth.color }}
                  onClick={() => setSelectedDepth(depth.id)}
                >
                  <div style={{ fontSize: '0.775rem', fontWeight: 600, color: isActive ? '#fff' : 'var(--text-main)', marginBottom: '1px' }}>
                    {depth.name}
                  </div>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', lineHeight: '1.2' }}>
                    {depth.desc}
                  </div>
                  <div style={{ fontSize: '0.625rem', color: depth.color, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <Clock size={10} />
                    {depth.time}
                  </div>

                  <div className={`depth-radio ${isActive ? 'active' : ''}`} style={{ '--active-color': depth.color }} />
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem', lineHeight: '1.3' }}>
            💡 Depth increases scanned subreddits and posts, yielding higher fidelity insights and signals.
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  ) : null;

  // Welcome mode: transparent input + scan button only; progress is owned by Overview
  if (welcomeMode) {
    return (
      <>
        <input
          ref={inputWrapperRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && query.trim()) handleSearch(); }}
          placeholder="Search any topic — fashion, AI, remote work, fintech..."
          disabled={rateLimitTimeLeft > 0}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#ffffff', fontSize: '1rem', height: '100%', minWidth: 0
          }}
        />
        {rateLimitTimeLeft > 0 ? (
          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Cooldown {rateLimitTimeLeft}s
          </span>
        ) : (
          <button
            onClick={() => handleSearch()}
            disabled={!query.trim()}
            style={{
              background: query.trim() ? 'var(--primary-color)' : 'rgba(139,124,255,0.2)',
              border: 'none', color: '#fff', padding: '0 20px', height: '40px',
              borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem',
              cursor: query.trim() ? 'pointer' : 'default', whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            Scan Reddit
          </button>
        )}
      </>
    );
  }

  return (
    <div style={{ position: 'relative', zIndex: 100 }} ref={inputWrapperRef}>
      {/* Styles for glassmorphic search input & dropdown components */}
      <style>{`
        .search-container {
          position: relative;
          width: 480px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(23, 27, 34, 0.6);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          height: 42px;
          padding: 0 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.02);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }
        .search-input-wrapper:focus-within {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 1px var(--primary-color), 0 8px 30px rgba(139, 124, 255, 0.15);
          background: rgba(23, 27, 34, 0.85);
        }
        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #ffffff !important;
          font-size: 0.875rem;
          outline: none;
          margin: 0 8px;
          height: 100%;
        }
        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.4) !important;
        }
        .search-dropdown {
          position: absolute;
          top: 50px;
          right: 0;
          width: 680px;
          background: rgba(23, 27, 34, 0.96);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          overflow: hidden;
          z-index: 999;
          display: flex;
        }
        @media (max-width: 768px) {
          .search-container {
            width: 100% !important;
            max-width: 100% !important;
          }
          .search-dropdown {
            flex-direction: column !important;
            width: calc(100vw - 32px) !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            max-height: 75vh !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          .dropdown-col-left {
            border-right: none !important;
            border-bottom: 1px solid var(--border-color) !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .dropdown-col-right {
            border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
            max-height: none !important;
            overflow: visible !important;
          }
        }
        .dropdown-col-left {
          flex: 1.2;
          padding: 1.25rem;
          border-right: 1px solid var(--border-color);
          max-height: 420px;
          overflow-y: auto;
        }
        .dropdown-col-right {
          flex: 1;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.015);
          display: flex;
          flex-direction: column;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.725rem;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
        }
        .trending-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          color: var(--text-main);
          cursor: pointer;
          transition: all 0.15s;
        }
        .trending-item:hover {
          background: var(--hover-bg);
          transform: translateX(2px);
        }
        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          color: var(--text-main);
          cursor: pointer;
          transition: all 0.15s;
        }
        .suggestion-item:hover {
          background: var(--hover-bg);
        }
        .depth-option {
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.01);
          border-radius: 8px;
          padding: 0.65rem 0.85rem;
          margin-bottom: 0.6rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .depth-option:hover {
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.03);
        }
        .depth-option.active {
          border-color: var(--active-color);
          background: rgba(139, 124, 255, 0.04);
        }
        .depth-radio {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1.5px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .depth-radio.active {
          border-color: var(--active-color);
        }
        .depth-radio.active::after {
          content: '';
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--active-color);
        }
        .progress-bar-inner {
          height: 100%;
          background: linear-gradient(90deg, var(--primary-color), #b4a7ff);
          border-radius: 4px;
          box-shadow: 0 0 10px rgba(139, 124, 255, 0.5);
          transition: width 0.4s ease-out;
        }
        .spinner-mini {
          width: 14px;
          height: 14px;
          border: 2px solid var(--border-color);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Main Search Input Wrapper */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input"
            style={{ color: '#ffffff' }}
            placeholder="Search ANY topic (e.g. fashion, remote work)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                handleSearch();
              }
            }}
            disabled={rateLimitTimeLeft > 0}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {query && (
              <button 
                onClick={() => setQuery('')} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={14} />
              </button>
            )}
            
            {rateLimitTimeLeft > 0 ? (
              <div style={{ fontSize: '0.725rem', color: '#ef4444', fontWeight: 600 }}>
                Cooldown {rateLimitTimeLeft}s
              </div>
            ) : (
              <button 
                onClick={() => handleSearch()}
                disabled={!query.trim()}
                className="btn-primary" 
                style={{ height: '28px', padding: '0 8px', fontSize: '0.75rem', borderRadius: '4px' }}
              >
                <Play size={10} fill="#fff" /> Scan
              </button>
            )}
          </div>
        </div>

        {/* Dropdown rendered via React portal on document.body to escape overflow:hidden ancestors */}
        {dropdownPortal}
      </div>

      {/* Premium Dark Glassmorphic Progress Modal */}
      <AnimatePresence>
        {progressModal && (
          <div style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(9, 10, 13, 0.9)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9999, 
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="panel" 
              style={{ 
                width: '460px', 
                background: 'rgba(23, 27, 34, 0.85)',
                border: '1px solid rgba(139, 124, 255, 0.2)',
                borderRadius: '16px',
                display: 'flex', 
                flexDirection: 'column', 
                padding: '2.5rem',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px rgba(139, 124, 255, 0.05)'
              }}
            >
              {/* Spinner & Glow */}
              <div style={{ position: 'relative', margin: '0 auto 1.75rem auto', width: '56px', height: '56px' }}>
                <div style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  borderRadius: '50%', 
                  background: 'var(--primary-color)', 
                  filter: 'blur(16px)', 
                  opacity: 0.25,
                  animation: 'pulse 2s infinite ease-in-out'
                }}></div>
                <div className="spinner" style={{ 
                  width: '56px', 
                  height: '56px', 
                  border: '3px solid rgba(255,255,255,0.03)', 
                  borderTopColor: 'var(--primary-color)', 
                  borderRadius: '50%', 
                  animation: 'spin 1.2s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite' 
                }}></div>
              </div>

              {/* Title & Stats */}
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem', fontFamily: 'Cabinet Grotesk, sans-serif' }}>
                Topic Analysis Active
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(139, 124, 255, 0.1)', color: 'var(--primary-color)', borderRadius: '4px', fontWeight: 600 }}>
                  {query}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>•</span>
                <span style={{ fontSize: '0.75rem', color: currentDepthConfig.color, fontWeight: 500 }}>
                  {currentDepthConfig.name} ({currentDepthConfig.time})
                </span>
              </div>

              {/* Progress Text */}
              <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem', minHeight: '20px' }}>
                {progressText}
              </p>

              {/* Action details (e.g. scanned / total subreddits) */}
              {currentSubreddit && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  <span>{currentSubreddit}</span>
                  <span>{progressSubCount} / {progressSubTotal} subreddits</span>
                </div>
              )}

              {/* Progress Bar Container */}
              <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-color)' }}>
                <div 
                  className="progress-bar-inner"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              {/* Progress percent display */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
                <span>Scanned data parser: OK</span>
                <span style={{ color: 'white', fontWeight: 600 }}>{progressPercent}%</span>
              </div>

              {/* Cancel Button */}
              <button 
                onClick={() => {
                  abortSearch();
                  clearTopicSearch();
                  if (onSearchError) onSearchError('Analysis search cancelled by user.');
                }}
                className="btn-outline"
                style={{ marginTop: '2rem', height: '32px', fontSize: '0.75rem', width: 'fit-content', alignSelf: 'center', padding: '0 1rem' }}
              >
                Cancel Analysis
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TopicSearch;
