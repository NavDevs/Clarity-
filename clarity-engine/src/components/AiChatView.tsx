import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, ArchitectureNode } from '../types';

interface AiChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  activeContextNode: ArchitectureNode | null;
  isGenerating?: boolean;
  onClose?: () => void;
}

export const AiChatView: React.FC<AiChatViewProps> = ({
  messages,
  onSendMessage,
  activeContextNode,
  isGenerating = false,
  onClose
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Auto-resize textarea as content grows
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isGenerating) {
      onSendMessage(inputText.trim());
      setInputText('');
      // Reset height after send
      setTimeout(() => {
        if (textareaRef.current) textareaRef.current.style.height = '56px';
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const contextLabel = activeContextNode 
    ? `Context: ${activeContextNode.name}`
    : 'Context: Global';

  return (
    <div className="flex-1 relative flex flex-col min-w-0 h-full overflow-hidden bg-[var(--color-background)] text-[var(--color-foreground)]">

      {/* AI Chat Main Interface Panel */}
      <div className="flex-1 flex justify-center z-10 p-0 sm:p-6 overflow-hidden">
        <div className="w-full h-full flex flex-col bg-[var(--color-card)] border-x-0 sm:border-x border-y-0 sm:border-y border-[var(--color-border)] overflow-hidden">
          {/* Chat Header */}
          <div className="h-20 border-b border-[var(--color-border)] flex items-center justify-between px-8 bg-[var(--color-background)] shrink-0">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-[var(--color-accent)] text-[28px]">
                psychology
              </span>
              <h2 className="font-display font-semibold text-2xl tracking-wide">
                Clarity AI
              </h2>
            </div>

            <div className="flex items-center gap-4">
            </div>
          </div>

          {/* Chat Messages History */}
          <div className="flex-1 overflow-y-auto chat-scroll p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[var(--color-background)]">
            <div className="flex justify-center">
              <span className="font-mono font-semibold text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-widest px-4 py-1 border border-[var(--color-border)] bg-[var(--color-muted)]">
                Today
              </span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full mb-6 sm:mb-8 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className={`flex gap-3 sm:gap-4 max-w-[95%] sm:max-w-[85%] lg:max-w-[75%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                   {/* Avatar */}
                   <div className="shrink-0 mt-1">
                     {msg.sender === 'user' ? (
                        <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-accent)] text-[var(--color-background)] rounded-none">
                          <span className="material-symbols-outlined text-[20px]">person</span>
                        </div>
                     ) : (
                        <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-accent)] rounded-none">
                          <span className="material-symbols-outlined text-[20px]">psychology</span>
                        </div>
                     )}
                   </div>
                   
                   {/* Bubble Content */}
                   <div className={`min-w-0 p-4 sm:p-6 lg:p-8 border rounded-none ${
                      msg.sender === 'user' 
                        ? 'bg-[var(--color-muted)] border-[var(--color-border)]' 
                        : 'bg-[var(--color-card)] border-[var(--color-border)]'
                    }`}>
                      <div className={`flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                          {msg.sender === 'user' ? 'You' : 'Clarity AI'}
                        </span>
                      </div>
                      
                      <div className="text-sm md:text-base font-sans text-[var(--color-foreground)] leading-loose">
                        {msg.sender === 'user' ? (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        ) : (
                          <div className="prose-like max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({node, ...props}) => <p className="mb-6 last:mb-0 leading-loose" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-bold text-[var(--color-accent)]" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-6 space-y-3 marker:text-[var(--color-accent)]" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-6 space-y-3 marker:text-[var(--color-accent)] font-mono text-sm" {...props} />,
                                li: ({node, ...props}) => <li className="" {...props} />,
                                h1: ({node, ...props}) => <h1 className="font-display text-2xl font-bold mb-6 mt-8 text-[var(--color-foreground)] tracking-wide" {...props} />,
                                h2: ({node, ...props}) => <h2 className="font-display text-xl font-bold mb-4 mt-8 text-[var(--color-foreground)] tracking-wide border-b border-[var(--color-border)] pb-3" {...props} />,
                                h3: ({node, ...props}) => <h3 className="font-mono text-sm font-bold mb-3 mt-6 text-[var(--color-accent)] uppercase tracking-widest" {...props} />,
                                pre: ({node, ...props}) => (
                                  <div className="bg-[#0A0A0B] border border-[var(--color-border)] p-6 font-mono text-sm overflow-x-auto my-6 rounded-none shadow-inner">
                                    <pre {...props} />
                                  </div>
                                ),
                                code: ({node, className, children, ...props}: any) => (
                                  <code className={`font-mono text-[13px] bg-[var(--color-input)] border border-[var(--color-border)] px-1.5 py-0.5 ${className || ''}`} {...props}>{children}</code>
                                )
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        )}

                        {msg.codeSnippet && (
                          <div className="bg-[#0A0A0B] border border-[var(--color-border)] p-6 font-mono text-sm overflow-x-auto mt-8 shadow-inner">
                            <pre><code>{msg.codeSnippet}</code></pre>
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-none p-4 font-mono font-semibold text-xs text-[var(--color-muted-foreground)] uppercase tracking-widest flex items-center gap-4">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
                  <span>Reasoning over codebase...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Terminal Input Bar */}
          <div className="px-2 py-2 bg-[var(--color-background)] border-t border-[var(--color-border)] shrink-0">
            <div className="w-full">
              <form onSubmit={handleSubmit} className="relative flex items-start bg-[var(--color-input)] border border-[var(--color-border)] rounded-none focus-within:border-[var(--color-accent)] transition-colors group">
                <span className="shrink-0 pl-4 pt-3 font-mono font-semibold text-lg text-[var(--color-muted-foreground)] group-focus-within:text-[var(--color-accent)] transition-colors">
                  &gt;
                </span>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => { setInputText(e.target.value); autoResize(); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Clarity about this codebase..."
                  style={{ height: '48px', resize: 'none', overflowY: 'auto' }}
                  className="w-full bg-transparent border-none focus:ring-0 font-sans text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] pl-3 pr-16 py-3 focus:outline-none leading-relaxed"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isGenerating}
                  className="shrink-0 self-stretch px-5 bg-[var(--color-muted)] hover:bg-[var(--color-accent)] text-[var(--color-muted-foreground)] hover:text-[var(--color-background)] disabled:opacity-50 transition-colors flex items-center justify-center border-l border-[var(--color-border)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </form>

              <div className="flex justify-between items-center mt-1 px-1 text-[10px] font-mono font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  Enter to send, Shift+Enter for new line
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
