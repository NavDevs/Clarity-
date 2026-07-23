import React, { useState } from 'react';
import { ViewMode } from '../types';

interface LandingViewProps {
  onNavigate: (view: ViewMode | 'auth') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onNavigate
}) => {

  return (
    <div className="flex flex-col relative z-10 w-full h-full bg-[var(--color-background)] overflow-y-auto overflow-x-hidden">
      
      {/* Background Decorative Layer */}
      <div className="absolute top-20 right-10 md:top-10 md:right-20 pointer-events-none opacity-5 select-none -z-10">
        <span className="font-display font-bold text-[20rem] md:text-[30rem] leading-none tracking-tighter text-[var(--color-foreground)]">01</span>
      </div>

      <div className="flex flex-col w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-20 md:py-32 lg:py-40 relative z-20">
        <div className="flex flex-col items-start w-full">
          <div className="flex items-center gap-4 mb-16">
            <span className="w-16 h-1 bg-[var(--color-accent)] block" />
            <span className="font-mono text-sm font-semibold text-[var(--color-accent)] uppercase tracking-[0.2em]">
              System Ready
            </span>
          </div>
          
          <h1 className="font-display font-bold text-6xl md:text-8xl lg:text-[7rem] xl:text-[9rem] text-[var(--color-foreground)] leading-[0.9] tracking-tighter mb-12">
            Map your<br />codebase.
          </h1>
          
          <p className="font-serif text-xl md:text-2xl lg:text-3xl text-[var(--color-muted-foreground)] max-w-3xl mb-20 leading-relaxed">
            Instant architecture diagrams, security audits, and AI-powered insights for any public repository.
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => onNavigate('auth')}
              className="btn-primary h-14 sm:h-16 px-10 text-base border border-transparent"
            >
              <div className="flex items-center gap-3">
                <span>Get Started</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </div>
            </button>
          </div>


        </div>
      </div>

      {/* Features Section */}
      <div className="w-full border-t border-b border-[var(--color-border)] bg-[#050505] relative z-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-24">
          <div className="flex items-center gap-4 mb-16">
            <span className="w-8 h-1 bg-[var(--color-muted-foreground)] block" />
            <span className="font-mono text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-[0.2em]">
              Core Capabilities
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            
            {/* Feature 1 */}
            <div className="flex flex-col gap-6 group">
              <div className="w-16 h-16 rounded-full bg-[var(--color-border)] flex items-center justify-center group-hover:bg-[var(--color-accent)] transition-colors duration-500">
                <span className="material-symbols-outlined text-[32px] text-[var(--color-foreground)] group-hover:text-black">account_tree</span>
              </div>
              <h3 className="font-display font-bold text-3xl text-[var(--color-foreground)] tracking-tight">AI Architecture Maps</h3>
              <p className="font-serif text-lg text-[var(--color-muted-foreground)] leading-relaxed">
                Powered by Groq's Llama 3, we analyze your repository's raw folder structure and extract high-level logical modules, generating an interactive Node & Edge diagram instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col gap-6 group">
              <div className="w-16 h-16 rounded-full bg-[var(--color-border)] flex items-center justify-center group-hover:bg-[#FF4500] transition-colors duration-500">
                <span className="material-symbols-outlined text-[32px] text-[var(--color-foreground)] group-hover:text-white">gpp_bad</span>
              </div>
              <h3 className="font-display font-bold text-3xl text-[var(--color-foreground)] tracking-tight">Vulnerability Audits</h3>
              <p className="font-serif text-lg text-[var(--color-muted-foreground)] leading-relaxed">
                Automatically scan for exposed API keys, missing environment variables, and deprecated dependencies before you deploy to production.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col gap-6 group">
              <div className="w-16 h-16 rounded-full bg-[var(--color-border)] flex items-center justify-center group-hover:bg-[var(--color-accent)] transition-colors duration-500">
                <span className="material-symbols-outlined text-[32px] text-[var(--color-foreground)] group-hover:text-black">forum</span>
              </div>
              <h3 className="font-display font-bold text-3xl text-[var(--color-foreground)] tracking-tight">Contextual AI Chat</h3>
              <p className="font-serif text-lg text-[var(--color-muted-foreground)] leading-relaxed">
                Stop blindly copy-pasting code. Chat directly with an AI that inherently understands your entire tech stack, architecture, and pipeline.
              </p>
            </div>

          </div>
        </div>
      <div className="absolute top-0 right-0 w-full h-[500px] pointer-events-none opacity-[0.03] select-none z-0" 
           style={{ background: 'radial-gradient(circle at top right, var(--color-foreground) 0%, transparent 70%)' }}>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-16 py-12 lg:py-0 z-10 w-full max-w-[1600px] mx-auto mt-8 lg:mt-0">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24 w-full">
          
          <div className="w-full lg:w-1/2 flex flex-col items-start text-left">
            <div className="flex items-center gap-4 mb-6">
              <span className="w-8 lg:w-12 h-1 bg-[var(--color-accent)] block" />
              <span className="font-mono text-[10px] lg:text-sm font-semibold text-[var(--color-accent)] uppercase tracking-[0.2em]">
                System Analytics
              </span>
            </div>
            
            <h2 className="font-display font-bold text-5xl lg:text-7xl text-[var(--color-foreground)] tracking-tighter leading-[0.9] mb-6">
              Understand<br />Any <span className="text-[var(--color-accent)]">Codebase.</span>
            </h2>
            
            <p className="font-serif text-lg lg:text-xl text-[var(--color-muted-foreground)] mb-8 lg:mb-12">
              Clarity Systems removes the friction of onboarding onto massive new codebases. Just plug in a URL and let our backend do the heavy lifting.
            </p>
            
            <div className="flex flex-col gap-6 lg:gap-8">
              <div className="flex items-start gap-4 lg:gap-6">
                <div className="font-mono text-xl lg:text-2xl font-bold text-[var(--color-accent)]">01.</div>
                <div>
                  <h4 className="font-bold text-lg lg:text-xl text-[var(--color-foreground)] mb-1 lg:mb-2">Ingest</h4>
                  <p className="font-mono text-xs lg:text-sm text-[var(--color-muted-foreground)]">We securely clone the repository into our isolated container environment.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 lg:gap-6">
                <div className="font-mono text-xl lg:text-2xl font-bold text-[var(--color-accent)]">02.</div>
                <div>
                  <h4 className="font-bold text-lg lg:text-xl text-[var(--color-foreground)] mb-1 lg:mb-2">Process</h4>
                  <p className="font-mono text-xs lg:text-sm text-[var(--color-muted-foreground)]">Abstract Syntax Trees are generated, secrets are audited, and the framework is detected.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 lg:gap-6">
                <div className="font-mono text-xl lg:text-2xl font-bold text-[var(--color-accent)]">03.</div>
                <div>
                  <h4 className="font-bold text-lg lg:text-xl text-[var(--color-foreground)] mb-1 lg:mb-2">Visualize</h4>
                  <p className="font-mono text-xs lg:text-sm text-[var(--color-muted-foreground)]">The LLM clusters the raw data into an interactive, human-readable dashboard.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-1/2 bg-[var(--color-card)] border border-[var(--color-border)] p-0 relative overflow-hidden flex flex-col h-[320px] lg:h-[420px] mt-8 lg:mt-0">
            {/* Mockup Title Bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[#0A0A0B] shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-600"></div>
              <span className="font-mono text-xs text-[var(--color-muted-foreground)] ml-4">Clarity — Architecture Map</span>
            </div>
            
            {/* Mockup Body */}
            <div className="flex flex-1 relative">
              {/* Fake Sidebar */}
              <div className="w-12 border-r border-[var(--color-border)] flex flex-col items-center gap-5 py-6 bg-[#0A0A0B]">
                <div className="w-5 h-5 bg-[var(--color-accent)] rounded-sm opacity-80"></div>
                <div className="w-5 h-1.5 bg-[var(--color-border)] rounded-sm"></div>
                <div className="w-5 h-1.5 bg-[var(--color-border)] rounded-sm"></div>
                <div className="w-5 h-1.5 bg-[var(--color-border)] rounded-sm"></div>
              </div>

              {/* Fake Canvas */}
              <div className="flex-1 p-6 relative overflow-hidden" style={{background: 'radial-gradient(ellipse at center, #111 0%, #050505 100%)'}}>
                {/* Node: Frontend */}
                <div className="absolute top-8 left-12 bg-[var(--color-card)] border border-[var(--color-accent)] px-4 py-2.5 text-left" style={{minWidth:'130px'}}>
                  <div className="font-mono text-[9px] text-[var(--color-accent)] uppercase tracking-widest mb-1">frontend</div>
                  <div className="font-bold text-xs text-[var(--color-foreground)]">React / Vite</div>
                  <div className="mt-1.5 text-[9px] font-mono text-green-500">● SAFE</div>
                </div>

                {/* Node: API */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-card)] border border-[var(--color-border)] px-4 py-2.5 text-left" style={{minWidth:'130px'}}>
                  <div className="font-mono text-[9px] text-[var(--color-muted-foreground)] uppercase tracking-widest mb-1">api gateway</div>
                  <div className="font-bold text-xs text-[var(--color-foreground)]">FastAPI</div>
                  <div className="mt-1.5 text-[9px] font-mono text-yellow-500">● REVIEW</div>
                </div>

                {/* Node: Database */}
                <div className="absolute bottom-10 right-8 bg-[var(--color-card)] border border-[var(--color-border)] px-4 py-2.5 text-left" style={{minWidth:'130px'}}>
                  <div className="font-mono text-[9px] text-[var(--color-muted-foreground)] uppercase tracking-widest mb-1">database</div>
                  <div className="font-bold text-xs text-[var(--color-foreground)]">SQLite / ORM</div>
                  <div className="mt-1.5 text-[9px] font-mono text-green-500">● SAFE</div>
                </div>

                {/* Node: Auth */}
                <div className="absolute bottom-10 left-12 bg-[var(--color-card)] border border-[var(--color-border)] px-4 py-2.5 text-left" style={{minWidth:'120px'}}>
                  <div className="font-mono text-[9px] text-[var(--color-muted-foreground)] uppercase tracking-widest mb-1">auth</div>
                  <div className="font-bold text-xs text-[var(--color-foreground)]">JWT / bcrypt</div>
                  <div className="mt-1.5 text-[9px] font-mono text-green-500">● SAFE</div>
                </div>

                {/* SVG Connector Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" xmlns="http://www.w3.org/2000/svg">
                  <line x1="180" y1="65" x2="50%" y2="50%" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="4 4"/>
                  <line x1="50%" y1="50%" x2="75%" y2="80%" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4"/>
                  <line x1="50%" y1="50%" x2="25%" y2="80%" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4"/>
                </svg>

                {/* Scan label */}
                <div className="absolute bottom-3 right-4 font-mono text-[9px] text-[var(--color-muted-foreground)] uppercase tracking-widest opacity-60">
                  Architecture Map · 4 nodes
                </div>
              </div>
            </div>
          </div>

          
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--color-border)] flex flex-col sm:flex-row justify-between w-full items-center p-8 lg:px-16 text-xs font-mono font-semibold text-[var(--color-muted-foreground)] uppercase tracking-[0.2em] z-20 shrink-0 gap-6">
        <div>© 2026 Clarity Systems</div>
        <div className="flex flex-wrap gap-8 justify-center">
        </div>
      </footer>
    </div>
  );
};
