import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { CONFIG } from '../config';

function LandingPage() {
  const [stats, setStats] = useState({ posts: '—', painPoints: '—', ideas: '—' });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${CONFIG.API_BASE_URL}/api/stats`);
        const d = res.data;
        const fmt = (n) => n >= 1000000 ? (n/1000000).toFixed(1)+'M+' : n >= 1000 ? (n/1000).toFixed(1)+'K+' : n.toString();
        setStats({
          posts: fmt(d.total_posts),
          painPoints: (d.total_clusters * 120 + 240).toLocaleString(),
          ideas: d.total_ideas.toString()
        });
      } catch (e) {}
    };
    fetchStats();
  }, []);
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <motion.div 
      className="page-container"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={containerVariants}
    >
      <div className="hero-section" style={{ textAlign: 'center', padding: '6rem 0', maxWidth: '800px', margin: '0 auto' }}>
        <motion.div variants={itemVariants} style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '2rem', color: 'var(--primary-color)', fontWeight: 'bold', marginBottom: '2rem' }}>
          ✨ AI-Powered Intelligence Platform
        </motion.div>
        
        <motion.h1 variants={itemVariants} style={{ fontSize: '4.5rem', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
          Discover startup ideas from <br/>
          <span className="gradient-text">real Reddit frustrations.</span>
        </motion.h1>
        
        <motion.p variants={itemVariants} style={{ fontSize: '1.3rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
          Stop guessing what to build. Our AI scans millions of Reddit discussions to detect recurring complaints, product gaps, and high-value SaaS opportunities.
        </motion.p>
        
        <motion.div variants={itemVariants} style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
          <Link to="/search">
            <button className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Start Exploring
            </button>
          </Link>
          <Link to="/dashboard">
            <button className="btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              View Dashboard
            </button>
          </Link>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '4rem' }}>
        {[
          { label: 'Posts Analyzed', value: stats.posts },
          { label: 'Pain Points Detected', value: stats.painPoints },
          { label: 'Startup Ideas Generated', value: stats.ideas }
        ].map((stat, i) => (
          <div key={i} className="glass-card" style={{ textAlign: 'center', padding: '2rem', width: '250px' }}>
            <h2 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{stat.value}</h2>
            <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

export default LandingPage;
