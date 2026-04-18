import React, { useState } from 'react';
import { Globe, ArrowRight, Loader2, Zap, Clock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const FEATURES = [
  { icon: '🕸️', title: 'Dependency Graph', desc: 'Interactive visual map of all file relationships' },
  { icon: '🤖', title: 'AI Summaries', desc: 'Plain-English explanation of every file\'s purpose' },
  { icon: '⚡', title: 'Entry Point Detection', desc: 'Automatically identifies main starting files' },
  { icon: '🔥', title: 'High-Impact Files', desc: 'Highlights risky, critical files using centrality' },
  { icon: '🔍', title: 'NL Search', desc: '"Where is authentication?" — get instant answers' },
  { icon: '🗺️', title: 'Onboarding Path', desc: 'Recommended reading order for new developers' },
];

const EXAMPLE_REPOS = [
  { name: 'flask/flask', url: 'https://github.com/pallets/flask' },
  { name: 'expressjs/express', url: 'https://github.com/expressjs/express' },
  { name: 'axios/axios', url: 'https://github.com/axios/axios' },
];

export default function Landing({ onAnalyze }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  React.useEffect(() => {
    axios.get(`${API}/api/history`).then(res => setHistory(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    if (!trimmedUrl.includes('github.com')) {
      toast.error('Please enter a valid GitHub URL');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/analyze`, { url: trimmedUrl });
      toast.success(res.data.cached ? 'Loaded from cache!' : 'Analysis started!');
      onAnalyze(res.data.repo_id, trimmedUrl);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">

      {/* ── Top Nav ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '24px 32px', display: 'flex', alignItems: 'center' }}>
        <div className="header-logo">
          <div className="header-logo-icon" style={{ background: 'transparent' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          </div>
          <div className="header-logo-text" style={{ fontSize: 18 }}>RepoTrack</div>
        </div>
      </div>

      {/* ── Badge ── */}
      <div className="landing-badge animate-fade-in" style={{ marginTop: 20 }}>
        <Zap size={12} />
        AI-Powered · Static Analysis · Interactive Graph
      </div>

      {/* ── Title ── */}
      <h1 className="landing-title animate-fade-in">
        Navigate Any<br />
        <span>Repository Architecture</span><br />
        Instantly
      </h1>

      {/* ── Subtitle ── */}
      <p className="landing-subtitle animate-fade-in">
        Drop a GitHub URL. Get an interactive dependency graph, AI-generated file summaries,
        high-impact file highlights, and an onboarding path — in seconds.
      </p>

      {/* ── Search Form ── */}
      <form className="landing-form animate-fade-in" onSubmit={handleSubmit}>
        {/* Input + Button row */}
        <div className="landing-form-row">
          <div className="landing-input-wrapper">
            <Globe size={16} className="landing-input-icon" />
            <input
              className="landing-input"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              disabled={loading}
              autoFocus
            />
          </div>
          <button className="landing-btn" type="submit" disabled={loading || !url.trim()}>
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
              : <><ArrowRight size={16} /> Explore</>
            }
          </button>
        </div>
      </form>

      {/* ── Example Repos ── */}
      <div className="landing-examples animate-fade-in">
        <span className="landing-examples-label">Try:</span>
        {EXAMPLE_REPOS.map(r => (
          <button
            key={r.url}
            className="landing-example-chip"
            onClick={() => setUrl(r.url)}
            type="button"
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* ── Recent History ── */}
      {history.length > 0 && (
        <div className="landing-history animate-fade-in">
          <button
            className="landing-history-toggle"
            onClick={() => setShowHistory(!showHistory)}
            type="button"
          >
            <Clock size={14} />
            Recent Analyses ({history.length})
            <ArrowRight size={12} style={{
              transform: showHistory ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.2s',
            }} />
          </button>
          {showHistory && (
            <div className="landing-history-list">
              {history.slice(0, 5).map(h => (
                <div key={h.repo_id} className="history-item" onClick={() => setUrl(h.url)}>
                  <Globe size={14} color="#8892b0" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: '#e8eaf6',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {h.url.replace('https://github.com/', '')}
                    </div>
                    <div style={{ fontSize: 10, color: '#4a5568' }}>{h.status}</div>
                  </div>
                  <span className={`badge ${h.status === 'complete' ? 'badge-green' : h.status === 'error' ? 'badge-red' : 'badge-orange'}`}>
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Feature Cards ── */}
      <div className="landing-features animate-fade-in">
        {FEATURES.map(f => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
