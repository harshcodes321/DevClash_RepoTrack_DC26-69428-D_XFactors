import React from 'react';
import { Map, ChevronRight } from 'lucide-react';

const EXT_EMOJI = {
  '.py': '🐍', '.js': '🟨', '.ts': '🔷', '.jsx': '⚛️',
  '.tsx': '⚛️', '.java': '☕', '.go': '🐹',
};

export default function OnboardingPath({ path, nodes, onFileSelect }) {
  if (!path?.length) return null;

  const nodeMap = {};
  (nodes || []).forEach(n => { nodeMap[n.id] = n; });

  return (
    <div>
      <div className="card-title" style={{ marginBottom: 12 }}>
        <Map size={12} style={{ color: '#a855f7' }} />
        <span style={{ color: '#a855f7' }}>Onboarding Path</span>
        <span style={{ color: '#4a5568', marginLeft: 4 }}>{path.length} files</span>
      </div>
      <p style={{ fontSize: 11, color: '#8892b0', marginBottom: 12, lineHeight: 1.5 }}>
        Recommended reading order for new developers
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {path.slice(0, 12).map((filePath, i) => {
          const node = nodeMap[filePath];
          const name = filePath.split('/').pop();
          const ext = '.' + name.split('.').pop();
          return (
            <div
              key={filePath}
              className="onboarding-step"
              onClick={() => onFileSelect?.(node || { id: filePath, path: filePath, label: name })}
            >
              <div className="step-num">{i + 1}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#e8eaf6',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {EXT_EMOJI[ext] || '📄'} {name}
                </div>
                <div style={{ fontSize: 10, color: '#8892b0', marginTop: 2 }}>
                  {node?.summary
                    ? node.summary.slice(0, 50) + (node.summary.length > 50 ? '...' : '')
                    : filePath}
                </div>
              </div>
              <ChevronRight size={12} color="#4a5568" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
