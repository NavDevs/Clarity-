import React from 'react';
import { ViewMode } from '../types';

interface SideNavBarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode | 'home') => void;
  onOpenNewScan: () => void;
  username?: string;
  vigilantMode?: boolean;
  onLogout?: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentView,
  onNavigate,
  onOpenNewScan,
  username = 'guest',
  vigilantMode = true,
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

  return (
    <nav className="bg-[var(--color-background)] flex flex-col h-full py-8 w-72 border-r border-[var(--color-border)] shrink-0 z-20 select-none">
      {/* Header */}
      <div className="px-8 mb-8">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <h1 className="font-display font-bold text-[var(--color-foreground)] text-2xl uppercase tracking-tighter leading-none mb-2">
              CLARITY
            </h1>
            <p className="font-mono text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-widest flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-none ${vigilantMode ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`} />
              Vigilant Mode
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-grow overflow-y-auto px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <a
              key={item.id}
              href={`#/${item.id}`}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-none text-sm transition-colors text-left cursor-pointer group ${
                isActive
                  ? 'text-[var(--color-foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              <span className={`font-mono text-xs w-6 ${isActive ? 'text-[var(--color-accent)]' : 'group-hover:text-[var(--color-accent)] transition-colors'}`}>{item.num}.</span>
              <span className={`font-sans font-medium animate-underline ${isActive ? 'active' : ''}`}>{item.label}</span>
            </a>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="mt-auto px-4 pt-8 border-t border-[var(--color-border)] space-y-1 pb-4">
        <a
          href="#/settings"
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-none text-sm font-sans font-medium transition-colors text-left cursor-pointer group ${
            currentView === 'settings' ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
          <span className={`animate-underline ${currentView === 'settings' ? 'active' : ''}`}>Settings</span>
        </a>

        <a
          href="#/docs"
          className="w-full flex items-center gap-4 px-4 py-3 rounded-none text-sm font-sans font-medium transition-colors text-left text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] cursor-pointer group"
        >
          <span className="material-symbols-outlined text-[18px]">contact_support</span>
          <span className="animate-underline">Support</span>
        </a>

      </div>
    </nav>
  );
};
