import React, { useState, useRef } from 'react';
import { Search, X, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function SearchBar({ repoId, onResults, onClear }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const inputRef = useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || !repoId) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/search`, { repo_id: repoId, query });
      setResults(res.data);
      onResults?.(res.data.files || []);
    } catch {
      setResults({ files: [], explanation: 'Search failed. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    onClear?.();
    inputRef.current?.focus();
  };

  const suggestions = [
    'Where is authentication?',
    'Find database models',
    'Show routing files',
    'Where is the entry point?',
    'Find API endpoints',
  ];

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: '#8892b0',
          }} />
          <input
            ref={inputRef}
            className="input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask anything: 'where is auth?'"
            style={{ paddingLeft: 32, paddingRight: query ? 32 : 12 }}
          />
          {query && (
            <button type="button" onClick={handleClear} style={{
              position: 'absolute', right: 8, top: '50%',
              transform: 'translateY(-50%)', background: 'none',
              border: 'none', cursor: 'pointer', color: '#8892b0',
              display: 'flex', alignItems: 'center',
            }}>
              <X size={14} />
            </button>
          )}
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading || !repoId} style={{ padding: '8px 14px' }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        </button>
      </form>

      {/* Suggestions */}
      {!query && !results && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, color: '#4a5568', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            Try asking
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => setQuery(s)} style={{
                background: 'rgba(99,120,255,0.08)', border: '1px solid rgba(99,120,255,0.2)',
                borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#8892b0',
                cursor: 'pointer', transition: 'all 0.15s ease',
                fontFamily: 'Inter, sans-serif',
              }}
                onMouseEnter={e => { e.target.style.color = '#6378ff'; e.target.style.borderColor = 'rgba(99,120,255,0.5)'; }}
                onMouseLeave={e => { e.target.style.color = '#8892b0'; e.target.style.borderColor = 'rgba(99,120,255,0.2)'; }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ marginTop: 12 }} className="animate-fade-in">
          {results.explanation && (
            <div style={{
              fontSize: 12, color: '#8892b0', marginBottom: 10,
              padding: '8px 12px', background: 'rgba(99,120,255,0.06)',
              borderRadius: 8, border: '1px solid rgba(99,120,255,0.15)', lineHeight: 1.5,
            }}>
              💡 {results.explanation}
            </div>
          )}
          {results.files?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {results.files.map(f => (
                <div key={f} className="search-result" onClick={() => onResults?.([f], f)}>
                  <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#e8eaf6' }}>
                    {f.split('/').pop()}
                  </div>
                  <div style={{ fontSize: 10, color: '#8892b0', marginTop: 2 }}>{f}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#4a5568', textAlign: 'center', padding: '12px 0' }}>
              No matching files found
            </div>
          )}
          <button onClick={handleClear} style={{
            marginTop: 10, fontSize: 11, color: '#8892b0', background: 'none',
            border: 'none', cursor: 'pointer', textDecoration: 'underline',
            fontFamily: 'Inter, sans-serif',
          }}>
            Clear results
          </button>
        </div>
      )}
    </div>
  );
}
