import React from 'react';
import {
  X, FileCode, ArrowRight, ArrowLeft, Zap,
  Code, Hash, ChevronRight,
} from 'lucide-react';

const EXT_COLORS = {
  '.py': '#3572A5', '.js': '#F7DF1E', '.ts': '#3178C6',
  '.jsx': '#61DAFB', '.tsx': '#61DAFB', '.java': '#B07219',
  '.go': '#00ADD8', '.rb': '#CC342D', '.php': '#4F5D95',
};

const EXT_EMOJI = {
  '.py': '🐍', '.js': '🟨', '.ts': '🔷', '.jsx': '⚛️',
  '.tsx': '⚛️', '.java': '☕', '.go': '🐹', '.rb': '💎',
  '.php': '🐘', '.cs': '🔵', '.cpp': '⚙️',
};

const importanceLabel = (imp) => {
  if (imp > 0.5) return { label: 'Critical', color: '#ef4444' };
  if (imp > 0.25) return { label: 'High', color: '#f59e0b' };
  if (imp > 0.1) return { label: 'Medium', color: '#6378ff' };
  return { label: 'Low', color: '#4a5568' };
};

export default function FilePanel({ file, onClose, onFileSelect }) {
  if (!file) return null;

  const imp = importanceLabel(file.importance || 0);
  const color = EXT_COLORS[file.ext] || '#6378ff';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: `${color}20`, border: `1px solid ${color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            {EXT_EMOJI[file.ext] || '📄'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#e8eaf6',
              fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {file.label || file.path?.split('/').pop()}
            </div>
            <div style={{ fontSize: 10, color: '#8892b0' }}>
              {file.lines || 0} lines · {file.ext}
            </div>
          </div>
        </div>
        <button className="btn-icon" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {file.is_entry && <span className="badge badge-green">⚡ Entry Point</span>}
          {file.is_orphan && <span className="badge badge-gray">🔇 Orphan</span>}
          <span className="badge" style={{ background: `${imp.color}18`, color: imp.color }}>
            {imp.label} Impact
          </span>
        </div>

        {/* AI Summary */}
        {file.summary && (
          <div className="card" style={{ background: 'rgba(99,120,255,0.06)', border: '1px solid rgba(99,120,255,0.2)' }}>
            <div className="card-title" style={{ color: '#6378ff' }}>
              <Zap size={12} /> AI Summary
            </div>
            <p style={{ fontSize: 13, color: '#c5cee0', lineHeight: 1.6 }}>{file.summary}</p>
          </div>
        )}

        {/* Path */}
        <div>
          <div className="card-title"><FileCode size={12} /> Full Path</div>
          <code style={{
            fontSize: 11, color: '#8892b0', display: 'block',
            fontFamily: "'JetBrains Mono', monospace",
            wordBreak: 'break-all', lineHeight: 1.5,
          }}>
            {file.path}
          </code>
        </div>

        {/* Impact Score */}
        <div>
          <div className="card-title" style={{ marginBottom: 8 }}>
            <Zap size={12} /> Impact Score
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="impact-bar" style={{ flex: 1 }}>
              <div className="impact-bar-fill" style={{
                width: `${(file.importance || 0) * 100}%`,
                background: `linear-gradient(90deg, ${imp.color}, ${imp.color}99)`,
              }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: imp.color, width: 36 }}>
              {Math.round((file.importance || 0) * 100)}
            </span>
          </div>
        </div>

        {/* Dependencies */}
        {file.dependencies?.length > 0 && (
          <div>
            <div className="card-title">
              <ArrowRight size={12} /> Imports ({file.dependencies.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {file.dependencies.slice(0, 8).map(dep => (
                <div key={dep} className="file-item" onClick={() => onFileSelect?.(dep)}>
                  <ChevronRight size={10} color="#6378ff" />
                  <span className="file-name" style={{ fontSize: 11 }}>
                    {dep.split('/').pop()}
                  </span>
                </div>
              ))}
              {file.dependencies.length > 8 && (
                <div style={{ fontSize: 11, color: '#8892b0', padding: '4px 10px' }}>
                  +{file.dependencies.length - 8} more...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dependents */}
        {file.dependents?.length > 0 && (
          <div>
            <div className="card-title">
              <ArrowLeft size={12} /> Used By ({file.dependents.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {file.dependents.slice(0, 8).map(dep => (
                <div key={dep} className="file-item" onClick={() => onFileSelect?.(dep)}>
                  <ChevronRight size={10} color="#10b981" />
                  <span className="file-name" style={{ fontSize: 11 }}>
                    {dep.split('/').pop()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Functions */}
        {file.functions?.length > 0 && (
          <div>
            <div className="card-title"><Code size={12} /> Functions</div>
            <div className="tag-list">
              {file.functions.slice(0, 12).map(fn => (
                <span key={fn} className="tag">{fn}()</span>
              ))}
            </div>
          </div>
        )}

        {/* Classes */}
        {file.classes?.length > 0 && (
          <div>
            <div className="card-title"><Hash size={12} /> Classes</div>
            <div className="tag-list">
              {file.classes.map(cls => (
                <span key={cls} className="tag" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', borderColor: 'rgba(168,85,247,0.2)' }}>
                  {cls}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Code Preview */}
        {file.full_content && (
          <div>
            <div className="card-title"><Code size={12} /> Code Preview</div>
            <pre className="code-preview" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <code>{file.full_content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
