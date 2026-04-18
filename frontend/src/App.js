import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import './index.css';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'dashboard'
  const [repoId, setRepoId] = useState(null);
  const [repoUrl, setRepoUrl] = useState(null);

  const handleAnalyze = (id, url) => {
    setRepoId(id);
    setRepoUrl(url);
    setView('dashboard');
  };

  const handleBack = () => {
    setView('landing');
    setRepoId(null);
    setRepoUrl(null);
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#141929',
            color: '#e8eaf6',
            border: '1px solid rgba(99,120,255,0.2)',
            fontSize: 13,
            borderRadius: 10,
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#141929' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#141929' } },
        }}
      />
      {view === 'landing'
        ? <Landing onAnalyze={handleAnalyze} />
        : <Dashboard repoId={repoId} repoUrl={repoUrl} onBack={handleBack} />
      }
    </>
  );
}
