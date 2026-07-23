import React, { useState } from 'react';

interface NewScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScan: (repoUrl: string) => void;
  isScanning?: boolean;
}

export const NewScanModal: React.FC<NewScanModalProps> = ({
  isOpen,
  onClose,
  onStartScan,
  isScanning = false
}) => {
  const [repoUrl, setRepoUrl] = useState('');

  if (!isOpen) return null;



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      onStartScan(repoUrl.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-background)]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] w-full max-w-2xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3 font-mono font-bold text-lg text-[var(--color-foreground)] uppercase tracking-wider">
            <span className="material-symbols-outlined text-[var(--color-accent)] text-[24px]">radar</span>
            Trigger New Architecture Scan
          </div>
          <button onClick={onClose} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-accent)] transition-colors">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-10 font-mono">
          
          <section>
            <label className="block text-xs font-semibold text-[var(--color-foreground)] uppercase tracking-[0.2em] mb-4">
              GitHub Repository URL or Name
            </label>
            <div className="relative flex items-center bg-[var(--color-input)] border border-[var(--color-border)] focus-within:border-[var(--color-accent)] transition-colors h-14 px-4">
              <span className="font-mono text-[var(--color-accent)] font-bold text-lg mr-4">&gt;</span>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                className="w-full h-full bg-transparent border-none focus:ring-0 font-sans text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none"
                autoFocus
              />
            </div>
          </section>



          {/* Footer Actions */}
          <div className="pt-6 border-t border-[var(--color-border)] flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 font-mono text-xs font-bold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!repoUrl.trim() || isScanning}
              className="btn-primary w-full sm:w-auto px-8"
            >
              {isScanning ? 'Analyzing AST...' : 'Analyze Repository'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
