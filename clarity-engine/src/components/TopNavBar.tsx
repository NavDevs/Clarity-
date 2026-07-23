import React, { useState, useEffect, useRef } from 'react';
import { ViewMode } from '../types';

interface TopNavBarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onOpenNewScan: () => void;
  onOpenDocs: () => void;
  onOpenPricing: () => void;
  onSearchQuery?: (query: string) => void;
  activeRepoName?: string;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  currentView,
  onNavigate,
  onOpenNewScan,
  onOpenDocs,
  onOpenPricing,
  onSearchQuery,
  activeRepoName = 'Clarity'
}) => {
  const [searchValue, setSearchValue] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim() && onSearchQuery) {
      onSearchQuery(searchValue);
    }
  };

  return (
    <header className="flex justify-between items-center px-4 lg:px-8 h-16 lg:h-20 w-full sticky top-0 z-50 bg-[var(--color-background)] border-b border-[var(--color-border)] shrink-0">
      <div className="flex items-center gap-4 lg:gap-12">
        <button 
          onClick={() => onNavigate('landing')}
          className="font-display font-bold text-xl lg:text-3xl text-[var(--color-foreground)] tracking-tighter uppercase transition-colors hover:text-[var(--color-accent)] flex items-baseline gap-2 lg:gap-3 cursor-pointer"
        >
          <span>CLARITY</span>
          {activeRepoName && activeRepoName !== 'Clarity' && currentView !== 'settings' ? (
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)] font-mono font-medium tracking-wide uppercase">
              /{activeRepoName}
            </span>
          ) : (
            <span className="font-mono text-[8px] lg:text-[10px] tracking-widest text-[var(--color-muted-foreground)]">BETA</span>
          )}
        </button>

        <div className="hidden lg:flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">
          <button onClick={() => onNavigate('home')} className="hover:text-[var(--color-foreground)] transition-colors">Dashboard</button>
          <button onClick={onOpenDocs} className="hover:text-[var(--color-foreground)] transition-colors">Docs</button>
          <button onClick={onOpenPricing} className="hover:text-[var(--color-foreground)] transition-colors">Pricing</button>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] text-sm">search</span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search nodes..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-40 lg:w-64 h-8 lg:h-10 bg-[var(--color-card)] border border-[var(--color-border)] px-10 font-mono text-xs focus:outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-muted-foreground)] text-[var(--color-foreground)]"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 pointer-events-none">
            <kbd className="font-mono text-[9px] px-1 py-0.5 border border-[var(--color-border)] rounded-sm text-[var(--color-muted-foreground)] hidden lg:block">⌘</kbd>
            <kbd className="font-mono text-[9px] px-1 py-0.5 border border-[var(--color-border)] rounded-sm text-[var(--color-muted-foreground)] hidden lg:block">K</kbd>
          </div>
        </form>

        <div className="h-4 lg:h-6 w-px bg-[var(--color-border)] hidden sm:block"></div>

        <button 
          onClick={onOpenNewScan}
          className="btn-primary h-8 lg:h-10 px-3 lg:px-6 text-[10px] lg:text-xs"
        >
          <span className="material-symbols-outlined text-[14px] lg:text-[18px]">add</span>
          <span className="hidden sm:inline">New Scan</span>
        </button>
      </div>
    </header>
  );
};
