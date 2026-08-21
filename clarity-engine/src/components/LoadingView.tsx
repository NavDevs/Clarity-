import React from 'react';
import { motion } from 'motion/react';

interface LoadingStepProps {
  text: string;
  delay: number;
}

const LoadingStep: React.FC<LoadingStepProps> = ({ text, delay }) => {
  const [active, setActive] = React.useState(false);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    const t1 = setTimeout(() => setActive(true), delay * 1000);
    const t2 = setTimeout(() => setDone(true), (delay + 1.8) * 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [delay]);

  return (
    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider w-full">
      <div className="w-5 h-5 flex items-center justify-center shrink-0 border border-[var(--color-border)] bg-[var(--color-background)]">
        {!active && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-border)]" />}
        {active && !done && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="material-symbols-outlined text-[13px] text-[var(--color-accent)]"
          >
            sync
          </motion.span>
        )}
        {done && <span className="material-symbols-outlined text-[13px] text-green-500 font-bold">check</span>}
      </div>
      <span
        className={`${
          active ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'
        } transition-colors duration-300 text-left`}
      >
        {text}
      </span>
    </div>
  );
};

interface LoadingViewProps {
  repoUrl?: string;
}

export const LoadingView: React.FC<LoadingViewProps> = ({ repoUrl }) => {
  return (
    <div className="fixed inset-0 w-screen h-screen z-[99999] flex flex-col items-center justify-center bg-[var(--color-background)] text-[var(--color-foreground)] font-sans bg-noise select-none overflow-hidden p-4">
      {/* Background ambient glow centered */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-accent)]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center w-full max-w-md my-auto relative z-10"
      >
        {/* Animated Radar Scanner */}
        <div className="relative w-28 h-28 mb-10 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
            className="absolute inset-0 border border-[var(--color-border)] rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 12, ease: 'linear', repeat: Infinity }}
            className="absolute inset-3 border border-dashed border-[var(--color-muted-foreground)]/40 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
            className="w-3.5 h-3.5 bg-[var(--color-accent)] rounded-full shadow-[0_0_20px_var(--color-accent)]"
          />
          <motion.div
            className="absolute inset-0 border-t-2 border-[var(--color-accent)] rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, ease: 'easeInOut', repeat: Infinity }}
          />
        </div>

        {/* Title & Tagline */}
        <div className="flex flex-col items-center text-center w-full">
          <motion.h2
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
            className="font-display font-bold text-3xl sm:text-4xl tracking-tighter text-[var(--color-foreground)] mb-3"
          >
            INGESTING REPO.
          </motion.h2>

          <div className="flex items-center justify-center gap-4 mb-6 w-full">
            <span className="w-12 h-px bg-[var(--color-accent)] block" />
            <span className="font-mono text-xs font-semibold text-[var(--color-accent)] uppercase tracking-[0.25em]">
              AI Neural Mapping
            </span>
            <span className="w-12 h-px bg-[var(--color-accent)] block" />
          </div>

          {/* Repo identifier pill if available */}
          {repoUrl ? (
            <div className="mb-6 px-3 py-1 bg-[var(--color-card)] border border-[var(--color-border)] font-mono text-[11px] text-[var(--color-muted-foreground)] max-w-sm truncate">
              {repoUrl}
            </div>
          ) : null}

          {/* Checklist Box */}
          <div className="w-full flex flex-col items-start gap-3.5 border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-2xl">
            <LoadingStep text="Fetching Repository Tree..." delay={0} />
            <LoadingStep text="Auditing Hardcoded Secrets..." delay={0.6} />
            <LoadingStep text="Resolving Dependency Graphs..." delay={1.4} />
            <LoadingStep text="Building AI Architecture Map..." delay={2.4} />
          </div>

          {/* Bottom pulse status */}
          <div className="flex items-center gap-2 mt-6 font-mono text-[11px] text-[var(--color-muted-foreground)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-ping" />
            <span>Processing AST nodes and dependency trees...</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
