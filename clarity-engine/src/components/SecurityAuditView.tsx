import React, { useState } from 'react';
import { SecurityFinding } from '../types';

interface SecurityAuditViewProps {
  findings: SecurityFinding[];
  onFixFinding?: (findingId: string) => void;
  onTriggerAudit?: () => void;
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({
  findings,
  onFixFinding,
  onTriggerAudit
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'SAFE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [fixedIds, setFixedIds] = useState<Record<string, boolean>>({});

  const handleFix = (id: string) => {
    setFixedIds((prev) => ({ ...prev, [id]: true }));
    if (onFixFinding) {
      onFixFinding(id);
    }
  };

  const filteredFindings = findings.filter((f) => {
    const matchesSeverity = filterSeverity === 'ALL' || f.severity === filterSeverity;
    const matchesSearch = 
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.path.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL' && !fixedIds[f.id]).length;
  const warningCount = findings.filter((f) => f.severity === 'WARNING' && !fixedIds[f.id]).length;
  const safeCount = findings.filter((f) => f.severity === 'SAFE' || fixedIds[f.id]).length;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-16 relative z-0 text-[var(--color-foreground)] bg-[var(--color-background)]">
      {/* Header */}
      <header className="mb-12 lg:mb-16 border-b border-[var(--color-border)] pb-8 lg:pb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8">
        <div>
          <div className="flex items-center gap-4 mb-8">
            <span className="w-12 h-0.5 bg-[var(--color-accent)] block" />
            <span className="font-mono text-xs font-semibold text-[var(--color-accent)] uppercase tracking-[0.2em]">
              Security Audit
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold text-[var(--color-foreground)] mb-4 lg:mb-6 tracking-tighter leading-[0.9]">
            Audit<br className="hidden sm:block" /> Findings.
          </h1>
          <p className="text-lg text-[var(--color-muted-foreground)] font-serif max-w-2xl leading-relaxed">
            Review the latest scan results for vulnerabilities, secret exposures, and misconfigurations.
          </p>
        </div>

      </header>

      {/* Control Bar: Severity Badges & Search */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 lg:gap-8 mb-12 lg:mb-16">
        {/* Filter Tabs */}
        <div className="flex flex-row overflow-x-auto no-scrollbar items-center gap-4 lg:gap-6 font-mono text-xs uppercase tracking-widest border-b border-[var(--color-border)] xl:border-b-0">
          <button
            onClick={() => setFilterSeverity('ALL')}
            className={`pb-1 transition-colors border-b ${
              filterSeverity === 'ALL'
                ? 'text-[var(--color-foreground)] border-[var(--color-accent)] font-semibold'
                : 'text-[var(--color-muted-foreground)] border-transparent hover:text-[var(--color-foreground)] hover:border-[var(--color-foreground)]'
            }`}
          >
            All ({findings.length})
          </button>
          <button
            onClick={() => setFilterSeverity('CRITICAL')}
            className={`pb-1 transition-colors border-b flex items-center gap-2 ${
              filterSeverity === 'CRITICAL'
                ? 'text-[var(--color-accent)] border-[var(--color-accent)] font-semibold'
                : 'text-[var(--color-muted-foreground)] border-transparent hover:text-[var(--color-foreground)] hover:border-[var(--color-foreground)]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterSeverity === 'CRITICAL' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-muted-foreground)]'}`} />
            Critical ({criticalCount})
          </button>
          <button
            onClick={() => setFilterSeverity('WARNING')}
            className={`pb-1 transition-colors border-b flex items-center gap-2 ${
              filterSeverity === 'WARNING'
                ? 'text-yellow-500 border-yellow-500 font-semibold'
                : 'text-[var(--color-muted-foreground)] border-transparent hover:text-[var(--color-foreground)] hover:border-[var(--color-foreground)]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterSeverity === 'WARNING' ? 'bg-yellow-500' : 'bg-[var(--color-muted-foreground)]'}`} />
            Warning ({warningCount})
          </button>
          <button
            onClick={() => setFilterSeverity('SAFE')}
            className={`pb-1 transition-colors border-b flex items-center gap-2 ${
              filterSeverity === 'SAFE'
                ? 'text-[var(--color-foreground)] border-[var(--color-foreground)] font-semibold'
                : 'text-[var(--color-muted-foreground)] border-transparent hover:text-[var(--color-foreground)] hover:border-[var(--color-foreground)]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterSeverity === 'SAFE' ? 'bg-[var(--color-foreground)]' : 'bg-[var(--color-muted-foreground)]'}`} />
            Safe ({safeCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full xl:w-96">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search findings..."
            className="w-full bg-[var(--color-input)] border border-[var(--color-border)] rounded-none h-12 pl-12 pr-4 text-sm text-[var(--color-foreground)] font-sans focus:outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-muted-foreground)]"
          />
        </div>
      </div>

      {/* Findings Cards List */}
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {filteredFindings.length === 0 ? (
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-none p-16 text-center text-[var(--color-muted-foreground)] font-mono text-sm uppercase tracking-widest">
            No security findings match your active filter criteria.
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isFixed = fixedIds[finding.id] || finding.fixed;
            const effectiveSeverity = isFixed ? 'SAFE' : finding.severity;

            const isCritical = effectiveSeverity === 'CRITICAL';
            const isWarning = effectiveSeverity === 'WARNING';

            const cardBorder = isCritical ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]';
            const iconColor = isCritical ? 'text-[var(--color-accent)]' : isWarning ? 'text-yellow-500' : 'text-[var(--color-muted-foreground)]';

            const iconName = 
              isCritical ? 'warning' :
              isWarning ? 'error' : 'check_circle';

            return (
              <div
                key={finding.id}
                className={`bg-[var(--color-card)] border ${cardBorder} rounded-none flex flex-col transition-colors`}
              >
                <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Title and Tag */}
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-4 sm:mb-6 gap-4 sm:gap-6 pb-4 sm:pb-6 border-b border-[var(--color-border)]">
                      <div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                          <span className={`material-symbols-outlined text-[20px] sm:text-[24px] ${iconColor}`}>
                            {iconName}
                          </span>
                          <h3 className="font-display font-semibold text-xl sm:text-2xl text-[var(--color-foreground)] tracking-wide">
                            {finding.title} 
                            {isFixed && <span className="ml-2 sm:ml-4 font-mono text-[10px] font-semibold border border-[var(--color-border)] px-2 py-0.5 bg-[var(--color-muted)] text-[var(--color-muted-foreground)] uppercase tracking-widest">Fixed</span>}
                          </h3>
                        </div>
                        <p className="text-sm text-[var(--color-muted-foreground)] font-sans max-w-3xl leading-relaxed whitespace-pre-line mt-2">
                          {finding.description}
                        </p>
                      </div>

                      <span className={`font-mono text-[10px] font-semibold px-3 py-1 uppercase tracking-widest border border-[var(--color-border)] shrink-0 ${isCritical ? 'text-[var(--color-accent)] border-[var(--color-accent)]' : isWarning ? 'text-yellow-500 border-yellow-500' : 'text-[var(--color-muted-foreground)]'}`}>
                        {effectiveSeverity}
                      </span>
                    </div>

                    {/* Code Snippet Box */}
                    {finding.codeSnippet && (
                      <div className="bg-[var(--color-input)] border border-[var(--color-border)] p-6 font-mono text-sm overflow-x-auto text-[var(--color-foreground)] my-8">
                        <div className="flex gap-6">
                          {finding.lineNumbers && (
                            <div className="text-[var(--color-muted-foreground)] text-right select-none whitespace-pre">
                              {finding.lineNumbers}
                            </div>
                          )}
                          <div className="whitespace-pre leading-loose">
                            {finding.codeSnippet}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 gap-4 text-xs font-mono text-[var(--color-muted-foreground)] tracking-widest uppercase mt-6">
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">folder</span>
                      {finding.path || "Global Configuration"}
                    </span>
                    {!isFixed && finding.fixActionLabel && (
                      <button
                        onClick={() => handleFix(finding.id)}
                        className="btn-ghost font-semibold border border-[var(--color-border)] hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)] gap-2 px-4 py-2 text-[10px]"
                      >
                        <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                        {finding.fixActionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
