import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ViewMode } from '../types';

interface SideNavBarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode | 'home') => void;
  onOpenNewScan: () => void;
  username?: string;
  vigilantMode?: boolean;
  onLogout?: () => void;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 288; // w-72 = 18rem = 288px

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentView,
  onNavigate,
  onOpenNewScan,
  username = 'guest',
  vigilantMode = true,
  onLogout
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('clarity_sidebar_width');
      return saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parseInt(saved))) : DEFAULT_WIDTH;
    } catch { return DEFAULT_WIDTH; }
  });
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const delta = e.clientX - startXRef.current;
    const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidthRef.current + delta));
    setSidebarWidth(newWidth);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      try { localStorage.setItem('clarity_sidebar_width', String(sidebarWidth)); } catch {}
    }
  }, [isResizing, sidebarWidth]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

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
    <nav
      className="bg-[var(--color-background)] flex flex-row lg:flex-col fixed bottom-0 left-0 w-full lg:relative h-16 lg:h-full lg:py-8 border-t lg:border-t-0 lg:border-r border-[var(--color-border)] shrink-0 z-50 lg:z-20 select-none overflow-x-auto lg:overflow-visible"
      style={{ width: undefined }} // mobile: full width via className
    >
      {/* Desktop: apply dynamic width */}
      <div
        className="hidden lg:flex flex-col h-full relative"
        style={{ width: `${sidebarWidth}px` }}
      >
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
                <span className={`font-sans font-medium animate-underline whitespace-nowrap ${isActive ? 'active' : ''}`}>{item.label}</span>
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
            <span className={`animate-underline whitespace-nowrap ${currentView === 'settings' ? 'active' : ''}`}>Settings</span>
          </a>

          <a
            href="#/docs"
            className="w-full flex items-center gap-4 px-4 py-3 rounded-none text-sm font-sans font-medium transition-colors text-left text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] cursor-pointer group"
          >
            <span className="material-symbols-outlined text-[18px]">contact_support</span>
            <span className="animate-underline whitespace-nowrap">Support</span>
          </a>
        </div>

        {/* Drag Handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize group z-30 hover:bg-[var(--color-accent)] transition-colors duration-150"
          style={{ backgroundColor: isResizing ? 'var(--color-accent)' : 'transparent' }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1 h-12 rounded-full bg-[var(--color-border)] group-hover:bg-[var(--color-accent)] transition-colors" />
        </div>
      </div>

      {/* Mobile: horizontal bottom bar (icons only) */}
      <div className="flex lg:hidden flex-row flex-1 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <a
              key={item.id}
              href={`#/${item.id}`}
              className={`flex items-center justify-center px-3 py-2 transition-colors cursor-pointer flex-1 ${
                isActive
                  ? 'text-[var(--color-foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            </a>
          );
        })}
        <a
          href="#/settings"
          className={`flex items-center justify-center px-3 py-2 transition-colors cursor-pointer ${
            currentView === 'settings' ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </a>
      </div>
    </nav>
  );
};
