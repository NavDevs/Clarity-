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
    <nav className="bg-[var(--color-background)] flex flex-row lg:flex-col fixed bottom-0 left-0 w-full lg:relative h-16 lg:h-full lg:py-8 lg:w-72 border-t lg:border-t-0 lg:border-r border-[var(--color-border)] shrink-0 z-50 lg:z-20 select-none overflow-x-auto lg:overflow-visible">
      {/* Header (Hidden on mobile) */}
      <div className="hidden lg:block px-8 mb-8">
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
      <div className="flex flex-row lg:flex-col flex-1 lg:flex-grow lg:overflow-y-auto px-2 lg:px-4 space-x-1 lg:space-x-0 lg:space-y-1 items-center lg:items-stretch justify-around lg:justify-start">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <a
              key={item.id}
              href={`#/${item.id}`}
              className={`flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-none text-sm transition-colors cursor-pointer group flex-1 lg:flex-none ${
                isActive
                  ? 'text-[var(--color-foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              <span className={`hidden lg:inline font-mono text-xs w-6 ${isActive ? 'text-[var(--color-accent)]' : 'group-hover:text-[var(--color-accent)] transition-colors'}`}>{item.num}.</span>
              <span className="material-symbols-outlined lg:hidden text-[20px]">{item.icon}</span>
              <span className={`hidden lg:inline font-sans font-medium animate-underline ${isActive ? 'active' : ''}`}>{item.label}</span>
            </a>
          );
        })}
      </div>

      {/* Footer Navigation (Hidden icons on mobile, or just push to right) */}
      <div className="flex flex-row lg:flex-col px-2 lg:px-4 lg:pt-8 lg:border-t border-[var(--color-border)] space-x-1 lg:space-x-0 lg:space-y-1 lg:pb-4 items-center justify-end shrink-0">
        <a
          href="#/settings"
          className={`flex items-center justify-center lg:justify-start gap-4 px-3 lg:px-4 py-2 lg:py-3 rounded-none text-sm font-sans font-medium transition-colors cursor-pointer group ${
            currentView === 'settings' ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px] lg:text-[18px]">settings</span>
          <span className={`hidden lg:inline animate-underline ${currentView === 'settings' ? 'active' : ''}`}>Settings</span>
        </a>

        <a
          href="#/docs"
          className="hidden lg:flex w-full items-center gap-4 px-4 py-3 rounded-none text-sm font-sans font-medium transition-colors text-left text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] cursor-pointer group"
        >
          <span className="material-symbols-outlined text-[18px]">contact_support</span>
          <span className="animate-underline">Support</span>
        </a>
      </div>
    </nav>
  );
};
