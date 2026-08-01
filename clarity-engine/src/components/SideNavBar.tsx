import React from 'react';
import { ViewMode } from '../types';

interface SideNavBarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode | 'home') => void;
  onOpenNewScan: () => void;
  username?: string;
  vigilantMode?: boolean;
  activeRepoName?: string;
  onLogout?: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentView,
  onNavigate,
  onOpenNewScan,
  username = 'guest',
  vigilantMode = true,
  activeRepoName = '',
  onLogout
}) => {
  const navItems = [
    {
      id: 'map' as ViewMode,
      num: '01',
      label: 'Architecture Map',
      icon: 'account_tree'
    },
    {
      id: 'audit' as ViewMode,
      num: '02',
      label: 'Security Audit',
      icon: 'security'
    },
    {
      id: 'techstack' as ViewMode,
      num: '03',
      label: 'Tech Stack',
      icon: 'layers'
    },
    {
      id: 'chat' as ViewMode,
      num: '04',
      label: 'AI Chat',
      icon: 'forum'
    }
  ];

  const isInProject = currentView !== 'home' && currentView !== 'landing' && currentView !== 'auth';

  return (
    <nav className="bg-[var(--color-background)] flex flex-row lg:flex-col fixed bottom-0 left-0 w-full lg:relative h-16 lg:h-full lg:py-6 lg:w-72 border-t lg:border-t-0 lg:border-r border-[var(--color-border)] shrink-0 z-50 lg:z-20 select-none overflow-x-auto lg:overflow-visible">
      {/* Header */}
      <div className="hidden lg:block px-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="min-w-0 w-full">
            <h1 
              onClick={() => onNavigate('home')}
              className="font-display font-bold text-[var(--color-foreground)] text-2xl uppercase tracking-tighter leading-none mb-3 cursor-pointer hover:text-[var(--color-accent)] transition-colors flex items-center justify-between group"
              title="Return to Dashboard"
            >
              <span>CLARITY</span>
              <span className="material-symbols-outlined text-[18px] opacity-0 group-hover:opacity-100 text-[var(--color-accent)] transition-opacity">grid_view</span>
            </h1>
            
            {/* Active Repo Name (replaces Vigilant Mode when in a project) */}
            {isInProject && activeRepoName ? (
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3 rounded-none">
                <p className="font-mono text-[9px] text-[var(--color-muted-foreground)] uppercase tracking-widest mb-1.5">
                  Active Repository
                </p>
                <p className="font-mono text-xs text-[var(--color-accent)] font-semibold break-all leading-relaxed flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">folder_open</span>
                  {activeRepoName}
                </p>
              </div>
            ) : (
              <p className="font-mono text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-widest flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-none ${vigilantMode ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`} />
                Vigilant Mode
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex flex-row lg:flex-col flex-1 lg:flex-grow lg:overflow-y-auto px-2 lg:px-4 space-x-1 lg:space-x-0 lg:space-y-1.5 items-center lg:items-stretch justify-around lg:justify-start">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <a
              key={item.id}
              href={`#/${item.id}`}
              className={`flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-5 py-2.5 lg:py-3.5 rounded-none text-sm transition-colors cursor-pointer group flex-1 lg:flex-none ${
                isActive
                  ? 'text-[var(--color-foreground)] bg-[var(--color-card)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card)]/50'
              }`}
            >
              <span className={`hidden lg:inline font-mono text-xs w-6 ${isActive ? 'text-[var(--color-accent)]' : 'group-hover:text-[var(--color-accent)] transition-colors'}`}>{item.num}.</span>
              <span className="material-symbols-outlined lg:hidden text-[20px]">{item.icon}</span>
              <span className={`hidden lg:inline font-sans font-medium animate-underline ${isActive ? 'active' : ''}`}>{item.label}</span>
            </a>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-row lg:flex-col px-2 lg:px-4 lg:pt-6 lg:border-t border-[var(--color-border)] space-x-1 lg:space-x-0 lg:space-y-1.5 lg:pb-4 items-center justify-end shrink-0">
        <a
          onClick={(e) => { e.preventDefault(); onNavigate('home'); }}
          href="#/home"
          className="flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-5 py-2.5 lg:py-3.5 rounded-none text-sm font-sans font-medium transition-colors cursor-pointer group text-[var(--color-muted-foreground)] hover:text-[var(--color-accent)] hover:bg-[var(--color-card)]/50"
          title="Return to Dashboard"
        >
          <span className="material-symbols-outlined text-[20px] lg:text-[18px]">arrow_back</span>
          <span className="hidden lg:inline font-mono text-xs uppercase tracking-wider font-semibold">Dashboard</span>
        </a>

        <a
          href="#/settings"
          onClick={(e) => { e.preventDefault(); onNavigate('settings'); }}
          className={`flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-5 py-2.5 lg:py-3.5 rounded-none text-sm font-sans font-medium transition-colors cursor-pointer group ${
            currentView === 'settings' ? 'text-[var(--color-foreground)] bg-[var(--color-card)]' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card)]/50'
          }`}
        >
          <span className="material-symbols-outlined text-[20px] lg:text-[18px]">settings</span>
          <span className={`hidden lg:inline animate-underline ${currentView === 'settings' ? 'active' : ''}`}>Settings</span>
        </a>
      </div>
    </nav>
  );
};
