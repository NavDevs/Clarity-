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
    <header className="flex justify-between items-center px-8 h-20 w-full sticky top-0 z-50 bg-[var(--color-background)] border-b border-[var(--color-border)] shrink-0">
      <div className="flex items-center gap-12">
        <button 
          onClick={() => onNavigate('landing')}
          className="font-display font-bold text-3xl text-[var(--color-foreground)] tracking-tighter uppercase transition-colors hover:text-[var(--color-accent)] flex items-baseline gap-3 cursor-pointer"
        >
          <span>CLARITY</span>
          {activeRepoName && activeRepoName !== 'Clarity' && currentView !== 'settings' && (
            <span className="text-sm px-2 py-0.5 border border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)] font-mono font-medium tracking-wide uppercase">
              /{activeRepoName}
            </span>
          )}
        </button>

        {/* Navigation links removed as requested */}
      </div>

      <div className="flex items-center gap-6">
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] text-[18px]">
            search
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search architecture..."
            className="bg-[var(--color-input)] border border-[var(--color-border)] rounded-none h-12 pl-12 pr-16 text-sm text-[var(--color-foreground)] font-sans focus:outline-none focus:border-[var(--color-accent)] focus:ring-0 transition-colors w-60 sm:w-80 placeholder:text-[var(--color-muted-foreground)]"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] font-mono font-medium text-[10px] tracking-widest pointer-events-none">
            CMD+K
          </span>
        </form>
      </div>
    </header>
  );
};
