import React, { useState } from 'react';
import { Folder, FolderOpen, FileText, FileCode, File, ChevronRight, ChevronDown, Archive } from 'lucide-react';

const FileIcon = ({ name }) => {
  const ext = name.split('.').pop().toLowerCase();
  
  if (['js', 'jsx', 'ts', 'tsx', 'py'].includes(ext)) {
    return <FileCode size={14} color="#6378ff" style={{ minWidth: 14 }}/>;
  }
  if (['md', 'txt', 'json', 'yml', 'yaml', 'gitignore', 'env'].includes(ext)) {
    return <FileText size={14} color="#8892b0" style={{ minWidth: 14 }}/>;
  }
  if (['zip', 'tar', 'gz'].includes(ext)) {
    return <Archive size={14} color="#f59e0b" style={{ minWidth: 14 }}/>;
  }
  return <File size={14} color="#8892b0" style={{ minWidth: 14 }}/>;
};

const TreeNode = ({ node, level = 0, onFileSelect }) => {
  const [isOpen, setIsOpen] = useState(level === 0);
  const isDir = node.type === 'directory';

  return (
    <div style={{ marginLeft: level > 0 ? 12 : 0 }}>
      <div 
        onClick={() => {
          if (isDir) {
            setIsOpen(!isOpen);
          } else if (onFileSelect) {
            onFileSelect(node.path);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          cursor: isDir ? 'pointer' : 'default',
          borderRadius: 4,
          color: '#e8eaf6',
          fontSize: 13,
          gap: 6,
          transition: 'background 0.1s'
        }}
        className="tree-node"
      >
        <div style={{ width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isDir ? (
            isOpen ? <ChevronDown size={14} color="#8892b0" /> : <ChevronRight size={14} color="#8892b0" />
          ) : null}
        </div>
        
        {isDir ? (
           isOpen ? <FolderOpen size={14} color="#6378ff" /> : <Folder size={14} color="#8892b0" />
        ) : (
           <FileIcon name={node.name} />
        )}
        
        <span style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          color: isDir ? '#e8eaf6' : '#8892b0',
          fontWeight: isDir ? 500 : 400
        }}>
          {node.name}
        </span>
      </div>

      {isDir && isOpen && node.children && (
        <div style={{ borderLeft: '1px solid rgba(99,120,255,0.15)', marginLeft: 6 }}>
          {node.children.map((child, idx) => (
            <TreeNode key={`${child.name}-${idx}`} node={child} level={level + 1} onFileSelect={onFileSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function FileTreeBrowser({ tree, onFileSelect }) {
  if (!tree) return null;

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="card-title" style={{ paddingBottom: 12, borderBottom: '1px solid rgba(99,120,255,0.15)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <FolderOpen size={14} color="#6378ff" /> 
        Repository Structure
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', paddingRight: 8 }}>
        <TreeNode node={tree} onFileSelect={onFileSelect} />
      </div>
    </div>
  );
}
