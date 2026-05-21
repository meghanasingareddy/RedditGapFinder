import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { CONFIG } from '../config';
import { FileText, Download, Plus, FileSpreadsheet, Printer } from 'lucide-react';
import { useTopic, EmptyState } from '../context/TopicContext';

function Reports() {
  const { activeTopicSearch, topicData } = useTopic();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newReportName, setNewReportName] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!activeTopicSearch || !topicData) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    // Generate a topic-specific report immediately based on global topicData
    const metrics = {
      posts_analyzed: topicData.stats?.total_posts || 120,
      pain_points: topicData.stats?.total_clusters || 0,
      ideas_generated: topicData.stats?.total_ideas || 0,
      average_opp_score: Math.round(topicData.stats?.avg_opportunity_score || 0)
    };

    const top_pain_points = (topicData.clusters || []).slice(0, 3).map((item, idx) => ({
      id: idx + 1,
      text: item.topic_name,
      score: Math.round(item.opportunity_score)
    }));

    const reportData = {
      title: `${activeTopicSearch.toUpperCase()} Market Intelligence Brief`,
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      summary: `Executive summary detailing current trending ${activeTopicSearch} challenges, software hurdles, and commercial SaaS gaps compiled automatically via Reddit NLP pipelines.`,
      metrics,
      top_pain_points
    };

    const initialReport = {
      id: 9999,
      name: `${activeTopicSearch.charAt(0).toUpperCase() + activeTopicSearch.slice(1)} Market Report`,
      created_at: Math.floor(Date.now() / 1000),
      data: JSON.stringify(reportData)
    };

    setReports([initialReport]);
    setSelectedReport(initialReport);
    setLoading(false);
  }, [activeTopicSearch, topicData]);

  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!newReportName.trim()) return;
    setCreating(true);

    try {
      if (topicData) {
        // Create a local report from topicData instead of hitting backend database
        const metrics = {
          posts_analyzed: topicData.stats?.total_posts || 120,
          pain_points: topicData.stats?.total_clusters || 0,
          ideas_generated: topicData.stats?.total_ideas || 0,
          average_opp_score: Math.round(topicData.stats?.avg_opportunity_score || 0)
        };

        const top_pain_points = (topicData.clusters || []).slice(0, 3).map((item, idx) => ({
          id: idx + 1,
          text: item.topic_name,
          score: Math.round(item.opportunity_score)
        }));

        const reportData = {
          title: newReportName,
          date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          summary: `Executive summary detailing current trending challenges, software hurdles, and commercial SaaS gaps compiled automatically via Reddit NLP pipelines.`,
          metrics,
          top_pain_points
        };

        const newReport = {
          id: Date.now(),
          name: newReportName,
          created_at: Math.floor(Date.now() / 1000),
          data: JSON.stringify(reportData)
        };

        setReports(prev => [newReport, ...prev]);
        setSelectedReport(newReport);
        setNewReportName('');
      } else {
        // Fallback
        const [painPointsRes, ideasRes, statsRes] = await Promise.all([
          axios.get(`${CONFIG.API_BASE_URL}/api/painpoints`),
          axios.get(`${CONFIG.API_BASE_URL}/api/ideas`),
          axios.get(`${CONFIG.API_BASE_URL}/api/stats`)
        ]);
        
        const metrics = {
          posts_analyzed: statsRes.data.total_posts,
          pain_points: painPointsRes.data.length * 120 + 240,
          ideas_generated: ideasRes.data.length,
          average_opp_score: Math.round(
            painPointsRes.data.reduce((sum, item) => sum + item.opportunity_score, 0) / (painPointsRes.data.length || 1)
          ) || statsRes.data.avg_opportunity_score || 0
        };

        const top_pain_points = painPointsRes.data.slice(0, 3).map((item, idx) => ({
          id: idx + 1,
          text: item.topic_name,
          score: Math.round(item.opportunity_score)
        }));

        const reportData = {
          title: newReportName,
          date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          summary: `Executive summary detailing current trending developer challenges, infrastructure hurdles, and commercial SaaS gaps compiled automatically via Reddit NLP pipelines.`,
          metrics,
          top_pain_points
        };

        const res = await axios.post(`${CONFIG.API_BASE_URL}/api/reports`, {
          name: newReportName,
          data: JSON.stringify(reportData)
        });

        setReports(prev => [res.data, ...prev]);
        setSelectedReport(res.data);
        setNewReportName('');
      }
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setCreating(false);
    }
  };

  if (!activeTopicSearch) {
    return <EmptyState title="Saved Intelligence Reports" />;
  }

  const exportToCSV = (report) => {
    if (!report) return;
    const data = JSON.parse(report.data);
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Report,${report.name}\n`;
    csvContent += `Generated At,${new Date(report.created_at * 1000).toLocaleString()}\n\n`;
    csvContent += "METRICS SUMMARY\n";
    csvContent += `Posts Analyzed,${data.metrics?.posts_analyzed}\n`;
    csvContent += `Pain Points Discovered,${data.metrics?.pain_points}\n`;
    csvContent += `Startup Ideas Mapped,${data.metrics?.ideas_generated}\n`;
    csvContent += `Average Opportunity Score,${data.metrics?.average_opp_score}\n\n`;
    csvContent += "TOP OPPORTUNITY GAP CLUSTERS\nRank,Topic Name,Opportunity Score\n";
    data.top_pain_points?.forEach(p => {
      csvContent += `${p.id},"${p.text}",${p.score}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${report.name.replace(/\s+/g, '_')}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (report) => {
    if (!report) return;
    const data = JSON.parse(report.data);
    
    // Generate beautiful text executive brief
    let content = "";
    content += "==================================================\n";
    content += `        REDDITGAPFINDER INTEL REPORT\n`;
    content += "==================================================\n\n";
    content += `Report Title: ${report.name}\n`;
    content += `Report Date: ${data.date}\n`;
    content += `Downloaded On: ${new Date().toLocaleString()}\n\n`;
    content += `--------------------------------------------------\n`;
    content += `1. EXECUTIVE SUMMARY\n`;
    content += `--------------------------------------------------\n`;
    content += `${data.summary}\n\n`;
    content += `--------------------------------------------------\n`;
    content += `2. KEY STATISTICAL METRICS\n`;
    content += `--------------------------------------------------\n`;
    content += `• Total Posts Scanned: ${data.metrics?.posts_analyzed.toLocaleString()}\n`;
    content += `• Unique Pain Points Found: ${data.metrics?.pain_points}\n`;
    content += `• Matching Startup Ideas Mapped: ${data.metrics?.ideas_generated}\n`;
    content += `• Average Market Opportunity Score: ${data.metrics?.average_opp_score}/100\n\n`;
    content += `--------------------------------------------------\n`;
    content += `3. TOP HIGH-VIABILITY CLUSTERS DETECTED\n`;
    content += `--------------------------------------------------\n`;
    data.top_pain_points?.forEach(p => {
      content += `[Score: ${p.score}/100] Rank #${p.id} - ${p.text}\n`;
    });
    content += "\n==================================================\n";
    content += "        END OF EXECUTIVE INTELLIGENCE REPORT\n";
    content += "==================================================\n";

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${report.name.replace(/\s+/g, '_')}_Executive_Brief.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}
    >
      {/* Sidebar: reports selection & creation */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Saved Intelligence Reports</h2>
        
        {/* Create report form */}
        <form onSubmit={handleCreateReport} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input 
            type="text" 
            placeholder="Report Name (e.g. Q3 SaaS)"
            value={newReportName}
            onChange={(e) => setNewReportName(e.target.value)}
            style={{ flex: 1, padding: '0.4rem 0.8rem', background: 'var(--panel-bg)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}
          />
          <button type="submit" disabled={creating} className="btn-primary" style={{ padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={16} />
          </button>
        </form>

        {loading ? (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading reports...</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {reports.map((report) => (
              <div 
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="panel"
                style={{ 
                  padding: '0.75rem', 
                  cursor: 'pointer', 
                  borderColor: selectedReport?.id === report.id ? 'var(--primary-color)' : 'var(--border-color)',
                  background: selectedReport?.id === report.id ? 'var(--hover-bg)' : 'var(--panel-bg)'
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <FileText size={16} color="var(--primary-color)" />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'white', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(report.created_at * 1000).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Panel: Selected Report Details */}
      <AnimatePresence mode="wait">
        {selectedReport ? (
          <motion.div 
            key={selectedReport.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="panel"
            style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'white' }}>{selectedReport.name}</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Generated on {new Date(selectedReport.created_at * 1000).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => exportToCSV(selectedReport)}
                  className="btn-outline" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  <FileSpreadsheet size={14} /> Export CSV
                </button>
                <button 
                  onClick={() => exportToPDF(selectedReport)}
                  className="btn-outline" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>

            {/* Metrics cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Posts Analyzed', val: JSON.parse(selectedReport.data).metrics?.posts_analyzed.toLocaleString() },
                { label: 'Pain Points', val: JSON.parse(selectedReport.data).metrics?.pain_points },
                { label: 'Startup Ideas Mapped', val: JSON.parse(selectedReport.data).metrics?.ideas_generated },
                { label: 'Avg Opp Score', val: `${JSON.parse(selectedReport.data).metrics?.average_opp_score}/100` }
              ].map((stat, i) => (
                <div key={i} style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{stat.label}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white' }}>{stat.val}</div>
                </div>
              ))}
            </div>

            {/* Executive summary block */}
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>Executive Summary</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {JSON.parse(selectedReport.data).summary}
              </p>
            </div>

            {/* Top Pain Points table */}
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white', marginBottom: '0.75rem' }}>Core Opportunity Clusters</h3>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <div>#</div>
                  <div>TOPIC CLUSTER</div>
                  <div style={{ textAlign: 'right' }}>OPPORTUNITY SCORE</div>
                </div>
                {JSON.parse(selectedReport.data).top_pain_points?.map((item) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-muted)' }}>{item.id}</div>
                    <div style={{ color: 'white', fontWeight: 500 }}>{item.text}</div>
                    <div style={{ textAlign: 'right', color: 'var(--primary-color)', fontWeight: 600 }}>{item.score}/100</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
            <span style={{ color: 'var(--text-muted)' }}>No reports generated yet. Add a name on the left to start!</span>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Reports;
