import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, RefreshCw, PanelLeft, PanelRight,
  Loader2, AlertCircle, CheckCircle2, GitBranch, Zap
} from 'lucide-react';

import ArchitectureGraph from '../components/ArchitectureGraph';
import FilePanel from '../components/FilePanel';
import SearchBar from '../components/SearchBar';
import StatsPanel from '../components/StatsPanel';
import OnboardingPath from '../components/OnboardingPath';
import FileTreeBrowser from '../components/FileTreeBrowser';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const STATUS_STEPS = {
  cloning: { label: 'Cloning repository...', pct: 15 },
  parsing: { label: 'Parsing source files...', pct: 35 },
  building_graph: { label: 'Building dependency graph...', pct: 55 },
  graph_ready: { label: 'Graph ready! Reading README...', pct: 60 },
  summarizing_repo: { label: 'AI summarizing repository...', pct: 70 },
  summarizing: { label: 'AI summarizing files...', pct: 85 },
  complete: { label: 'Analysis complete!', pct: 100 },
  error: { label: 'Analysis failed', pct: 0 },
};

export default function Dashboard({ repoId, repoUrl, onBack }) {
  const [status, setStatus] = useState('cloning');
  const [graphData, setGraphData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchHighlight, setSearchHighlight] = useState([]);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('stats'); // stats | onboarding
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const repoName = repoUrl?.replace('https://github.com/', '') || repoId;

  // ── Poll for status ──────────────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/status/${repoId}`);
      const newStatus = res.data.status;
      setStatus(newStatus);

      if (newStatus === 'error') {
        setError(res.data.error || 'Unknown error');
        clearInterval(pollRef.current);
        return;
      }

      // Fetch graph as soon as it's ready (even before summaries)
      if (['graph_ready', 'summarizing', 'complete'].includes(newStatus)) {
        fetchGraph();
      }

      if (newStatus === 'complete') {
        clearInterval(pollRef.current);
        toast.success('Analysis complete! 🎉');
      }
    } catch {
      // ignore transient errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]);

  const fetchGraph = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/graph/${repoId}`);
      setGraphData(res.data);
    } catch {
      // not ready yet
    }
  }, [repoId]);

  useEffect(() => {
    pollStatus(); // immediate first check
    pollRef.current = setInterval(pollStatus, 2500);
    return () => clearInterval(pollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollStatus]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeSelect = useCallback((fileData) => {
    setSelectedFile(fileData);
    setRightOpen(true);
  }, []);

  const handleFileSelectById = useCallback((idOrNode) => {
    if (!graphData) return;
    const node = typeof idOrNode === 'string'
      ? graphData.nodes?.find(n => n.id === idOrNode)
      : idOrNode;
    if (node) {
      setSelectedFile(node);
      setRightOpen(true);
    }
  }, [graphData]);

  // Keep selectedFile in sync with graphData updates (e.g., when summaries arrive)
  useEffect(() => {
    if (selectedFile && graphData?.nodes) {
      const updatedNode = graphData.nodes.find(n => n.id === selectedFile.id);
      // If the node got updated with new properties (like AI summary), sync it
      if (updatedNode && JSON.stringify(updatedNode) !== JSON.stringify(selectedFile)) {
        setSelectedFile(updatedNode);
      }
    }
  }, [graphData, selectedFile]);

  const handleSearchResults = useCallback((files, focusFile) => {
    setSearchHighlight(files);
    if (focusFile) {
      const node = graphData?.nodes?.find(n => n.id === focusFile);
      if (node) { setSelectedFile(node); setRightOpen(true); }
    }
  }, [graphData]);

  const handleSearchClear = useCallback(() => {
    setSearchHighlight([]);
  }, []);

  const step = STATUS_STEPS[status] || STATUS_STEPS.cloning;

  return (
    <div className="app-layout">
      {/* ── Header ── */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-icon" onClick={onBack} data-tip="Back to home">
            <ArrowLeft size={16} />
          </button>
          <div className="header-logo">
            <div className="header-logo-icon" style={{ background: 'transparent' }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
            </div>
            <span className="header-logo-text">Repo Navigator</span>
          </div>
          <div style={{
            height: 20, width: 1, background: 'rgba(99,120,255,0.2)', margin: '0 4px',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GitBranch size={13} color="#8892b0" />
            <span style={{ fontSize: 12, color: '#8892b0', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {repoName}
            </span>
          </div>
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {status === 'complete' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} color="#10b981" />
              <span style={{ fontSize: 12, color: '#10b981' }}>Analysis complete</span>
            </div>
          ) : status === 'error' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} color="#ef4444" />
              <span style={{ fontSize: 12, color: '#ef4444' }}>Error</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} color="#6378ff" className="animate-spin" />
              <span style={{ fontSize: 12, color: '#8892b0' }}>{step.label}</span>
              <div style={{ width: 80 }}>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${step.pct}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="header-actions">
          {graphData && (
            <button className="btn-icon tooltip" data-tip="Refresh graph" onClick={fetchGraph}>
              <RefreshCw size={15} />
            </button>
          )}
          <button className="btn-icon tooltip" data-tip="Toggle left panel" onClick={() => setLeftOpen(p => !p)}>
            <PanelLeft size={15} />
          </button>
          <button className="btn-icon tooltip" data-tip="Toggle right panel" onClick={() => setRightOpen(p => !p)}>
            <PanelRight size={15} />
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="main-content">

        {/* ── Left Sidebar ── */}
        <aside className={`sidebar ${leftOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-scroll">
            {/* Search */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>
                🔍 Search Codebase
              </div>
              <SearchBar
                repoId={repoId}
                onResults={handleSearchResults}
                onClear={handleSearchClear}
              />
            </div>

            {/* Tab: Stats | Onboarding */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'stats', label: '📊 Stats' },
                { id: 'onboarding', label: '🗺️ Onboarding' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  flex: 1, padding: '8px 0', border: '1px solid',
                  borderColor: activeTab === tab.id ? 'rgba(99,120,255,0.5)' : 'rgba(99,120,255,0.15)',
                  borderRadius: 8, background: activeTab === tab.id ? 'rgba(99,120,255,0.12)' : 'transparent',
                  color: activeTab === tab.id ? '#6378ff' : '#8892b0',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Stats Panel */}
            {activeTab === 'stats' && (
              <div className="card animate-fade-in">
                {graphData
                  ? <StatsPanel stats={graphData.stats} graphData={graphData} onFileSelect={handleFileSelectById} />
                  : <LoadingPlaceholder rows={4} label="Loading stats..." />
                }
              </div>
            )}

            {/* Onboarding Panel */}
            {activeTab === 'onboarding' && (
              <div className="card animate-fade-in">
                {graphData
                  ? <OnboardingPath path={graphData.onboarding_path} nodes={graphData.nodes} onFileSelect={handleFileSelectById} />
                  : <LoadingPlaceholder rows={5} label="Generating onboarding path..." />
                }
              </div>
            )}

            {/* Error */}
            {status === 'error' && error && (
              <div className="card animate-fade-in" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>Analysis Failed</div>
                    <div style={{ fontSize: 12, color: '#8892b0', lineHeight: 1.5 }}>{error}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Graph Canvas ── */}
        <main className="graph-canvas">
          {graphData ? (
            <>
              <ArchitectureGraph
                graphData={graphData}
                onNodeSelect={handleNodeSelect}
                selectedNodeId={selectedFile?.id}
                searchHighlight={searchHighlight}
              />

              {/* Legend */}
              <div className="legend">
                {[
                  { color: '#10b981', label: 'Entry Point' },
                  { color: '#ef4444', label: 'High Impact' },
                  { color: '#f59e0b', label: 'Medium Impact' },
                  { color: '#6378ff', label: 'Normal' },
                  { color: '#4a5568', label: 'Orphan' },
                ].map(l => (
                  <div key={l.label} className="legend-item">
                    <div className="legend-dot" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}60` }} />
                    {l.label}
                  </div>
                ))}
              </div>

              {/* Search highlight indicator */}
              {searchHighlight.length > 0 && (
                <div style={{
                  position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(99,120,255,0.15)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(99,120,255,0.3)', borderRadius: 20,
                  padding: '6px 16px', fontSize: 12, color: '#6378ff', fontWeight: 600,
                  zIndex: 10,
                }}>
                  🔍 Highlighting {searchHighlight.length} matching files
                </div>
              )}
            </>
          ) : (
            <GraphLoadingState status={status} step={step} error={error} />
          )}
        </main>

        {/* ── Right Panel: File Details & Tree ── */}
        <aside className={`right-panel ${(rightOpen && selectedFile) || !selectedFile ? '' : 'hidden'}`} style={{ display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ flex: selectedFile ? 1 : 'none', minHeight: selectedFile ? 0 : 'auto', overflowY: 'auto' }}>
            {selectedFile ? (
              <FilePanel
                file={selectedFile}
                onClose={() => setRightOpen(false)}
                onFileSelect={handleFileSelectById}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, rgba(99,120,255,0.2), rgba(168,85,247,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,120,255,0.1)' }}>
                  <Zap size={24} color="#6378ff" />
                </div>
                <h3 style={{ fontSize: 16, color: '#e8eaf6', margin: 0 }}>AI Summarization</h3>
                <p style={{ fontSize: 13, color: '#8892b0', lineHeight: 1.6, margin: 0 }}>
                  Select any file node in the architecture graph to view its AI-generated summary, metrics, and dependencies.
                </p>
              </div>
            )}
          </div>

          <div style={{ flex: selectedFile ? 'none' : 1, height: selectedFile ? '40%' : 'auto', minHeight: 0, borderTop: '1px solid rgba(99, 120, 255, 0.15)', overflow: 'hidden', padding: 8 }}>
             {graphData?.file_tree && <FileTreeBrowser tree={graphData.file_tree} onFileSelect={handleFileSelectById} />}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function LoadingPlaceholder({ rows, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Loader2 size={12} color="#6378ff" className="animate-spin" />
        <span style={{ fontSize: 12, color: '#8892b0' }}>{label}</span>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height: 32, borderRadius: 6,
          background: 'linear-gradient(90deg, rgba(99,120,255,0.05) 25%, rgba(99,120,255,0.1) 50%, rgba(99,120,255,0.05) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          opacity: 1 - i * 0.15,
        }} />
      ))}
    </div>
  );
}

function GraphLoadingState({ status, step, error }) {
  if (status === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <AlertCircle size={48} color="#ef4444" />
        <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>Analysis Failed</div>
        <div style={{ fontSize: 13, color: '#8892b0', maxWidth: 400, textAlign: 'center' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
      {/* Animated graph preview */}
      <div style={{ position: 'relative', width: 120, height: 120 }} className="animate-float">
        <svg width={120} height={120} viewBox="0 0 120 120">
          {[[60, 60], [20, 30], [100, 30], [20, 90], [100, 90]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={i === 0 ? 14 : 9}
              fill={i === 0 ? '#6378ff' : ['#10b981', '#f59e0b', '#ef4444', '#a855f7'][i - 1]}
              opacity={0.85}
              style={{ filter: `drop-shadow(0 0 6px ${['#6378ff', '#10b981', '#f59e0b', '#ef4444', '#a855f7'][i]}` }}
            />
          ))}
          {[[60, 60, 20, 30], [60, 60, 100, 30], [60, 60, 20, 90], [60, 60, 100, 90]].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(99,120,255,0.3)" strokeWidth={1.5} />
          ))}
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#e8eaf6', marginBottom: 8 }}>
          {step.label}
        </div>
        <div style={{ fontSize: 13, color: '#8892b0', maxWidth: 360 }}>
          We're cloning, parsing, and building your architecture graph. This usually takes 30–90 seconds.
        </div>
      </div>

      <div style={{ width: 280 }}>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${step.pct}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#4a5568' }}>
          <span>Clone</span><span>Parse</span><span>Graph</span><span>AI</span><span>Done</span>
        </div>
      </div>
    </div>
  );
}
