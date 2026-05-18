import React from 'react';

function RightSidebar() {
  const trending = [
    { name: 'r/cscareerquestions', posts: '1.2k', growth: '+ 32%', data: [5, 10, 5, 20, 8, 15] },
    { name: 'r/SaaS', posts: '982', growth: '+ 28%', data: [10, 15, 10, 25, 12, 18] },
    { name: 'r/startups', posts: '756', growth: '+ 18%', data: [8, 12, 5, 15, 10, 14] },
    { name: 'r/Entrepreneur', posts: '643', growth: '+ 16%', data: [2, 8, 4, 12, 6, 10] },
  ];

  return (
    <div className="right-sidebar">
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Trending Subreddits</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', cursor: 'pointer' }}>View all</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {trending.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--panel-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', border: '1px solid var(--border-color)' }}>
                  {item.name[2].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.posts} posts</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: 'var(--success-color)', fontSize: '0.75rem', fontWeight: 500 }}>{item.growth}</span>
                <div style={{ width: '40px', height: '15px' }}>
                  <svg viewBox="0 0 40 15" width="100%" height="100%" preserveAspectRatio="none">
                    <polyline fill="none" stroke="var(--success-color)" strokeWidth="2" points="0,10 8,5 16,12 24,4 32,8 40,2" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Sentiment Overview</h3>
          <select style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', fontSize: '0.75rem', outline: 'none' }}>
            <option>This Month</option>
            <option>This Week</option>
          </select>
        </div>
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
          {/* Placeholder for Doughnut Chart using simple CSS */}
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '8px solid #ef4444', borderTopColor: '#f59e0b', borderRightColor: '#8b7cff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>24.5K</span>
            <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Mentions</span>
          </div>
          <div style={{ flex: 1, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}><span style={{ color: '#ef4444' }}>●</span> Very Negative</span>
              <span>45%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}><span style={{ color: '#f59e0b' }}>●</span> Negative</span>
              <span>35%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}><span style={{ color: '#8b7cff' }}>●</span> Neutral</span>
              <span>15%</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Top Startup Ideas</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', cursor: 'pointer' }}>View all</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { title: 'AI Resume Coach', desc: 'Matches resumes to job descriptions', score: 92 },
            { title: 'StudyBuddy AI', desc: 'Personalized study plans using AI', score: 89 },
            { title: 'SaaS Pricing Radar', desc: 'Helps founders choose the right pricing', score: 87 }
          ].map((idea, idx) => (
            <div key={idx} className="panel" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>{idea.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{idea.desc}</div>
              </div>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 600 }}>
                {idea.score}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RightSidebar;
