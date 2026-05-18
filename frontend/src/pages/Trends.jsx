import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  ResponsiveContainer, 
  LineChart, Line, 
  BarChart, Bar, 
  AreaChart, Area, 
  XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';

function Trends() {
  const [trends, setTrends] = useState([]);
  const [painPoints, setPainPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('This Month');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendsRes, painPointsRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/trends'),
          axios.get('http://127.0.0.1:8000/api/painpoints')
        ]);
        setTrends(trendsRes.data);
        setPainPoints(painPointsRes.data);
      } catch (err) {
        console.error('Error fetching trends:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Static mock series for date filtering
  const timelineData = [
    { date: 'May 01', CS: 75, SaaS: 80, Finance: 65 },
    { date: 'May 05', CS: 78, SaaS: 82, Finance: 70 },
    { date: 'May 09', CS: 85, SaaS: 88, Finance: 72 },
    { date: 'May 13', CS: 88, SaaS: 84, Finance: 78 },
    { date: 'May 18', CS: 92, SaaS: 89, Finance: 85 },
  ];

  const sentimentData = [
    { name: 'Very Negative', count: 45, fill: '#ef4444' },
    { name: 'Negative', count: 35, fill: '#f59e0b' },
    { name: 'Neutral', count: 15, fill: '#8b7cff' },
    { name: 'Positive', count: 5, fill: '#10b981' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Analytics & Trends
          </div>
          <h1 className="editorial-headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Opportunity Intelligence</h1>
          <p style={{ color: 'var(--text-muted)' }}>Visualize market signals, sentiment shifts, and pain point growth vectors.</p>
        </div>
        <select 
          value={filterPeriod} 
          onChange={(e) => setFilterPeriod(e.target.value)} 
          style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '6px', outline: 'none', cursor: 'pointer' }}
        >
          <option>This Week</option>
          <option>This Month</option>
          <option>Last 90 Days</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '1rem' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ color: 'var(--text-muted)' }}>Analyzing Market Signals...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Main Chart: Timeline Area */}
          <div className="panel" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.5rem' }}>Opportunity Index Over Time (By Cluster Type)</h3>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorCS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSaaS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} domain={[40, 100]} />
                  <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" name="Career & Recruiting" dataKey="CS" stroke="var(--primary-color)" fillOpacity={1} fill="url(#colorCS)" strokeWidth={2} />
                  <Area type="monotone" name="SaaS Subscription" dataKey="SaaS" stroke="#06b6d4" fillOpacity={1} fill="url(#colorSaaS)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Sentiment breakdown */}
            <div className="panel" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.5rem' }}>Sentiment Distribution (All Reddit Mentions)</h3>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sentimentData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="var(--text-main)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {sentimentData.map((entry, index) => (
                        <rect key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subreddit Growth Activity */}
            <div className="panel" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.5rem' }}>Mentions & Activity Growth</h3>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="topic" stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val) => val.split(' ')[0]} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                    <Bar dataKey="mentions" name="Mentions" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Table summary of trends */}
          <div className="panel" style={{ padding: '0' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Trend Growth Indexes</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              <div>TOPIC</div>
              <div style={{ textAlign: 'right' }}>MENTIONS</div>
              <div style={{ textAlign: 'right' }}>GROWTH RATE</div>
              <div style={{ textAlign: 'right' }}>INDEX</div>
            </div>
            {trends.map((tr) => (
              <div key={tr.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>{tr.topic}</div>
                <div style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{tr.mentions}</div>
                <div style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--success-color)', fontWeight: 500 }}>↑ {tr.growth_percent}%</div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>HOT</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default Trends;
