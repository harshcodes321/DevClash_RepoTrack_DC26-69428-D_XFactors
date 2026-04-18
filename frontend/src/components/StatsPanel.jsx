import React from 'react';
import { BarChart2, AlertTriangle, Zap, Star } from 'lucide-react';

export default function StatsPanel({ stats, graphData, onFileSelect }) {
  if (!stats) return null;

  const nodes = graphData?.nodes || [];
  const highImpactIds = new Set(graphData?.high_impact || []);
  const highImpactNodes = nodes
    .filter(n => highImpactIds.has(n.id))
    .sort((a, b) => (b.importance || 0) - (a.importance || 0));

  const orphans = nodes.filter(n => n.is_orphan);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Overall AI Summary */}
      {graphData?.overall_summary && (
        <div style={{ background: 'rgba(99,120,255,0.1)', padding: 12, borderRadius: 8, border: '1px solid rgba(99,120,255,0.2)' }}>
          <div className="card-title" style={{ marginBottom: 8, color: '#6378ff' }}><Zap size={12} /> Repository Summary</div>
          <div style={{ fontSize: 12, color: '#e8eaf6', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {graphData.overall_summary}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div>
        <div className="card-title"><BarChart2 size={12} /> Repository Stats</div>
        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-value">{stats.total_files || 0}</div>
            <div className="stat-label">Files</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.total_edges || 0}</div>
            <div className="stat-label">Deps</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ background: 'linear-gradient(135deg,#ef4444,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {stats.orphan_count || 0}
            </div>
            <div className="stat-label">Orphans</div>
          </div>
        </div>
      </div>

      {/* Entry Points */}
      {stats.entry_points?.length > 0 && (
        <div>
          <div className="card-title"><Zap size={12} style={{ color: '#10b981' }} /> Entry Points</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {stats.entry_points.slice(0, 4).map(ep => {
              const node = nodes.find(n => n.id === ep);
              return (
                <div key={ep} className="file-item" onClick={() => onFileSelect?.(node || { id: ep, path: ep, label: ep.split('/').pop() })}>
                  <span style={{ fontSize: 14 }}>⚡</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="file-name">{ep.split('/').pop()}</div>
                    <div className="file-path">{ep}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* High Impact Files */}
      {highImpactNodes.length > 0 && (
        <div>
          <div className="card-title"><Star size={12} style={{ color: '#ef4444' }} /> High Impact Files</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {highImpactNodes.slice(0, 6).map(n => (
              <div key={n.id} className="file-item" onClick={() => onFileSelect?.(n)}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                }}>
                  🔥
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="file-name">{n.label || n.path.split('/').pop()}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <div className="impact-bar" style={{ flex: 1, height: 3 }}>
                      <div className="impact-bar-fill" style={{
                        width: `${(n.importance || 0) * 100}%`,
                        background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                      }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, width: 30 }}>
                      {Math.round((n.importance || 0) * 100)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orphan Files */}
      {orphans.length > 0 && (
        <div>
          <div className="card-title"><AlertTriangle size={12} style={{ color: '#f59e0b' }} /> Orphan Files ({orphans.length})</div>
          <p style={{ fontSize: 11, color: '#8892b0', marginBottom: 8, lineHeight: 1.5 }}>
            These files have no imports or dependents — possible dead code.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {orphans.slice(0, 5).map(n => (
              <div key={n.id} className="file-item" onClick={() => onFileSelect?.(n)}>
                <span style={{ fontSize: 12 }}>🔇</span>
                <span className="file-name" style={{ color: '#4a5568' }}>
                  {n.label || n.path.split('/').pop()}
                </span>
              </div>
            ))}
            {orphans.length > 5 && (
              <div style={{ fontSize: 11, color: '#4a5568', padding: '4px 10px' }}>
                +{orphans.length - 5} more orphans
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
