import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'motion/react';
import { TechStackItem } from '../types';
import { cleanMarkdown } from '../utils/markdownUtils';

import { API_BASE } from '../config';

interface TechStackViewProps {
  stackItems: TechStackItem[];
  repoContext?: any;
  onUpdateStackItem?: (itemId: string) => void;
}

export const TechStackView: React.FC<TechStackViewProps> = ({
  stackItems,
  repoContext,
  onUpdateStackItem
}) => {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [briefs, setBriefs] = useState<Record<string, string>>({});
  const [loadingBriefs, setLoadingBriefs] = useState<Record<string, boolean>>({});

  const handleExpand = async (id: string, name: string) => {
    if (expandedIds.includes(id)) {
      setExpandedIds(expandedIds.filter(existingId => existingId !== id));
    } else {
      setExpandedIds([...expandedIds, id]);
      
      // Fetch dynamic brief if not already loaded
      if (!briefs[id] && !loadingBriefs[id]) {
        setLoadingBriefs(prev => ({ ...prev, [id]: true }));
        try {
          const token = localStorage.getItem('clarity_token');
          const res = await fetch(`${API_BASE}/api/tech-brief`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              tech_name: name,
              context: repoContext || {}
            })
          });
          
          if (!res.ok) throw new Error('Failed to fetch brief');
          const data = await res.json();
          setBriefs(prev => ({ ...prev, [id]: data.brief }));
        } catch (error) {
          console.error(error);
          setBriefs(prev => ({ ...prev, [id]: "Brief unavailable at this time." }));
        } finally {
          setLoadingBriefs(prev => ({ ...prev, [id]: false }));
        }
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-16 relative z-0 text-[var(--color-foreground)] bg-[var(--color-background)]">
      {/* Header */}
      <header className="mb-12 lg:mb-16 border-b border-[var(--color-border)] pb-8 lg:pb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8">
        <div>
          <div className="flex items-center gap-4 mb-8">
            <span className="w-12 h-0.5 bg-[var(--color-accent)] block" />
            <span className="font-mono text-xs font-semibold text-[var(--color-accent)] uppercase tracking-[0.2em]">
              Tech Stack
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold text-[var(--color-foreground)] mb-4 lg:mb-6 tracking-tighter leading-[0.9]">
            Stack &<br className="hidden sm:block" /> Blueprint.
          </h1>
          <p className="text-lg text-[var(--color-muted-foreground)] font-serif max-w-2xl leading-relaxed">
            Automated framework classification, version tracking, and insights across all loaded modules.
          </p>
        </div>
      </header>

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-none overflow-hidden max-w-5xl mx-auto">
        <div className="p-4 sm:p-6 border-b border-[var(--color-border)] bg-[var(--color-muted)] flex flex-col sm:flex-row sm:items-center justify-between text-[var(--color-foreground)] gap-4 sm:gap-0">
          <h2 className="font-display font-semibold text-lg sm:text-xl tracking-wide flex items-center gap-3 sm:gap-4">
            <span className="material-symbols-outlined text-[20px] sm:text-[24px]">layers</span>
            Detected Frameworks & Libraries
          </h2>
          <span className="font-mono text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-widest font-semibold">
            Updated via AST Scan
          </span>
        </div>

        <div className="flex flex-col">
          {stackItems.map((item) => {
            const isExpanded = expandedIds.includes(item.id);
            return (
              <div key={item.id} className="flex flex-col border-b border-[var(--color-border)] last:border-b-0 group">
                <div 
                  className={`p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 hover:bg-[var(--color-input)] transition-colors cursor-pointer ${isExpanded ? 'bg-[var(--color-input)]' : ''}`}
                  onClick={() => handleExpand(item.id, item.name)}
                >
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div 
                      className="w-16 h-16 rounded-none border border-[var(--color-border)] flex items-center justify-center font-mono font-semibold text-2xl text-[var(--color-background)] shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-semibold text-2xl text-[var(--color-foreground)] tracking-wide group-hover:text-[var(--color-accent)] transition-colors">{item.name}</h3>
                      </div>
                      <p className="text-sm text-[var(--color-muted-foreground)] font-sans">{item.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-start md:self-auto">
                    <span className="font-mono font-semibold text-[10px] px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)] uppercase tracking-widest">
                      {item.category}
                    </span>
                    <span className={`material-symbols-outlined text-[var(--color-muted-foreground)] transition-transform duration-300 text-[24px] ${isExpanded ? 'rotate-180 text-[var(--color-accent)]' : 'group-hover:text-[var(--color-accent)]'}`}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Dropdown Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="border-t border-[var(--color-border)] bg-[var(--color-background)] overflow-hidden"
                    >
                      <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8">
                        <h4 className="font-mono text-xs font-bold text-[var(--color-accent)] uppercase tracking-[0.2em] flex items-center gap-3">
                          <span className="material-symbols-outlined text-[20px]">school</span>
                          Interview Brief
                        </h4>
                        <div className="text-sm sm:text-base font-sans leading-relaxed text-[var(--color-foreground)]/90 max-w-4xl">
                          {loadingBriefs[item.id] ? (
                            <div className="flex items-center gap-3 text-[var(--color-muted-foreground)] animate-pulse py-4">
                              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                              <span className="font-mono text-xs tracking-widest uppercase">Generating AI Brief...</span>
                            </div>
                          ) : (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                p: ({node, ...props}) => <p className="mb-6 last:mb-0 leading-loose" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-bold text-[var(--color-foreground)]" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-4 marker:text-[var(--color-accent)]" {...props} />,
                                li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                h3: ({node, ...props}) => <h3 className="font-mono text-[11px] font-bold mb-4 mt-8 text-[var(--color-accent)] uppercase tracking-widest border-b border-[var(--color-border)] pb-2" {...props} />,
                                pre: ({node, ...props}) => (
                                  <div className="bg-[#0A0A0B] border border-[var(--color-border)] p-4 font-mono text-xs overflow-x-auto my-4 rounded-none shadow-inner">
                                    <pre {...props} />
                                  </div>
                                ),
                                code: ({node, className, children, ...props}: any) => (
                                  <code className={`font-mono text-[11px] bg-[var(--color-card)] border border-[var(--color-border)] px-1 py-0.5 ${className || ''}`} {...props}>{children}</code>
                                ),
                                table: ({node, ...props}) => <div className="overflow-x-auto my-6"><table className="w-full text-left border-collapse border border-[var(--color-border)] text-sm" {...props} /></div>,
                                th: ({node, ...props}) => <th className="border border-[var(--color-border)] bg-[#0A0A0B] px-4 py-2 font-mono text-[11px] font-bold text-[var(--color-accent)] uppercase tracking-wider" {...props} />,
                                td: ({node, ...props}) => <td className="border border-[var(--color-border)] px-4 py-2 leading-relaxed" {...props} />
                              }}
                            >
                              {cleanMarkdown(briefs[item.id] || "Brief unavailable.")}
                            </ReactMarkdown>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
