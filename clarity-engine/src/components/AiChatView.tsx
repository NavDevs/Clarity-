import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ChatMessage, ArchitectureNode } from '../types';
import { cleanMarkdown } from '../utils/markdownUtils';

interface AiChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  activeContextNode: ArchitectureNode | null;
  isGenerating?: boolean;
  onClose?: () => void;
}

const markdownComponents = {
  p: ({node, ...props}: any) => <p className="mb-6 last:mb-0 leading-loose" {...props} />,
  strong: ({node, ...props}: any) => <strong className="font-bold text-[var(--color-accent)]" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc pl-6 mb-6 space-y-3 marker:text-[var(--color-accent)]" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 mb-6 space-y-3 marker:text-[var(--color-accent)] font-mono text-sm" {...props} />,
  li: ({node, ...props}: any) => <li className="" {...props} />,
  h1: ({node, ...props}: any) => <h1 className="font-display text-2xl font-bold mb-6 mt-8 text-[var(--color-foreground)] tracking-wide" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="font-display text-xl font-bold mb-4 mt-8 text-[var(--color-foreground)] tracking-wide border-b border-[var(--color-border)] pb-3" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="font-mono text-sm font-bold mb-3 mt-6 text-[var(--color-accent)] uppercase tracking-widest" {...props} />,
  pre: ({node, ...props}: any) => (
    <div className="bg-[#0A0A0B] border border-[var(--color-border)] p-6 font-mono text-sm overflow-x-auto my-6 rounded-none shadow-inner">
      <pre {...props} />
    </div>
  ),
  code: ({node, className, children, ...props}: any) => (
    <code className={`font-mono text-[13px] bg-[var(--color-input)] border border-[var(--color-border)] px-1.5 py-0.5 ${className || ''}`} {...props}>{children}</code>
  ),
  table: ({node, ...props}: any) => (
    <div className="overflow-x-auto my-6 border border-[var(--color-border)] bg-[var(--color-card)]/50">
      <table className="w-full text-left border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({node, ...props}: any) => (
    <th className="border-b border-[var(--color-border)] bg-[#0A0A0B] px-4 py-3 font-mono text-xs font-bold text-[var(--color-accent)] uppercase tracking-wider whitespace-nowrap" {...props} />
  ),
  td: ({node, ...props}: any) => (
    <td className="border-b border-[var(--color-border)]/60 px-4 py-3 leading-relaxed text-sm align-top" {...props} />
  ),
  tr: ({node, ...props}: any) => (
    <tr className="hover:bg-[var(--color-accent)]/5 transition-colors" {...props} />
  )
};

