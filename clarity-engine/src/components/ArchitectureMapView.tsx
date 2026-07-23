import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArchitectureNode, ArchitectureEdge, ViewMode } from '../types';

export const ArchitectureMapView: React.FC<ArchitectureMapViewProps> = ({
  nodes,
  edges = [],
  onSelectNode,
  selectedNode,
  aiSummary,
  detectedStack,
  onNavigate,
  onRunNodeAudit,
  repoFullName = 'facebook/react' // Fallback
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [activeNodeState, setActiveNodeState] = useState<ArchitectureNode>(selectedNode || nodes[0]);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const startPanRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [liveCode, setLiveCode] = useState<string | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState(false);

  // Resize Panel State
  const [panelWidth, setPanelWidth] = useState(450); // 450px default medium size
  const isResizingRef = useRef(false);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 200 && newWidth < 800) {
      setPanelWidth(newWidth);
    }
  }, []);

  const handleResizeEnd = useCallback(() => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'default';
  }, [handleResizeMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  useEffect(() => {
    if (codeModalOpen && activeNodeState?.path) {
      setIsLoadingCode(true);
      setLiveCode(null);
      fetch(`https://api.github.com/repos/${repoFullName}/contents/${activeNodeState.path}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const files = data.map((item: any) => `📁 ${item.name}`).join('\n');
            setLiveCode(`// ${activeNodeState.path} is a directory.\n// Contents:\n\n${files}`);
          } else if (data.content) {
            try {
              // Decode base64 and handle UTF-8
              const decoded = decodeURIComponent(escape(window.atob(data.content)));
              setLiveCode(decoded);
            } catch(e) {
              setLiveCode(window.atob(data.content));
            }
          } else {
            if (data.message === 'Not Found' || activeNodeState.path === '.') {
              setLiveCode(`// 🏗️ Architectural Module: ${activeNodeState.name}\n// \n// This node represents a high-level logical component or a combination of multiple files/folders.\n// It acts as a conceptual abstraction rather than mapping to a single specific directory.`);
            } else {
              setLiveCode(`// Could not fetch source code.\n// GitHub API Response: ${data.message || 'Unknown error'}`);
            }
          }
        })
        .catch(err => setLiveCode(`// Error fetching source code: ${err.message}`))
        .finally(() => setIsLoadingCode(false));
    }
  }, [codeModalOpen, activeNodeState, repoFullName]);

  const handleNodeClick = (node: ArchitectureNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveNodeState(node);
    onSelectNode(node);
  };

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-card')) return;
    setIsPanning(true);
    startPanRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: panOffset.x,
      initialY: panOffset.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - startPanRef.current.x;
    const dy = e.clientY - startPanRef.current.y;
    setPanOffset({
      x: startPanRef.current.initialX + dx,
      y: startPanRef.current.initialY + dy
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const currentCmd = `scan --target ${activeNodeState ? activeNodeState.name : 'models/'}`;

  return (
    <div className="flex-grow flex relative overflow-hidden h-full w-full bg-[var(--color-background)]">
      {/* Infinite Canvas */}
      <div 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-grow bg-noise relative overflow-hidden no-scrollbar select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Canvas Content Container with Panning transform */}
        <div 
          className="relative w-full h-full min-w-[1300px] min-h-[900px] p-12 transition-transform duration-75 origin-top-left"
          style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})` }}
        >
          {/* SVG Connections matching exact paths */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 min-w-[1300px] min-h-[900px]">
            <defs>
              <marker id="arrowhead-normal" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="var(--color-muted-foreground)" opacity="0.5" />
              </marker>
              <marker id="arrowhead-active" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="var(--color-accent)" />
              </marker>
            </defs>
            {edges.map((edge, i) => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;
              
              const startX = sourceNode.x + 192;
              const startY = sourceNode.y + 60;
              const endX = targetNode.x;
              const endY = targetNode.y + 60;
              
              const isSelected = activeNodeState?.id === edge.source || activeNodeState?.id === edge.target;
              
              return (
                <path 
                  key={i} 
                  className={`connection edge-animated transition-all duration-300 ${isSelected ? 'stroke-[var(--color-accent)] opacity-100 z-10' : 'stroke-[var(--color-muted-foreground)] opacity-50'}`} 
                  style={{ strokeWidth: isSelected ? 2 : 1.5 }}
                  markerEnd={isSelected ? "url(#arrowhead-active)" : "url(#arrowhead-normal)"}
                  d={`M ${startX} ${startY} C ${startX + 50} ${startY}, ${endX - 50} ${endY}, ${endX} ${endY}`} 
                />
              );
            })}
          </svg>

          {/* Render Interactive Nodes */}
          {nodes.map((node) => {
            const isSelected = activeNodeState?.id === node.id;
            
            return (
              <div
                key={node.id}
                onClick={(e) => handleNodeClick(node, e)}
                style={{
                  top: `${node.y}px`,
                  left: `${node.x}px`
                }}
                className={`node-card absolute w-48 rounded-none p-4 z-10 cursor-pointer transition-colors border group ${
                  isSelected ? 'border-[var(--color-accent)] bg-[var(--color-muted)]' : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-muted-foreground)]'
                }`}
              >
                <div className="flex justify-between items-start mb-3 gap-2">
                  <h3 className={`font-semibold text-sm font-sans tracking-wide break-words flex-1 leading-tight ${isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-foreground)]'}`}>
                    {node.name}
                  </h3>
                  <span className={`material-symbols-outlined text-[16px] ${isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted-foreground)]'}`}>
                    {node.type === 'database' ? 'database' :
                     node.type === 'folder' ? 'folder' :
                     node.name.includes('auth') ? 'security' : 'bolt'}
                  </span>
                </div>

                <p className="font-mono text-[10px] mb-3 break-all text-[var(--color-muted-foreground)]">
                  {node.path}
                </p>

                <div className="flex flex-col gap-3 mt-4">
                  {node.status === 'SAFE' && (
                    <span className="font-mono text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase">
                      • Safe
                    </span>
                  )}
                  {(node.status === 'REVIEW' || node.status === 'WARNING') && (
                    <span className="font-mono text-[10px] font-semibold text-yellow-500 uppercase">
                      • Review
                    </span>
                  )}
                  {node.status === 'CRITICAL' && (
                    <span className="font-mono text-[10px] font-semibold text-[var(--color-accent)] uppercase">
                      • Critical
                    </span>
                  )}
                  
                  <div className="flex justify-between w-full border-t border-[var(--color-border)] pt-2 mt-1">
                    {node.size && (
                      <span className="font-mono text-[10px] text-[var(--color-muted-foreground)]">{node.size}</span>
                    )}
                    {node.fileCount && (
                      <span className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
                        {node.fileCount} Files
                      </span>
                    )}
                  </div>
                  
                  {node.dependencies && node.dependencies.length > 0 && (
                    <div className="flex flex-wrap gap-1 border-t border-[var(--color-border)] pt-2 mt-1">
                      {node.dependencies.map((dep, idx) => (
                        <span key={idx} className="font-mono text-[8px] bg-[var(--color-background)] border border-[var(--color-border)] px-1 py-0.5 uppercase tracking-wider text-[var(--color-muted-foreground)]">
                          {dep}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Canvas Floating Controls */}
        <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 bg-[var(--color-card)] border border-[var(--color-border)] p-2 font-mono text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider">
          <button 
            onClick={() => { setPanOffset({ x: 0, y: 0 }); setScale(1); }}
            className="px-3 py-1 hover:text-[var(--color-foreground)] transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[14px]">center_focus_strong</span>
            Reset
          </button>
          <span className="text-[var(--color-border)]">|</span>
          <button 
            onClick={() => setScale(s => Math.min(s + 0.1, 2))}
            className="px-2 py-1 hover:text-[var(--color-foreground)] transition-colors flex items-center gap-1"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-[16px]">zoom_in</span>
          </button>
          <button 
            onClick={() => setScale(s => Math.max(s - 0.1, 0.5))}
            className="px-2 py-1 hover:text-[var(--color-foreground)] transition-colors flex items-center gap-1"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-[16px]">zoom_out</span>
          </button>
          <span className="text-[var(--color-border)]">|</span>
          <span className="px-2">Drag Canvas</span>
        </div>

        {/* Floating Note */}
        <div className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-[var(--color-card)] border border-[var(--color-border)] p-3 font-mono text-xs text-[var(--color-foreground)] shadow-lg animate-pulse">
          <span className="material-symbols-outlined text-[16px] text-[var(--color-accent)]">info</span>
          <span>Tap on a block to see its relations and details</span>
        </div>
      </div>

      {/* Right Context Panel */}
      <aside 
        style={{ width: `${panelWidth}px` }}
        className="relative bg-[var(--color-background)] border-l border-[var(--color-border)] flex flex-col z-20 shrink-0 h-full"
      >
        {/* Resize Handle */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize hover:bg-[var(--color-accent)]/50 z-30 transition-colors"
          onMouseDown={handleResizeStart}
        />
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-[var(--color-foreground)] tracking-wide flex items-center gap-2">
            Context Panel
          </h2>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-8 chat-scroll">
          {/* Active Node Detail Card */}
          {activeNodeState && (
            <section className="bg-[var(--color-card)] border border-[var(--color-border)] p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border)]">
                <span className="font-mono text-sm font-semibold text-[var(--color-accent)] flex items-center gap-2 break-all">
                  <span className="material-symbols-outlined text-[16px]">description</span>
                  {activeNodeState.name}
                </span>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed mb-6 font-sans">
                {activeNodeState.description}
              </p>
              <div className="flex flex-col gap-3">
                {activeNodeState.codeSnippet && (
                  <button
                    onClick={() => setCodeModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      padding: '0.5rem 1rem',
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#FFFFFF',
                      background: 'transparent',
                      border: '1px solid #FFFFFF',
                      boxShadow: '0 0 10px 2px rgba(255,255,255,0.4), 0 0 4px 1px rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      transition: 'box-shadow 150ms ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 18px 4px rgba(255,255,255,0.6), 0 0 6px 2px rgba(255,255,255,0.35)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 10px 2px rgba(255,255,255,0.4), 0 0 4px 1px rgba(255,255,255,0.2)')}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">code</span>
                      Inspect Source
                    </span>
                  </button>
                )}
                <button
                  onClick={() => onNavigate('chat')}
                  className="btn-primary text-[10px] font-mono tracking-widest"
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">psychology</span>
                    Ask AI
                  </span>
                </button>
              </div>
            </section>
          )}

          {/* AI Architectural Summary */}
          <section>
            <h3 className="font-mono text-xs font-semibold text-[var(--color-foreground)] tracking-widest mb-3 flex items-center">
              AI Summary
            </h3>
            <div className="text-sm text-[var(--color-foreground)]/90 leading-relaxed bg-[var(--color-card)] p-5 border border-[var(--color-border)] font-sans">
              <div className="prose-like max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({node, ...props}) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-[var(--color-foreground)]" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2 marker:text-[var(--color-accent)]" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2 marker:text-[var(--color-accent)] font-mono text-sm" {...props} />,
                    li: ({node, ...props}) => <li className="" {...props} />,
                    h1: ({node, ...props}) => <h1 className="font-display text-xl font-bold mb-4 mt-6 text-[var(--color-foreground)] tracking-wide" {...props} />,
                    h2: ({node, ...props}) => <h2 className="font-display text-lg font-bold mb-3 mt-6 text-[var(--color-foreground)] tracking-wide border-b border-[var(--color-border)] pb-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="font-mono text-[11px] font-bold mb-3 mt-5 text-[var(--color-accent)] uppercase tracking-widest" {...props} />,
                    pre: ({node, ...props}) => (
                      <div className="bg-[#0A0A0B] border border-[var(--color-border)] p-4 font-mono text-xs overflow-x-auto my-4 rounded-none shadow-inner">
                        <pre {...props} />
                      </div>
                    ),
                    code: ({node, className, children, ...props}: any) => (
                      <code className={`font-mono text-[11px] bg-[var(--color-input)] border border-[var(--color-border)] px-1 py-0.5 ${className || ''}`} {...props}>{children}</code>
                    )
                  }}
                >
                  {aiSummary}
                </ReactMarkdown>
              </div>
            </div>
          </section>

          {/* Detected Tech Stack Badges */}
          <section>
            <h3 className="font-mono text-xs font-semibold text-[var(--color-foreground)] tracking-widest mb-3 flex items-center">
               Detected Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {detectedStack.map((tech) => {
                return (
                  <span
                    key={tech}
                    className="inline-flex items-center px-3 py-1.5 bg-[var(--color-input)] text-[var(--color-foreground)] border border-[var(--color-border)] font-mono text-[10px] uppercase tracking-wider font-semibold"
                  >
                    {tech}
                  </span>
                );
              })}
            </div>
          </section>
        </div>
      </aside>

      {/* Code Inspection Modal */}
      {codeModalOpen && activeNodeState && (
        <div className="fixed inset-0 z-50 bg-[var(--color-background)]/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3 font-mono text-sm text-[var(--color-foreground)]">
                <span className="material-symbols-outlined text-[var(--color-muted-foreground)] text-[20px]">code</span>
                {activeNodeState.path}
              </div>
              <button
                onClick={() => setCodeModalOpen(false)}
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-[var(--color-input)] font-mono text-sm text-[var(--color-muted-foreground)] leading-relaxed flex-grow">
              {isLoadingCode ? (
                <div className="flex items-center gap-2 text-[var(--color-accent)] animate-pulse">
                  <span className="material-symbols-outlined spin">refresh</span>
                  Fetching source from {repoFullName}...
                </div>
              ) : (
                <pre className="overflow-x-auto"><code>{liveCode || activeNodeState.codeSnippet}</code></pre>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-between items-center text-xs font-mono text-[var(--color-muted-foreground)]">
              <span className="flex gap-2 items-center">
                Status: 
                <span className={`uppercase font-semibold ${activeNodeState.status === 'CRITICAL' ? 'text-[var(--color-accent)]' : 'text-[var(--color-foreground)]'}`}>
                  {activeNodeState.status}
                </span>
              </span>
              <button
                onClick={() => setCodeModalOpen(false)}
                className="btn-ghost font-semibold uppercase tracking-widest text-[10px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
