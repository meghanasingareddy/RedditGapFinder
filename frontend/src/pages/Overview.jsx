import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { CONFIG } from '../config';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, Search, Activity, Sparkles, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTopic } from '../context/TopicContext';
import TopicSearch from '../components/TopicSearch';

function Overview() {
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const [stats, setStats] = useState({
    postsAnalyzed: '—',
    painPointsFound: '—',
    startupIdeas: '—',
    opportunityScore: '—',
    postsChange: '',
    painChange: '',
    ideasChange: '',
    oppChange: ''
  });
  const [painPoints, setPainPoints] = useState([]);
  const [discoveries, setDiscoveries] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [scanModal, setScanModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const {
    activeTopicSearch,
    activeTopicDepth,
    topicData,
    scannedSubreddits,
    viewingMode,
    setViewingMode,
    setTopicSearchSuccess,
    clearTopicSearch,
    pendingTopicTrigger,
    setPendingTopicTrigger
  } = useTopic();

  const [dbHasData, setDbHasData] = useState(false);

  // Analysis workspace state
  const [analysisState, setAnalysisState] = useState('idle'); // 'idle' | 'scanning' | 'complete'
  const [analysisProgress, setAnalysisProgress] = useState({ topic: '', percent: 0, text: '', subreddit: '', count: 0, total: 0, phase: 'idle' });
  const [liveResults, setLiveResults] = useState([]);
  const liveResultsTimerRef = useRef(null);
  const liveResultsIndexRef = useRef(null);
  const cancelSearchRef = useRef(null);

  // Format large numbers nicely
  const formatCount = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  // Dynamic date string
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    if (activeTopicSearch && topicData) {
      setChartData(topicData.chart_data || []);
      setPainPoints(topicData.clusters ? topicData.clusters.slice(0, 5) : []);
      setDiscoveries(topicData.discoveries ? topicData.discoveries.slice(0, 3) : []);
      
      const formatCountLocal = (n) => {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
      };

      setStats({
        postsAnalyzed: formatCountLocal(topicData.stats?.total_posts || 0),
        painPointsFound: (topicData.stats?.total_clusters || 0).toString(),
        startupIdeas: (topicData.stats?.total_ideas || 0).toString(),
        opportunityScore: `${topicData.stats?.avg_opportunity_score || 0}/100`,
        postsChange: 'Topic Scan', painChange: 'New Signals', ideasChange: 'Opportunities',
        oppChange: `Avg: ${topicData.stats?.avg_opportunity_score || 0}`
      });
      setLoading(false);
    } else {
      fetchDashboardData();
    }
  }, [activeTopicSearch, topicData]);

  const fetchDashboardData = async () => {
    try {
      const [postsRes, painRes, ideasRes, statsRes] = await Promise.all([
        axios.get(`${CONFIG.API_BASE_URL}/api/posts?limit=5`),
        axios.get(`${CONFIG.API_BASE_URL}/api/painpoints`),
        axios.get(`${CONFIG.API_BASE_URL}/api/ideas`),
        axios.get(`${CONFIG.API_BASE_URL}/api/stats`)
      ]);

      const apiStats = statsRes.data;
      setPainPoints(painRes.data.slice(0, 5));
      setDiscoveries(postsRes.data.slice(0, 3));
      setChartData(apiStats.chart_data || []);
      
      setStats({
        postsAnalyzed: formatCount(apiStats.total_posts),
        painPointsFound: apiStats.total_clusters.toString(),
        startupIdeas: apiStats.total_ideas.toString(),
        opportunityScore: `${apiStats.avg_opportunity_score}/100`,
        postsChange: apiStats.total_posts > 0 ? `+${((apiStats.total_posts / Math.max(apiStats.total_posts - 5, 1)) * 100 - 100).toFixed(1)}%` : '',
        painChange: apiStats.total_clusters > 0 ? `+${apiStats.total_clusters}` : '',
        ideasChange: apiStats.total_ideas > 0 ? `+${apiStats.total_ideas}` : '',
        oppChange: apiStats.avg_opportunity_score > 0 ? `↑ ${apiStats.avg_opportunity_score}` : ''
      });

      const hasData = apiStats.total_posts > 0 || apiStats.total_clusters > 0 || painRes.data.length > 0;
      setDbHasData(hasData);
      if (hasData) {
        setViewingMode('scan');
      } else {
        setViewingMode('empty');
      }

      // Dispatch reset event to update global sibling components (e.g., RightSidebar)
      window.dispatchEvent(new CustomEvent('topicSearchReset'));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setViewingMode('empty');
      setDbHasData(false);
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = (prog) => {
    setAnalysisProgress(prev => ({ ...prev, ...prog }));
    if (prog.phase === 'start') {
      setAnalysisState('scanning');
      setLiveResults([]);
      liveResultsIndexRef.current = 0;
      // Start progressive live result simulation
      const LIVE_TEMPLATES = [
        { type: 'pain', icon: '⚠️', label: 'Pain Point Found', color: '#ef4444' },
        { type: 'opp',  icon: '💡', label: 'Opportunity Signal', color: '#f59e0b' },
        { type: 'trend',icon: '📈', label: 'Trend Detected', color: '#10b981' },
        { type: 'pain', icon: '⚠️', label: 'Pain Point Found', color: '#ef4444' },
        { type: 'opp',  icon: '💡', label: 'Opportunity Signal', color: '#f59e0b' },
        { type: 'trend',icon: '📈', label: 'Trend Detected', color: '#10b981' },
        { type: 'pain', icon: '⚠️', label: 'Pain Point Found', color: '#ef4444' },
        { type: 'opp',  icon: '💡', label: 'Opportunity Signal', color: '#f59e0b' },
      ];
      const PAIN_MSGS = [
        `Users struggle with onboarding complexity in ${prog.topic} tools`,
        `Lack of async collaboration features frustrates remote teams`,
        `High subscription costs prevent small teams from adopting solutions`,
        `Poor mobile experience cited repeatedly in community discussions`,
        `Integration gaps with existing workflows cause daily friction`,
      ];
      const OPP_MSGS = [
        `AI-powered ${prog.topic} assistant with context awareness`,
        `Lightweight async tool for distributed teams`,
        `Freemium model targeting indie hackers and small businesses`,
        `Browser extension solving workflow friction points`,
        `Unified dashboard aggregating fragmented data sources`,
      ];
      const TREND_MSGS = [
        `Rapid growth in AI-assisted ${prog.topic} discussions (+340%)`,
        `Rising demand for privacy-first alternatives`,
        `Community shifting toward no-code/low-code solutions`,
        `Increased mentions of burnout and productivity solutions`,
        `Open-source ${prog.topic} tools gaining significant traction`,
      ];
      let lrIdx = 0;
      const addLiveResult = () => {
        if (lrIdx >= LIVE_TEMPLATES.length) return;
        const tmpl = LIVE_TEMPLATES[lrIdx];
        const msgs = tmpl.type === 'pain' ? PAIN_MSGS : tmpl.type === 'opp' ? OPP_MSGS : TREND_MSGS;
        const msg = msgs[Math.floor(lrIdx / 3) % msgs.length];
        setLiveResults(prev => [...prev, { ...tmpl, text: msg, id: lrIdx }]);
        lrIdx++;
        liveResultsTimerRef.current = setTimeout(addLiveResult, 4500 + Math.random() * 2000);
      };
      liveResultsTimerRef.current = setTimeout(addLiveResult, 3000);
    }
    if (prog.phase === 'error') {
      setAnalysisState('idle');
      if (liveResultsTimerRef.current) clearTimeout(liveResultsTimerRef.current);
    }
  };

  const handleTopicSearchStart = (topic) => {
    console.log('Search started internally for:', topic);
  };

  const handleTopicSearchSuccess = (data) => {
    if (liveResultsTimerRef.current) clearTimeout(liveResultsTimerRef.current);
    setAnalysisState('idle');
    
    setTopicSearchSuccess(data);

    // Dispatch custom event to notify RightSidebar and other sibling components of success
    window.dispatchEvent(new CustomEvent('topicSearchSuccess', { detail: data }));

    showToast(`Successfully analyzed "${data.topic}" across ${data.stats?.scanned_subreddits?.length || 0} subreddits!`);
  };

  const handleTopicSearchError = (errorMsg) => {
    showToast(errorMsg, 'error');
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleScanReddit = async () => {
    setScanModal(true);
    setScanning(true);
    
    // Simulate real pipeline steps
    const steps = [
      'Connecting to public feed aggregator...',
      'Fetching XML feed payloads (RSS/Atom)...',
      'Parsing Feed elements & title strings...',
      'Cleaning HTML & extracting post contents...',
      'Analyzing VaderSentiment polarities...',
      'Running TF-IDF/Clustering Pipeline...',
      'Generating Startup Viability Ideas...',
      'Committing changes to SQLite database...'
    ];

    let currentStep = 0;
    setScanStep(steps[0]);

    const stepInterval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setScanStep(steps[currentStep]);
      } else {
        clearInterval(stepInterval);
      }
    }, 900);

    try {
      const res = await axios.post(`${CONFIG.API_BASE_URL}/api/scan?subreddit=${scanInput}`);
      clearInterval(stepInterval);
      
      if (res.data.status === 'success') {
        showToast(`Successfully indexed ${res.data.subreddit}! Found ${res.data.clusters_discovered} clusters and generated ${res.data.ideas_generated} startup ideas.`);
        setViewingMode('scan');
        fetchDashboardData();
      }
    } catch (err) {
      clearInterval(stepInterval);
      const errMsg = err.response?.data?.detail || err.message || 'Error scanning subreddit';
      showToast(errMsg, 'error');
      fetchDashboardData();
      console.error('Error scanning subreddit:', err);
    } finally {
      setScanning(false);
      setScanModal(false);
    }
  };

  // Trending topics for the welcome board (fetched separately from TopicSearch)
  const [welcomeTrending, setWelcomeTrending] = useState([]);
  const [welcomeDepth, setWelcomeDepth] = useState('standard');
  const [showAllTopics, setShowAllTopics] = useState(false);
  const WELCOME_DEPTHS = [
    { id: 'quick', name: 'Quick Insight', desc: 'Fast overview of major discussions', time: '~15s', color: '#8b7cff' },
    { id: 'standard', name: 'Standard Analysis', desc: 'Recommended · Balanced trends', time: '~45s', color: '#10b981' },
    { id: 'deep', name: 'Deep Research', desc: 'More signals & market opportunities', time: '~90s', color: '#3b82f6' },
    { id: 'market', name: 'Market Intelligence', desc: 'Comprehensive opportunity report', time: '~3 min', color: '#f59e0b' },
  ];
  useEffect(() => {
    axios.get(`${CONFIG.API_BASE_URL}/api/topics/trending`)
      .then(r => setWelcomeTrending(r.data || []))
      .catch(() => setWelcomeTrending([
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
      ]));
  }, []);

  // Welcome board — full-width intelligence workspace
  const welcomeBoard = (
    <div style={{ width: '100%' }}>
      <style>{`
        @keyframes float-slow {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        .welcome-topic-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 20px;
          font-size: 0.78rem; cursor: pointer; border: 1px solid var(--border-color);
          background: rgba(255,255,255,0.02); color: var(--text-muted);
          transition: all 0.2s; white-space: nowrap;
        }
        .welcome-topic-chip:hover {
          background: rgba(139,124,255,0.08); border-color: rgba(139,124,255,0.35);
          color: #fff; transform: translateY(-1px);
        }
        .welcome-depth-card {
          padding: 0.75rem 1rem; border-radius: 10px; cursor: pointer;
          border: 1px solid var(--border-color); background: rgba(255,255,255,0.01);
          transition: all 0.2s; display: flex; align-items: center; gap: 10px;
        }
        .welcome-depth-card:hover { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.12); }
        .welcome-depth-card.selected { border-color: var(--sel-color); background: rgba(255,255,255,0.025); }
        @media (max-width: 768px) {
          .welcome-depth-card {
            padding: 1rem 1.25rem !important;
            min-height: 54px !important;
          }
        }
        .welcome-search-input {
          flex: 1; background: transparent; border: none; outline: none;
          color: #ffffff; font-size: 1rem; height: 100%;
        }
        .welcome-search-input::placeholder { color: rgba(255,255,255,0.35); }
        .topics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
          transition: max-height 0.3s ease-in-out;
        }
        .topics-grid.scrollable {
          max-height: 220px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .topics-grid.scrollable::-webkit-scrollbar {
          width: 5px;
        }
        .topics-grid.scrollable::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 3px;
        }
        .topics-grid.scrollable::-webkit-scrollbar-thumb {
          background: rgba(139, 124, 255, 0.3);
          border-radius: 3px;
        }
        .topics-grid.scrollable::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 124, 255, 0.5);
        }
        .welcome-topic-chip-grid {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.76rem;
          cursor: pointer;
          border: 1px solid var(--border-color);
          background: rgba(255,255,255,0.015);
          color: #ffffff;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
          height: 44px;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          gap: 8px;
        }
        .welcome-topic-chip-grid:hover {
          background: rgba(139,124,255,0.08);
          border-color: rgba(139,124,255,0.35);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139,124,255,0.08);
        }
        .welcome-topic-chip-grid .topic-name {
          font-weight: 550;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .welcome-topic-chip-grid .topic-category {
          margin: 0;
          padding: 2px 8px;
          line-height: 1.2;
          font-size: 0.625rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-muted);
          display: inline-block;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .topics-grid {
            display: flex !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            gap: 8px !important;
            padding-bottom: 8px !important;
            -webkit-overflow-scrolling: touch;
          }
          .welcome-topic-chip-grid {
            width: auto !important;
            flex-shrink: 0 !important;
          }
        }
        .show-more-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-muted);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 10px;
        }
        .show-more-btn:hover {
          background: rgba(255, 255, 255, 0.04);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.15);
        }
      `}</style>

      {/* Hero — title + search */}
      <div style={{
        textAlign: 'center', marginBottom: '2.5rem',
        padding: '3rem 2rem 0',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem',
          padding: '5px 14px', background: 'rgba(139,124,255,0.08)', border: '1px solid rgba(139,124,255,0.2)',
          borderRadius: '20px', fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600 }}>
          <Sparkles size={12} /> Reddit Intelligence Platform
        </div>
        <h1 style={{
          fontFamily: "'Outfit','Cabinet Grotesk',sans-serif",
          fontSize: '2.5rem', fontWeight: 800, color: '#ffffff',
          marginBottom: '0.75rem', letterSpacing: '-0.5px', lineHeight: 1.15
        }}>
          Uncover Validated<br />
          <span style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Market Gaps
          </span>
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '500px', lineHeight: '1.6', margin: '0 auto 2rem' }}>
          Scan Reddit conversations in real-time to discover pain points, validate startup ideas, and map high-signal opportunities.
        </p>

        {/* Big search bar */}
        <div style={{
          maxWidth: '640px', margin: '0 auto',
          background: 'rgba(23,27,34,0.8)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px', display: 'flex', alignItems: 'center',
          padding: '0 1rem', height: '56px', gap: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset',
          backdropFilter: 'blur(12px)',
          transition: 'border-color 0.2s, box-shadow 0.2s'
        }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,124,255,0.5)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3), 0 0 0 2px rgba(139,124,255,0.15)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
        >
          <button
            onClick={async () => {
              try {
                // Show standard scan progress indicator/modal
                handleTopicSearchStart("fashion");
                
                const response = await axios.post(`${CONFIG.API_BASE_URL}/api/search/topic`, {
                  topic: "fashion",
                  depth: "standard_analysis"
                });
                
                handleTopicSearchSuccess(response.data);
              } catch (error) {
                const errMsg = error.response?.data?.detail || error.message || 'Topic analysis failed';
                handleTopicSearchError(errMsg);
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
            title="Scan Fashion"
          >
            <Search size={20} color="rgba(255,255,255,0.35)" />
          </button>
          <TopicSearch
            onSearchStart={handleTopicSearchStart}
            onSearchSuccess={handleTopicSearchSuccess}
            onSearchError={handleTopicSearchError}
            onProgressUpdate={handleProgressUpdate}
            welcomeMode={true}
            welcomeDepth={welcomeDepth}
            triggerTopic={pendingTopicTrigger}
            onCancelRef={(abortFn) => { cancelSearchRef.current = abortFn; }}
          />
        </div>
      </div>

      {/* 2-column workspace: Trending Topics + Analysis Depth */}
      <div className="welcome-board-grid" style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '1.25rem', padding: '0 2rem 2rem',
        maxWidth: '1100px', margin: '0 auto',
      }}>
        {/* Left: Trending Topics */}
        <div style={{
          background: 'rgba(23,27,34,0.6)', border: '1px solid var(--border-color)',
          borderRadius: '14px', padding: '1.5rem', backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <Sparkles size={14} color="var(--primary-color)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Trending Topics</span>
          </div>
          <div className={`topics-grid ${showAllTopics ? 'scrollable' : ''}`}>
            {(showAllTopics ? welcomeTrending : welcomeTrending.slice(0, 12)).map((item, idx) => (
              <button
                key={idx}
                className="welcome-topic-chip-grid"
                onClick={() => {
                  setWelcomeDepth('standard');
                  setPendingTopicTrigger({ topic: item.topic, ts: Date.now() });
                }}
                title={`Scan ${item.topic} (${item.category || 'General'})`}
              >
                <span className="topic-name">{item.topic}</span>
                {item.category && (
                  <span className="topic-category">
                    {item.category}
                  </span>
                )}
              </button>
            ))}
          </div>
          {welcomeTrending.length > 12 && (
            <button
              onClick={() => setShowAllTopics(!showAllTopics)}
              className="show-more-btn"
              style={{ marginBottom: '1rem' }}
            >
              {showAllTopics ? 'Show Less Topics' : `Show More (+${welcomeTrending.length - 12} topics)`}
            </button>
          )}
          {dbHasData && (
            <button
              onClick={() => setViewingMode('scan')}
              style={{
                marginTop: '1.25rem', width: '100%', padding: '0.6rem',
                background: 'transparent', border: '1px dashed rgba(255,255,255,0.08)',
                borderRadius: '8px', color: 'rgba(139,124,255,0.7)', fontSize: '0.78rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,124,255,0.25)'; e.currentTarget.style.color = '#8b7cff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(139,124,255,0.7)'; }}
            >
              ← View Previously Scanned Subreddits Dashboard
            </button>
          )}
        </div>

        {/* Right: Analysis Depth Selector */}
        <div style={{
          background: 'rgba(23,27,34,0.6)', border: '1px solid var(--border-color)',
          borderRadius: '14px', padding: '1.5rem', backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <Activity size={14} color="var(--primary-color)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Analysis Depth</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {WELCOME_DEPTHS.map(depth => {
              const isSelected = welcomeDepth === depth.id;
              return (
                <div
                  key={depth.id}
                  className={`welcome-depth-card ${isSelected ? 'selected' : ''}`}
                  style={{ '--sel-color': depth.color }}
                  onClick={() => setWelcomeDepth(depth.id)}
                >
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    border: `2px solid ${isSelected ? depth.color : 'var(--border-color)'}`,
                    background: isSelected ? depth.color : 'transparent',
                    flexShrink: 0, transition: 'all 0.15s'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isSelected ? '#fff' : 'var(--text-main)' }}>
                      {depth.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {depth.desc}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: depth.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {depth.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const analysisWorkspace = (
    <div style={{
      maxWidth: '680px',
      margin: '2rem auto',
      padding: '2.5rem',
      background: 'rgba(23, 27, 34, 0.7)',
      border: '1px solid rgba(139, 124, 255, 0.15)',
      borderRadius: '16px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      color: '#ffffff',
      textAlign: 'center',
      fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
      `}</style>

      {/* Top: Progress and Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
        <Activity size={18} style={{ color: 'var(--primary-color)', animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Analyzing:</span>
        <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #f97316, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {analysisProgress.topic || "Market Topic"}
        </span>
      </div>

      {/* Progress Bar & Percent */}
      <div style={{ width: '100%', marginBottom: '2.25rem' }}>
        <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-color)' }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${analysisProgress.percent}%`,
              background: 'linear-gradient(90deg, var(--primary-color), #b4a7ff)',
              borderRadius: '4px',
              boxShadow: '0 0 10px rgba(139, 124, 255, 0.4)',
              transition: 'width 0.4s ease-out'
            }}
          ></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
          <span>{analysisProgress.text || 'Processing signals...'}</span>
          <span style={{ color: 'white', fontWeight: 600 }}>{analysisProgress.percent}%</span>
        </div>
      </div>

      {/* Pipeline Checklist */}
      <div style={{
        width: '100%',
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '1.25rem',
        marginBottom: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        textAlign: 'left'
      }}>
        {[
          { label: 'Scanning Communities...', activeAt: 0, completeAt: 30 },
          { label: 'Extracting Discussions...', activeAt: 30, completeAt: 60 },
          { label: 'Detecting Pain Points...', activeAt: 60, completeAt: 85 },
          { label: 'Generating Opportunities...', activeAt: 85, completeAt: 100 }
        ].map((phase, idx) => {
          const isComplete = analysisProgress.percent >= phase.completeAt;
          const isActive = analysisProgress.percent >= phase.activeAt && analysisProgress.percent < phase.completeAt;
          
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: isComplete || isActive ? 1 : 0.3, transition: 'all 0.3s' }}>
              {isComplete ? (
                <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0 }} />
              ) : isActive ? (
                <div style={{ flexShrink: 0, width: '14px', height: '14px', border: '2px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid var(--border-color)', flexShrink: 0 }} />
              )}
              <span style={{
                fontSize: '0.825rem',
                fontWeight: isActive ? 600 : 500,
                color: isComplete ? 'var(--text-main)' : isActive ? '#fff' : 'var(--text-muted)'
              }}>
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Middle: Live Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        width: '100%',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '1.5rem',
        marginBottom: '2rem'
      }}>
        {[
          { label: 'Posts Analyzed', value: analysisProgress.percent > 0 ? Math.floor(analysisProgress.percent * 1.8) + 8 : 0 },
          { label: 'Communities', value: analysisProgress.count || 0 },
          { label: 'Signals Found', value: liveResults.length * 3 + Math.floor(analysisProgress.percent / 15) }
        ].map((stat, idx) => (
          <div key={idx}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{stat.label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Bottom: Scrolling Live Signals Feed */}
      <div style={{ width: '100%', textAlign: 'left' }}>
        <div style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={12} color="var(--primary-color)" /> Live Signals Feed
        </div>
        
        <div style={{
          height: '180px',
          overflowY: 'auto',
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          position: 'relative'
        }}>
          {liveResults.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.775rem' }}>
              <span style={{ display: 'inline-block', marginBottom: '4px' }}>Listening to live Reddit streams...</span>
              <div style={{ fontSize: '0.68rem', opacity: 0.6 }}>Awaiting community match triggers</div>
            </div>
          ) : (
            <AnimatePresence>
              {liveResults.map((res) => (
                <motion.div
                  key={res.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    background: 'rgba(255, 255, 255, 0.015)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <span style={{ fontSize: '1rem', lineHeight: '1', flexShrink: 0 }}>{res.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: res.color, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{res.label}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Found in {analysisProgress.subreddit || 'Reddit'}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>✓ {res.text}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Footer: Cancel Button */}
      <button 
        onClick={() => {
          if (cancelSearchRef.current) {
            cancelSearchRef.current();
          }
          setAnalysisState('idle');
          clearTopicSearch();
          if (liveResultsTimerRef.current) clearTimeout(liveResultsTimerRef.current);
          showToast('Analysis search cancelled by user.', 'error');
        }}
        className="btn-outline"
        style={{ marginTop: '1.75rem', height: '32px', fontSize: '0.75rem', width: 'fit-content', alignSelf: 'center', padding: '0 1.25rem' }}
      >
        Cancel Analysis
      </button>
    </div>
  );


  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Toast Alert */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: toast.type === 'success' ? '#10b981' : '#ef4444',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Modal overlay */}
      <AnimatePresence>
        {scanModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 17, 21, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="panel" 
              style={{ width: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textAlign: 'center' }}
            >
              <div className="spinner" style={{ width: '48px', height: '48px', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1.2s linear infinite', marginBottom: '1.5rem' }}></div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>Reddit Scanning Engine Active</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', minHeight: '36px' }}>{scanStep}</p>
              <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                <motion.div 
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 6, ease: 'linear' }}
                  style={{ height: '100%', background: 'var(--primary-color)' }}
                ></motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Overview • {dateStr}
        </div>
        {viewingMode !== 'empty' && (
          <TopicSearch 
            onSearchStart={handleTopicSearchStart}
            onSearchSuccess={handleTopicSearchSuccess}
            onSearchError={handleTopicSearchError}
          />
        )}
      </div>

      {/* TOPIC SCAN ACTIVE REPORT BANNER */}
      {viewingMode === 'topic' && activeTopicSearch && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel"
          style={{ 
            background: 'rgba(139, 124, 255, 0.04)',
            borderColor: 'rgba(139, 124, 255, 0.25)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(139, 124, 255, 0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: '#8b7cff',
                boxShadow: '0 0 10px #8b7cff',
                animation: 'pulse 1.5s infinite ease-in-out'
              }}></div>
              <div>
                <span style={{ color: '#b3a9ff', fontSize: '0.675rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Viewing: {activeTopicSearch} (cached)</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'baseline', gap: '8px', margin: '2px 0 0 0', fontFamily: 'Cabinet Grotesk, sans-serif' }}>
                  {activeTopicSearch}
                  <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#8b7cff', background: 'rgba(139, 124, 255, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    {activeTopicDepth}
                  </span>
                </h2>
              </div>
            </div>
            
            <button 
              onClick={clearTopicSearch}
              className="btn-primary"
              style={{ 
                background: 'linear-gradient(135deg, #8b7cff, #6d5ae6)',
                height: '32px',
                padding: '0 1rem',
                fontSize: '0.75rem',
                boxShadow: '0 4px 15px rgba(139, 124, 255, 0.2)'
              }}
            >
              <RotateCcw size={12} style={{ marginRight: '4px' }} /> Reset Search
            </button>
          </div>

          {/* List of scanned subreddits */}
          {scannedSubreddits && scannedSubreddits.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Scanned Subreddits ({scannedSubreddits.length})
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {scannedSubreddits.map((sub, idx) => (
                  <span 
                    key={idx}
                    style={{ 
                      fontSize: '0.7rem', 
                      background: 'var(--hover-bg)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-main)', 
                      padding: '3px 8px', 
                      borderRadius: '6px',
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--success-color)' }}></span>
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* DATABASE SCAN ACTIVE REPORT BANNER */}
      {viewingMode === 'scan' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel"
          style={{ 
            background: 'rgba(16, 185, 129, 0.04)',
            borderColor: 'rgba(16, 185, 129, 0.25)',
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: '#10b981',
              boxShadow: '0 0 10px #10b981',
              animation: 'pulse 1.5s infinite ease-in-out'
            }}></div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.675rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Database Status</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white', margin: '2px 0 0 0', fontFamily: 'Cabinet Grotesk, sans-serif' }}>
                Viewing Indexed Subreddits Dashboard
              </h2>
            </div>
          </div>
          
          <button 
            onClick={() => setViewingMode('empty')}
            className="btn-outline"
            style={{ 
              height: '32px',
              padding: '0 1rem',
              fontSize: '0.75rem',
            }}
          >
            Clear Scan View
          </button>
        </motion.div>
      )}

      {viewingMode === 'empty' ? (
        analysisState === 'scanning' ? (
          analysisWorkspace
        ) : (
          welcomeBoard
        )
      ) : (
        <>
          <div className="overview-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h1 className="editorial-headline" style={{ 
                fontFamily: "'Cabinet Grotesk', 'Clash Display', -apple-system, sans-serif",
                fontSize: '1.85rem', 
                lineHeight: '1.18', 
                fontWeight: '600', 
                letterSpacing: '-0.025em',
                marginBottom: '0.5rem',
                maxWidth: '92%'
              }}>
                The problems people ignore today become the startups of tomorrow.
              </h1>
              <p style={{ 
                color: 'var(--text-muted)', 
                fontSize: '0.9rem', 
                lineHeight: '1.5',
                marginBottom: '1.25rem', 
                maxWidth: '82%',
                opacity: 0.85
              }}>
                We scan millions of Reddit conversations to uncover real frustrations, recurring pain points, and high potential startup opportunities.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Enter subreddit or custom RSS feed URL..."
                  style={{ 
                    background: 'var(--panel-bg)', 
                    color: '#fff', 
                    border: '1px solid var(--border-color)', 
                    padding: '0.4rem 0.85rem', 
                    height: '36px',
                    borderRadius: '6px', 
                    fontSize: '0.825rem', 
                    outline: 'none',
                    width: '320px',
                    transition: 'border-color 0.2s'
                  }}
                />
                <button onClick={() => { if (!user) { loginWithGoogle(); } else { handleScanReddit(); } }} className="btn-primary">
                  <Search size={14} /> Scan Reddit Now
                </button>
              </div>
            </div>

            <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '260px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Opportunity Score Index</h3>
                <select style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', fontSize: '0.75rem', outline: 'none' }}>
                  <option>This Month</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                    <Line type="monotone" dataKey="score" stroke="var(--primary-color)" strokeWidth={2} dot={{ fill: 'var(--primary-color)', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {stats.oppChange && (
                <div style={{ fontSize: '0.75rem', color: 'var(--success-color)', marginTop: '0.5rem', fontWeight: 500 }}>
                  {stats.oppChange}
                </div>
              )}
            </div>
          </div>

          {/* Dashboard cards */}
          <div className="overview-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
            {[
              { label: 'Posts Analyzed', value: stats.postsAnalyzed, change: stats.postsChange },
              { label: 'Pain Points Found', value: stats.painPointsFound, change: stats.painChange },
              { label: 'Startup Ideas', value: stats.startupIdeas, change: stats.ideasChange },
              { label: 'Opportunity Score', value: stats.opportunityScore, change: stats.oppChange }
            ].map((stat, idx) => (
              <div key={idx} className="panel">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{stat.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stat.value}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--success-color)' }}>{stat.change}</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--border-color)' }}>vs last month</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Syncing dashboard stats...</span>
            </div>
          ) : (
            <>
              {/* Top Pain Points table */}
              <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Top Pain Points</h2>
                  <span onClick={() => navigate('/pain-points')} style={{ fontSize: '0.875rem', color: 'var(--primary-color)', cursor: 'pointer' }}>View all</span>
                </div>
                <div className="panel" style={{ padding: '0', overflowX: 'auto' }}>
                  <div style={{ minWidth: '600px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 120px', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <div>#</div>
                      <div>Pain Point</div>
                      <div style={{ textAlign: 'right' }}>Volume</div>
                      <div style={{ textAlign: 'right' }}>Opportunity Score</div>
                    </div>
                    {painPoints.map((item, idx) => (
                      <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 120px', padding: '1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{idx + 1}</div>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.2rem' }}>{item.topic_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Keywords: {item.keywords}</div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{item.size} posts</div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'inline-block', width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', lineHeight: '30px', textAlign: 'center', fontSize: '0.875rem', fontWeight: 600 }}>{Math.round(item.opportunity_score)}</span>
                        </div>
                      </div>
                    ))}
                    {painPoints.length === 0 && (
                      <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        No pain points discovered. Start by scanning subreddits or searching a topic!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Latest Discoveries Feed */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Latest Pain Point Discoveries</h2>
                  <span onClick={() => navigate('/pain-points')} style={{ fontSize: '0.875rem', color: 'var(--primary-color)', cursor: 'pointer' }}>View all</span>
                </div>
                <div className="overview-discoveries-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                  {discoveries.map((item, idx) => (
                    <div key={idx} className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Activity size={14} color="var(--primary-color)" />
                        <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item.subreddit}</span> • {new Date(item.created_utc * 1000).toLocaleTimeString()}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '1.5rem', flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        "{item.title}"
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                        <span>Score: <strong>↑ {item.score}</strong></span>
                        <span style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }} onClick={() => window.open(item.url || 'https://reddit.com', '_blank', 'noopener,noreferrer')}>
                          Source <ArrowUpRight size={10} />
                        </span>
                      </div>
                    </div>
                  ))}
                  {discoveries.length === 0 && (
                    <div style={{ gridColumn: 'span 3', padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }} className="panel">
                      No discoveries indexed yet. Start a subreddit scan or search above!
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </motion.div>
  );
}

export default Overview;
