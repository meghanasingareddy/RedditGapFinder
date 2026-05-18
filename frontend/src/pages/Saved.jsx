import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Bookmark, Trash2, Lightbulb, AlertTriangle, ExternalLink } from 'lucide-react';

function Saved() {
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchSavedItems();
  }, []);

  const fetchSavedItems = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/saved');
      setSavedItems(res.data);
    } catch (err) {
      console.error('Error fetching saved items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (id) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/saved/${id}`);
      setSavedItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting saved item:', err);
    }
  };

  const filteredItems = savedItems.filter(item => {
    if (activeTab === 'all') return true;
    return item.item_type === activeTab;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Personal Portfolio
          </div>
          <h1 className="editorial-headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Saved Gaps & Ideas</h1>
          <p style={{ color: 'var(--text-muted)' }}>Keep track of the high-potential problems and business concepts you discover.</p>
        </div>

        {/* Tab filters */}
        <div style={{ display: 'flex', background: 'var(--panel-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          {['all', 'idea', 'painpoint'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--hover-bg)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'painpoint' ? 'Pain Points' : tab + 's'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Loading bookmarks...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
          <Bookmark size={32} color="var(--border-color)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1rem', color: 'white', marginBottom: '0.5rem' }}>No items bookmarked yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '360px' }}>
            Go to Pain Points, Startup Ideas, or Search Explorer pages and save high-potential gaps to see them here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="panel"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  borderTop: `4px solid ${item.item_type === 'idea' ? 'var(--primary-color)' : '#ef4444'}` 
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      background: item.item_type === 'idea' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: item.item_type === 'idea' ? 'var(--primary-color)' : '#ef4444',
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {item.item_type === 'idea' ? <Lightbulb size={12} /> : <AlertTriangle size={12} />}
                      {item.item_type === 'idea' ? 'Startup Idea' : 'Pain Point'}
                    </span>
                    <button 
                      onClick={() => handleUnsave(item.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white', marginBottom: '0.75rem' }}>{item.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                    {item.details}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span>Saved: {new Date(item.saved_at * 1000).toLocaleDateString()}</span>
                  <span style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontWeight: 500 }}>
                    Details <ExternalLink size={10} />
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export default Saved;
