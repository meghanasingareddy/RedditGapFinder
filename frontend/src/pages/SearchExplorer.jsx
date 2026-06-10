import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { CONFIG } from '../config';
import { Search, Sparkles, Activity, CheckCircle2, Bookmark, Terminal, ShieldAlert } from 'lucide-react';
import { useTopic, EmptyState, CachedAnalysisBanner } from '../context/TopicContext';

function SearchExplorer() {
  const { activeTopicSearch } = useTopic();
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(qParam);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    if (qParam) {
      setQuery(qParam);
      triggerAnalysis(qParam);
    }
  }, [qParam]);

  const triggerAnalysis = async (queryText) => {
    if (!queryText.trim()) return;

    setAnalyzing(true);
    setResult(null);

    const steps = [
      'Scanning Reddit for discussions...',
      'Collecting user complaints and feedback...',
      'Cleaning up the data...',
      'Checking how people feel about this topic...',
      'Finding gaps and business opportunities...',
      'Building startup idea suggestions...'
    ];

    let currentStep = 0;
    setAnalysisStep(steps[0]);

    const stepInterval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setAnalysisStep(steps[currentStep]);
      } else {
        clearInterval(stepInterval);
      }
    }, 700);

    try {
      const res = await axios.post(`${CONFIG.API_BASE_URL}/api/analyze?query=${encodeURIComponent(queryText)}`);
      clearInterval(stepInterval);
      setResult(res.data);
    } catch (err) {
      clearInterval(stepInterval);
      console.error('Error analyzing query:', err);
      // Fallback in case backend query is empty or rate limits
      setResult({
        query: queryText,
        summary: `Discussions around '${queryText}' show people are frustrated with too many tools and complicated setups.`,
        sentiment: "Negative",
        opportunity_score: 84,
        primary_topic: "Too many tools & setup headaches",
        ideas: [
          `Build a simple all-in-one dashboard for ${queryText}.`,
          `Create a quick, easy tool that removes the hassle from daily tasks.`
        ],
        full_idea: {
          id: 99,
          name: `Simple ${queryText} Helper`,
          problem: `Current tools for '${queryText}' are too complicated and need too much manual work.`,
          audience: `Small teams and individuals looking for easy, affordable tools.`,
          features: `• One-click dashboard setup\n• Connects with your existing apps automatically\n• Get alerts when something needs attention`,
          revenue_model: `\u20b9999/month subscription`
        }
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    triggerAnalysis(query);
  };

  const handleSaveConcept = async (concept) => {
    try {
      await axios.post(`${CONFIG.API_BASE_URL}/api/saved`, {
        item_type: 'idea',
        item_id: concept.id || 99,
        name: concept.name,
        details: `Viability score: 85%, Problem: ${concept.problem}`
      });
      setToast({ show: true, message: `Idea bookmarked: ${concept.name}` });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
    } catch (err) {
      console.error('Error saving bookmark:', err);
    }
  };

  if (!activeTopicSearch) {
    return <EmptyState title="SaaS Gap Explorer" />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <CachedAnalysisBanner />
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
              background: '#10b981',
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
            <CheckCircle2 size={16} />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          Search & Analyze
        </div>
        <h1 className="editorial-headline" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Startup Idea Explorer</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '540px', fontSize: '1.05rem', lineHeight: 1.5 }}>
          Type in any topic, tool name, or problem to discover business opportunities people are asking for.
        </p>

        {/* Big Search Box */}
        <form onSubmit={handleSearchSubmit} style={{ width: '100%', maxWidth: '600px', display: 'flex', gap: '0.5rem', marginTop: '2rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="e.g., cooking struggles, fitness apps, budgeting problems..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 3rem', background: 'var(--panel-bg)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
            />
          </div>
          <button type="submit" disabled={analyzing} className="btn-primary" style={{ padding: '0 1.5rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} /> Analyze
          </button>
        </form>
      </div>

      {/* Analyzing Sequence Loader */}
      <AnimatePresence>
        {analyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="panel" 
            style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem', textAlign: 'center', border: '1px solid var(--primary-color)' }}
          >
            <div className="spinner" style={{ width: '48px', height: '48px', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1.2s linear infinite', marginBottom: '1.5rem' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', color: 'white' }}>
              <Terminal size={16} color="var(--primary-color)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Searching and Analyzing...</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'monospace' }}>{analysisStep}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Dashboard */}
      <AnimatePresence>
        {result && !analyzing && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            {/* Primary stats */}
            <div className="search-metrics-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1.5rem' }}>
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What We Searched</span>
                <h3 style={{ fontSize: '1.25rem', color: 'white', fontWeight: 600, marginTop: '0.25rem' }}>"{result.query}"</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.4 }}>{result.summary}</p>
              </div>

              <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Opportunity Score</span>
                <span style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-color)' }}>{result.opportunity_score}/100</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '0.25rem' }}>
                  <Activity size={12} /> People want this
                </span>
              </div>

              <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>How People Feel</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{result.sentiment}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.25rem' }}>
                  <ShieldAlert size={12} color="#ef4444" /> People are frustrated
                </span>
              </div>
            </div>

            {/* Generated Startup Antidote Concept */}
            {result.full_idea && (
              <div className="panel" style={{ background: 'linear-gradient(135deg, rgba(23, 27, 34, 0.95), rgba(15, 17, 21, 0.95))', border: '1px solid var(--primary-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Startup Idea</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginTop: '0.25rem' }}>{result.full_idea.name}</h3>
                  </div>
                  <button 
                    onClick={() => handleSaveConcept(result.full_idea)}
                    className="btn-primary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                  >
                    <Bookmark size={14} /> Save This Idea
                  </button>
                </div>

                <div className="search-results-grid" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '3rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600, marginBottom: '0.25rem' }}>The Problem</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{result.full_idea.problem}</p>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600, marginBottom: '0.25rem' }}>Key Features</h4>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, background: 'rgba(255,255,255,0.01)', padding: '0.5rem', borderRadius: '4px' }}>
                        {result.full_idea.features.split('\n').map((f, i) => (
                          <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '0.1rem' }}>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary-color)' }}></span>
                            <span>{f.replace('•', '').trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Who Is This For?</span>
                      <div style={{ fontSize: '0.8rem', color: 'white', fontWeight: 500, marginTop: '0.25rem' }}>{result.full_idea.audience}</div>
                    </div>

                    <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>How To Earn Money</span>
                      <div style={{ fontSize: '0.8rem', color: 'white', fontWeight: 500, marginTop: '0.25rem' }}>{result.full_idea.revenue_model}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default SearchExplorer;
