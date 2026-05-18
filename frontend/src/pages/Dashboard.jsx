import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const trendData = [
  { name: 'Mon', complaints: 4000, opportunities: 2400 },
  { name: 'Tue', complaints: 3000, opportunities: 1398 },
  { name: 'Wed', complaints: 2000, opportunities: 9800 },
  { name: 'Thu', complaints: 2780, opportunities: 3908 },
  { name: 'Fri', complaints: 1890, opportunities: 4800 },
  { name: 'Sat', complaints: 2390, opportunities: 3800 },
  { name: 'Sun', complaints: 3490, opportunities: 4300 },
];

const topCategories = [
  { name: 'Productivity', score: 98 },
  { name: 'Job Search', score: 92 },
  { name: 'AI Tools', score: 85 },
  { name: 'Finance', score: 78 },
  { name: 'DevTools', score: 74 },
];

function Dashboard() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="page-container"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Trend Visualization Dashboard</h2>
        <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '0.5rem 1rem', borderRadius: '1rem', color: 'var(--accent-color)', fontWeight: 'bold' }}>
          Live Updates Active
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Main Chart */}
        <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Complaint Trends vs Opportunity Score</h3>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOpps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="complaints" stroke="#ef4444" fillOpacity={1} fill="url(#colorComplaints)" />
                <Area type="monotone" dataKey="opportunities" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorOpps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Top Opportunities This Week</h3>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCategories} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#f8fafc" />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="score" fill="var(--accent-color)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Dashboard;
