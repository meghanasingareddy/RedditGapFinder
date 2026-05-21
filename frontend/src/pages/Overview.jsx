import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { CONFIG } from '../config';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, Search, Activity, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    fetchDashboardData();
  }, []);

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
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Overview • {dateStr}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
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
          <span style={{ color: 'var(--text-muted)' }}>Synching dashboard stats...</span>
        </div>
      ) : (
        <>
          {/* Top Pain Points table */}
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Top Pain Points</h2>
              <span onClick={() => navigate('/pain-points')} style={{ fontSize: '0.875rem', color: 'var(--primary-color)', cursor: 'pointer' }}>View all</span>
            </div>
            <div className="panel" style={{ padding: '0' }}>
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
            </div>
          </div>

          {/* Latest Discoveries Feed */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Latest Pain Point Discoveries</h2>
              <span onClick={() => navigate('/pain-points')} style={{ fontSize: '0.875rem', color: 'var(--primary-color)', cursor: 'pointer' }}>View all</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
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
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default Overview;
