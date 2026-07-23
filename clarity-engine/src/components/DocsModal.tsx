import React from 'react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-background)]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3 font-mono font-bold text-lg text-[var(--color-foreground)] uppercase tracking-wider">
            <span className="material-symbols-outlined text-[var(--color-accent)] text-[24px]">menu_book</span>
            Clarity Engine Docs
          </div>
          <button onClick={onClose} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-accent)] transition-colors">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-10 font-mono text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          
          <section>
            <h3 className="font-bold text-sm text-[var(--color-foreground)] mb-4 flex items-center gap-3 uppercase tracking-widest">
              <span className="text-[var(--color-accent)]">/</span> CLI Quickstart
            </h3>
            <div className="bg-[var(--color-input)] border border-[var(--color-border)] p-4 font-mono text-xs">
              <p className="text-[var(--color-foreground)] mb-1"><span className="text-[var(--color-accent)] font-bold mr-2">$</span>npm install -g @clarity/cli</p>
              <p className="text-[var(--color-muted-foreground)]"><span className="text-[var(--color-accent)] font-bold mr-2">$</span>clarity-scan --path ./src --rules secrets,ast</p>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-sm text-[var(--color-foreground)] mb-4 flex items-center gap-3 uppercase tracking-widest">
              <span className="text-[var(--color-accent)]">/</span> GitHub Action Integration
            </h3>
            <p className="mb-4 text-sans font-sans text-sm text-[var(--color-foreground)]/80">
              Add the Clarity Security Guard action to your CI/CD pipeline to block pull requests with exposed secrets or prototype pollution risks.
            </p>
            <div className="bg-[var(--color-input)] border border-[var(--color-border)] p-4 font-mono text-[11px] leading-loose">
              <p><span className="text-[var(--color-accent)]">- name:</span> Clarity Architecture Audit</p>
              <p className="pl-2"><span className="text-[var(--color-foreground)]">uses:</span> clarity-systems/scan-action@v2</p>
              <p className="pl-2"><span className="text-[var(--color-foreground)]">with:</span></p>
              <p className="pl-6"><span className="text-[var(--color-accent)]">fail-on:</span> 'CRITICAL'</p>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-sm text-[var(--color-foreground)] mb-4 flex items-center gap-3 uppercase tracking-widest">
              <span className="text-[var(--color-accent)]">/</span> AI Codebase Reasoning
            </h3>
            <p className="font-sans text-sm text-[var(--color-foreground)]/80 leading-relaxed">
              Clarity Engine parses the AST (Abstract Syntax Tree) into a spatial vector map. When you chat with Clarity AI, it retrieves connected nodes and code snippets to give accurate answers.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--color-border)] flex justify-end bg-[var(--color-background)]">
          <button
            onClick={onClose}
            className="btn-primary w-full sm:w-auto px-8"
          >
            Close Documentation
          </button>
        </div>

      </div>
    </div>
  );
};