const ChatBubble: React.FC<{ msg: ChatMessage, isLastAi: boolean, onScrollToBottom: () => void }> = ({ msg, isLastAi, onScrollToBottom }) => {
  const [displayedText, setDisplayedText] = useState(isLastAi && msg.sender === 'ai' ? '' : msg.text);

  useEffect(() => {
    if (!(isLastAi && msg.sender === 'ai')) {
      setDisplayedText(msg.text);
      return;
    }
    
    let i = 0;
    const textLength = msg.text.length;
    // Keep step=1 so it always types smoothly character-by-character.
    // Adjust delay dynamically so long messages don't take forever, but aren't blindingly fast.
    const step = 1;
    const delay = textLength > 1000 ? 10 : textLength > 500 ? 14 : 20;

    const interval = setInterval(() => {
      i += step;
      if (i >= textLength) {
        setDisplayedText(msg.text);
        clearInterval(interval);
        onScrollToBottom();
      } else {
        setDisplayedText(msg.text.slice(0, i));
        onScrollToBottom();
      }
    }, delay);

    return () => clearInterval(interval);
  }, [msg.text, isLastAi, msg.sender]);

  // Sync padding to the CURRENTLY typed out length of the text!
  const currentLength = displayedText.length;
  const paddingTop = Math.min(Math.max(8 + (currentLength * 0.015), 8), 16);
  const paddingBottom = Math.min(Math.max(8 + (currentLength * 0.015), 8), 16);
  const paddingLeft = Math.min(Math.max(12 + (currentLength * 0.02), 12), 20);
  const paddingRight = Math.min(Math.max(12 + (currentLength * 0.02), 12), 20);

  return (
    <div className={`flex w-full mb-4 sm:mb-6 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 w-full ${msg.sender === 'user' ? 'flex-row-reverse max-w-[85%]' : 'max-w-full'}`}>
        {/* Avatar */}
        <div className="shrink-0 mt-1">
          {msg.sender === 'user' ? (
            <div className="w-9 h-9 flex items-center justify-center bg-[var(--color-accent)] text-[var(--color-background)] rounded-none">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          ) : (
            <div className="w-9 h-9 flex items-center justify-center bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-accent)] rounded-none">
              <span className="material-symbols-outlined text-[18px]">psychology</span>
            </div>
          )}
        </div>
        
        {/* Bubble Content */}
        <div 
          className={`min-w-0 border rounded-none w-fit max-w-full transition-all duration-100 ${
            msg.sender === 'user' 
              ? 'bg-[var(--color-muted)] border-[var(--color-border)]' 
              : 'bg-[var(--color-card)] border-[var(--color-border)]'
          }`}
          style={{ paddingTop, paddingBottom, paddingLeft, paddingRight }}
        >
          <div className={`flex items-center gap-2 mb-1.5 sm:mb-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              {msg.sender === 'user' ? 'You' : 'Clarity AI'}
            </span>
          </div>
          
          <div className="text-sm md:text-base font-sans text-[var(--color-foreground)] leading-loose">
            <div className="prose-like max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={markdownComponents}
              >
                {cleanMarkdown(displayedText)}
              </ReactMarkdown>
            </div>

            {msg.codeSnippet && (
              <div className="bg-[#0A0A0B] border border-[var(--color-border)] p-6 font-mono text-sm overflow-x-auto mt-8 shadow-inner">
                <pre><code>{msg.codeSnippet}</code></pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Track message count on mount to prevent history from re-typing
  const initialMessagesCountRef = useRef(messages.length);

  const autoScrollEnabled = useRef(true);
  const lastScrollTop = useRef(0);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    
    if (scrollTop < lastScrollTop.current) {
      // User scrolled up manually
      autoScrollEnabled.current = false;
    }
    
    if (scrollHeight - scrollTop - clientHeight < 10) {
      // User reached the bottom
      autoScrollEnabled.current = true;
    }
    
    lastScrollTop.current = scrollTop;
  };

  const scrollToBottom = (force = false) => {
    if (force || autoScrollEnabled.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: force ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    autoScrollEnabled.current = true;
    scrollToBottom(true);
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
        if (textareaRef.current) textareaRef.current.style.height = '40px';
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
      <div className="flex-1 flex z-10 p-0 overflow-hidden">
        <div className="w-full h-full flex flex-col bg-[var(--color-card)] border-0 overflow-hidden">
          {/* Chat Header */}
          <div className="h-14 border-b border-[var(--color-border)] flex items-center justify-between px-6 bg-[var(--color-background)] shrink-0">
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
          <div 
            ref={chatContainerRef} 
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto chat-scroll p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[var(--color-background)]"
          >
            <div className="flex justify-center">
              <span className="font-mono font-semibold text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-widest px-4 py-1 border border-[var(--color-border)] bg-[var(--color-muted)]">
                Today
              </span>
            </div>

            {messages.map((msg, index) => {
              const isLastAi = index === messages.length - 1 && msg.sender === 'ai' && index >= initialMessagesCountRef.current;
              return (
                <ChatBubble 
                  key={msg.id} 
                  msg={msg} 
                  isLastAi={isLastAi} 
                  onScrollToBottom={scrollToBottom} 
                />
              );
            })}

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
          <div className="px-4 py-2 bg-[var(--color-background)] border-t border-[var(--color-border)] shrink-0">
            <div className="w-full">
              <form onSubmit={handleSubmit} className="relative flex items-start bg-[var(--color-input)] border border-[var(--color-border)] rounded-none focus-within:border-[var(--color-accent)] transition-colors group">
                <span className="shrink-0 pl-4 pt-2 font-mono font-semibold text-lg text-[var(--color-muted-foreground)] group-focus-within:text-[var(--color-accent)] transition-colors">
                  &gt;
                </span>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => { setInputText(e.target.value); autoResize(); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Clarity about this codebase..."
                  style={{ height: '40px', resize: 'none', overflowY: 'auto' }}
                  className="w-full bg-transparent border-none focus:ring-0 font-sans text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] pl-3 pr-16 py-2.5 focus:outline-none leading-relaxed"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isGenerating}
                  className="shrink-0 self-stretch px-5 bg-[var(--color-muted)] hover:bg-[var(--color-accent)] text-[var(--color-muted-foreground)] hover:text-[var(--color-background)] disabled:opacity-50 transition-colors flex items-center justify-center border-l border-[var(--color-border)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </form>

              {/* Instruction text removed to save space */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
