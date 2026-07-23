import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';

interface HomeDashboardViewProps {
  token: string;
  username: string;
  onAnalyzeRepo: (repoUrl: string) => void;
  onLoadHistory: (scanData: any) => void;
  isAnalyzing?: boolean;
  onLogout?: () => void;
  onNavigate?: (view: ViewMode) => void;
  historyRefreshKey?: number;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  token,
  username,
  onAnalyzeRepo,
  onLoadHistory,
  isAnalyzing = false,
  onLogout,
  onNavigate,
  historyRefreshKey = 0
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');

  // Derived Stats
  const totalScans = history.length;
  
  const uniqueRepos = new Set(history.map(scan => scan.repo_url)).size;
  
  const totalSecrets = history.reduce((acc, curr) => {
    let count = 0;
    try {
      const data = curr.scan_data;
      if (data.audit?.secrets) count += data.audit.secrets.length;
    } catch(e) {}
    return acc + count;
  }, 0);

  const fetchHistory = async () => {
    if (!token) {
      setLoadingHistory(false);
      setHistoryError('Not logged in');
      return;
    }
    try {
      setLoadingHistory(true);
      setHistoryError('');
      const response = await fetch('/api/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        const errText = await response.text();
        setHistoryError(`API error ${response.status}: ${errText}`);
        console.error('History fetch failed:', response.status, errText);
      }
    } catch (error: any) {
      setHistoryError(`Network error: ${error.message}`);
      console.error("Failed to load history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token, historyRefreshKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onAnalyzeRepo(inputUrl.trim());
    }
  };

  const handleLoadScan = (scan: any) => {
    onLoadHistory(scan);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setHistory(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete scan", err);
    }
  };

  return (
    <div className="flex flex-col relative w-full h-full bg-[var(--color-background)] overflow-y-auto overflow-x-hidden p-8 md:p-16">
      <div className="absolute top-0 right-0 pointer-events-none opacity-5 select-none z-0">
        <span className="font-display font-bold text-[15rem] leading-none tracking-tighter text-[var(--color-foreground)]">DSH</span>
      </div>

      <div className="flex flex-col w-full max-w-7xl mx-auto relative z-20">
        <div className="flex items-start sm:items-center justify-between mb-16 flex-col sm:flex-row gap-8">
          <div className="flex flex-col">
            <h1 className="font-display font-bold text-4xl md:text-5xl text-[var(--color-foreground)] tracking-tighter mb-4">
              Dashboard.
            </h1>
            <div className="flex items-center gap-4">
              <span className="w-12 h-1 bg-[var(--color-accent)] block" />
              <span className="font-mono text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-[0.2em]">
                Overview & Scans
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-2 pr-4 pl-6 rounded-none">
             <div className="text-right hidden sm:block mr-2">
               <div className="font-mono text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider mb-0.5">Authenticated as</div>
               <div className="font-display font-bold text-base text-[var(--color-accent)] leading-none">{username}</div>
             </div>
             
             <div className="h-8 w-px bg-[var(--color-border)] mx-2 hidden sm:block"></div>
             
             <button 
                onClick={() => {
                  if (onNavigate) onNavigate('settings');
                }}
                className="flex items-center gap-2 px-3 h-10 hover:bg-[var(--color-background)] transition-colors group"
             >
                <span className="material-symbols-outlined text-[18px] text-[var(--color-muted-foreground)] group-hover:text-[var(--color-accent)]">manage_accounts</span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]">Settings</span>
             </button>
             
             <button 
                onClick={() => {
                  if (onLogout) onLogout();
                }}
                className="flex items-center gap-2 px-3 h-10 hover:bg-red-500/10 text-red-500/70 hover:text-red-500 transition-colors group"
                title="Sign out"
             >
                <span className="material-symbols-outlined text-[18px]">logout</span>
             </button>
          </div>
        </div>
        
        {/* Search Centerpiece */}
        <div className="mb-16">
          <label className="block font-mono text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-[0.1em] mb-4">
            Scan a new repository
          </label>
          <form onSubmit={handleSubmit} className="w-full max-w-3xl relative flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              spellCheck={false}
              autoComplete="off"
              className="flex-grow bg-[var(--color-input)] border border-[var(--color-border)] h-14 px-6 text-sm text-[var(--color-foreground)] font-mono placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:border-[var(--color-accent)] rounded-none transition-colors"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !inputUrl.trim()}
              className="btn-primary h-14 px-8 text-sm border border-transparent disabled:opacity-50"
            >
              {isAnalyzing ? (
                'Analyzing...'
              ) : (
                <div className="flex items-center gap-2">
                  <span>Analyze</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Scan History */}
        <div>
          <label className="block font-mono text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-[0.1em] mb-6">
            Recent Scans
          </label>
          
          {loadingHistory ? (
            <div className="text-[var(--color-muted-foreground)] font-mono text-sm animate-pulse">Loading history...</div>
          ) : historyError ? (
            <div className="p-8 border border-red-500/30 border-dashed text-center">
              <p className="text-red-400 font-mono text-xs mb-3">Error loading history: {historyError}</p>
              <button onClick={fetchHistory} className="font-mono text-xs text-[var(--color-accent)] underline">Retry</button>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 border border-[var(--color-border)] border-dashed text-center">
              <p className="text-[var(--color-muted-foreground)] font-mono text-sm">No recent scans found.</p>
              <button onClick={fetchHistory} className="mt-2 font-mono text-xs text-[var(--color-muted-foreground)] underline">Refresh</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((scan) => (
                <div 
                  key={scan.id} 
                  onClick={() => handleLoadScan(scan)}
                  className="bg-[var(--color-card)] border border-[var(--color-border)] p-6 hover:border-[var(--color-accent)] cursor-pointer transition-colors group flex flex-col relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="material-symbols-outlined text-[var(--color-muted-foreground)] group-hover:text-[var(--color-accent)] transition-colors">folder</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-[var(--color-muted-foreground)]">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </span>
                      <button 
                        onClick={(e) => handleDelete(e, scan.id)}
                        className="text-[var(--color-muted-foreground)] hover:text-red-500 transition-colors flex items-center justify-center w-6 h-6 rounded-full hover:bg-[var(--color-background)]"
                        title="Delete scan"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <h3 className="font-display font-bold text-lg text-[var(--color-foreground)] mb-2 break-all pr-8">{scan.repo_name}</h3>
                  <p className="font-mono text-xs text-[var(--color-muted-foreground)] mt-auto line-clamp-1 truncate">
                    {scan.repo_url}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
