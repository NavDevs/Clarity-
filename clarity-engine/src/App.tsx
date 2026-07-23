import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import dagre from 'dagre';
import { ViewMode, ArchitectureNode, SecurityFinding, ChatMessage, RepositoryScan } from './types';
import { initialScan, initialChatMessages } from './data/initialData';

// Strip /tmp/clarity_repo_xxx/ prefixes from backend paths
const cleanNodePath = (p: string) => p
  .replace(/^\/tmp\/clarity_repo_[^/]+\//, '')
  .replace(/^clarity_repo_[^/]+\//, '')
  .replace(/^\/+/, '');

import { TopNavBar } from './components/TopNavBar';
import { SideNavBar } from './components/SideNavBar';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LandingView } from './components/LandingView';
import { AuthView } from './components/AuthView';
import { HomeDashboardView } from './components/HomeDashboardView';
import { ArchitectureMapView } from './components/ArchitectureMapView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { TechStackView } from './components/TechStackView';
import { AiChatView } from './components/AiChatView';

import { NewScanModal } from './components/NewScanModal';
import { DocsModal } from './components/DocsModal';
import { PricingModal } from './components/PricingModal';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    const hash = window.location.hash.replace('#/', '');
    return (hash as ViewMode) || 'landing';
  });
  // Tracks which view to return to after closing Settings
  const [previousView, setPreviousView] = useState<ViewMode>('map');

  React.useEffect(() => {
    if (window.location.hash !== `#/${currentView}`) {
      window.location.hash = `/${currentView}`;
    }
  }, [currentView]);

  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash && hash !== currentView) {
        setCurrentView(hash as ViewMode);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);

  const [username, setUsername] = useState<string>(() => localStorage.getItem('clarity_username') || '');
  const [authProvider, setAuthProvider] = useState<string>(() => localStorage.getItem('authProvider') || 'local');
  const [activeScan, setActiveScan] = useState<RepositoryScan>(() => {
    try {
      const saved = localStorage.getItem('clarity_active_scan');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialScan;
  });
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(() => {
    try {
      const saved = localStorage.getItem('clarity_active_scan');
      if (saved) {
        const scan = JSON.parse(saved);
        return scan.nodes?.[0] || null;
      }
    } catch {}
    return initialScan.nodes[0];
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('clarity_chat_messages');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialChatMessages;
  });

  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('clarity_token') || '');

  // Auto-route based on auth
  React.useEffect(() => {
    const storedToken = localStorage.getItem('clarity_token');
    const storedUser = localStorage.getItem('clarity_username');
    if (storedToken && storedUser && currentView === 'landing') {
      setToken(storedToken);
      setUsername(storedUser);
      setAuthProvider(localStorage.getItem('authProvider') || 'local');
      setCurrentView('home');
    }
  }, [token, currentView]);

  const handleLogin = (newToken: string, newUsername: string, provider: string = 'local') => {
    setToken(newToken);
    setUsername(newUsername);
    setAuthProvider(provider);
    localStorage.setItem('clarity_token', newToken);
    localStorage.setItem('clarity_username', newUsername);
    localStorage.setItem('authProvider', provider);
    setCurrentView('home');
  };

  const handleLogout = () => {
    setToken('');
    setUsername('');
    localStorage.removeItem('clarity_token');
    localStorage.removeItem('clarity_username');
    localStorage.removeItem('clarity_active_scan');
    localStorage.removeItem('clarity_chat_messages');
    setActiveScan(initialScan);
    setSelectedNode(initialScan.nodes[0]);
    setChatMessages(initialChatMessages);
    setCurrentView('landing');
  };

  // Modal controls
  const [newScanOpen, setNewScanOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  // Statuses
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const [vigilantMode, setVigilantMode] = useState(() => {
    return localStorage.getItem('clarity_vigilant_mode') !== 'false';
  });
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Persist chat messages whenever they change
  React.useEffect(() => {
    try {
      localStorage.setItem('clarity_chat_messages', JSON.stringify(chatMessages));
    } catch {}
  }, [chatMessages]);

  // Restore lastContext from localStorage on load
  React.useEffect(() => {
    try {
      const ctx = localStorage.getItem('clarity_last_context');
      if (ctx) (window as any).lastContext = JSON.parse(ctx);
    } catch {}
  }, []);

  // Handle repository analysis trigger
  const handleAnalyzeRepo = async (repoUrl: string) => {
    setIsAnalyzing(true);
    setNewScanOpen(false);

    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ repo_url: repoUrl })
      });

      if (!response.ok) throw new Error("Failed to analyze");
      const data = await response.json();
      
      // Save context for chat
      (window as any).lastContext = data.explain.context;
      try { localStorage.setItem('clarity_last_context', JSON.stringify(data.explain.context)); } catch {}

      const urlParts = repoUrl.split('/');
      const newRepoName = urlParts.length >= 2 ? `${urlParts[urlParts.length-2]}/${urlParts[urlParts.length-1]}` : repoUrl;
      const owner = urlParts.length >= 2 ? urlParts[urlParts.length-2] : 'org';

      // Initialize Dagre graph for auto-layout
      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 180, marginx: 40, marginy: 40 }); // Left to right
      g.setDefaultEdgeLabel(() => ({}));

      const rawNodes = data.explain.diagram?.nodes || [];
      const rawEdges = data.explain.diagram?.edges || [];

      // Add nodes to graph
      rawNodes.forEach((n: any, i: number) => {
        g.setNode(n.id || `node-${i}`, { width: 192, height: 120 }); // Based on w-48
      });

      // Add edges to graph
      rawEdges.forEach((e: any) => {
        g.setEdge(e.source, e.target);
      });

      // Calculate layout
      dagre.layout(g);

      const reactNodes = rawNodes.map((n: any, i: number) => {
        const nodeId = n.id || `node-${i}`;
        const dagreNode = g.node(nodeId);
        const cleanPath = cleanNodePath(n.filename || '');
        return {
          id: nodeId,
          name: n.label || n.filename || n.id,
          path: cleanPath,
          type: n.category === 'infra' ? 'database' : (n.category === 'folder' ? 'folder' : 'file'),
          status: 'SAFE',
          description: n.category || 'Module',
          x: dagreNode ? dagreNode.x - 96 : 0,
          y: dagreNode ? dagreNode.y - 60 : 0,
          codeSnippet: `// ${cleanPath}`,
          dependencies: n.dependencies || []
        };
      });

      const reactFindings = [];
      if (data.audit.secrets) {
        data.audit.secrets.forEach((s: any, i: number) => reactFindings.push({
          id: `sec-${i}`, title: 'Hardcoded Secret', description: `Secret found at line ${s.line}.\n\nContext: A hardcoded secret (such as an API key, password, or token) was found directly in your source code.\n\nImpact: If this code is committed to version control, anyone with access to the repository can extract and use this secret to impersonate your application. This can lead to severe data breaches, unauthorized access, or significant financial loss if connected to billed third-party services.`, severity: 'CRITICAL', path: s.file, fixed: false
        }));
      }
      if (data.audit.missing_env_vars) {
        data.audit.missing_env_vars.forEach((v: string, i: number) => reactFindings.push({
          id: `env-${i}`, title: 'Missing Env Var', description: `${v} is missing from your .env file.\n\nContext: Your application's source code references this environment variable, but it is completely undefined in your local environment configuration.\n\nImpact: The application will likely crash on startup, fail to connect to necessary external databases/services, or behave unpredictably at runtime.`, severity: 'WARNING', path: '.env', fixed: false
        }));
      }
      if (data.audit.env_status === 'NO_EXAMPLE') {
        reactFindings.push({ id: 'no-env', title: 'No .env.example', description: 'Could not find a .env.example or .env.template file in the repository root.\n\nContext: This file provides a safe, skeleton version of your required environment variables without actually exposing any real secrets.\n\nImpact: Without this template file, onboarding new developers becomes extremely difficult because they will not know which environment variables are required to successfully run the project locally.', severity: 'WARNING', path: '', fixed: false });
      }

      const reactStack = [];
      let stackIdx = 0;
      for (const [cat, items] of Object.entries(data.explain.stack)) {
        if (Array.isArray(items)) {
          items.forEach((item: string) => {
            reactStack.push({
              id: `ts-${stackIdx++}`,
              name: item,
              category: cat.charAt(0).toUpperCase() + cat.slice(1),
              color: '#3B82F6',
              version: 'latest',
              status: 'Up to Date',
              description: `Detected in ${cat}`
            });
          });
        }
      }

      const updatedScan: RepositoryScan = {
        scanId: data.scan_id,
        repoUrl,
        repoName: newRepoName,
        owner,
        scannedAt: 'Just now',
        status: 'completed',
        aiSummary: data.explain.summary || 'Analysis complete.',
        nodes: reactNodes.length ? reactNodes : initialScan.nodes,
        edges: data.explain.diagram?.edges || [],
        findings: reactFindings.length ? reactFindings : initialScan.findings,
        techStack: reactStack.length ? reactStack : initialScan.techStack
      };

      setActiveScan(updatedScan);
      setSelectedNode(updatedScan.nodes[0] || null);
      setChatMessages(initialChatMessages);
      // Persist scan so it survives page reloads
      localStorage.setItem('clarity_active_scan', JSON.stringify(updatedScan));
      localStorage.setItem('clarity_chat_messages', JSON.stringify(initialChatMessages));
      // Increment so HomeDashboardView re-fetches history next time
      setHistoryRefreshKey(prev => prev + 1);
      setCurrentView('map');
    } catch (err) {
      console.error('Failed to parse repo:', err);
      setCurrentView('map');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle AI Chat user messages
  const handleSendMessage = async (messageText: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: 'Just now'
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsGeneratingChat(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: messageText,
          context: (window as any).lastContext || {},
          history: chatMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
          scan_id: activeScan.scanId
        })
      });

      if (!response.ok) throw new Error("Failed to chat");
      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.answer || 'No response',
        timestamp: 'Just now'
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const fallbackAiMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `Error connecting to AI.`,
        timestamp: 'Just now'
      };
      setChatMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setIsGeneratingChat(false);
    }
  };

  // Handle fixing security findings
  const handleFixFinding = (findingId: string) => {
    setActiveScan((prev) => ({
      ...prev,
      findings: prev.findings.map((f) => f.id === findingId ? { ...f, fixed: true, severity: 'SAFE' } : f)
    }));
  };

  // Handle Architecture Search
  const handleSearchQuery = (query: string) => {
    const lowerQuery = query.toLowerCase();
    const match = activeScan.nodes.find(n => 
      n.name.toLowerCase().includes(lowerQuery) || 
      n.path.toLowerCase().includes(lowerQuery)
    );
    if (match) {
      setSelectedNode(match);
      if (currentView !== 'map') {
        setCurrentView('map');
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-sans overflow-hidden bg-noise">
      {/* Top Navigation */}
      {currentView !== 'landing' && currentView !== 'auth' && currentView !== 'home' && (
        <TopNavBar
          currentView={currentView}
          onNavigate={(v) => {
            if (v === 'docs') setDocsOpen(true);
            else if (v === 'pricing') setPricingOpen(true);
            else setCurrentView(v);
          }}
          onOpenNewScan={() => setNewScanOpen(true)}
          onOpenDocs={() => setDocsOpen(true)}
          onOpenPricing={() => setPricingOpen(true)}
          activeRepoName={activeScan.repoName}
          onSearchQuery={handleSearchQuery}
        />
      )}

      {/* Main Body Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative pb-16 lg:pb-0">
        {/* Persistent Side Navigation */}
        {currentView !== 'landing' && currentView !== 'auth' && currentView !== 'home' && currentView !== 'settings' && (
          <SideNavBar
            currentView={currentView}
            onNavigate={(v) => {
              if (v === 'settings') {
                setPreviousView(currentView); // remember where we are
                setSettingsOpen(true);
              }
              else if (v === 'docs') setDocsOpen(true);
              else setCurrentView(v as ViewMode);
            }}
            onOpenNewScan={() => setNewScanOpen(true)}
            vigilantMode={vigilantMode}
            username={username}
            onLogout={handleLogout}
          />
        )}

        {/* View Switcher */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[var(--color-background)]">
          <AnimatePresence mode="wait" initial={false}>
            {currentView === 'landing' && (
              <motion.div key="landing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col relative overflow-hidden">
                <LandingView
                  onNavigate={setCurrentView}
                />
              </motion.div>
            )}

            {currentView === 'auth' && (
              <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 w-full h-full relative">
                {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
                    <AuthView onLogin={handleLogin} onNavigate={setCurrentView} />
                  </GoogleOAuthProvider>
                ) : (
                  <AuthView onLogin={handleLogin} onNavigate={setCurrentView} />
                )}
              </motion.div>
            )}

            {currentView === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col relative overflow-hidden">
                <HomeDashboardView
                  token={token}
                  username={username}
                  onAnalyzeRepo={handleAnalyzeRepo}
                  isAnalyzing={isAnalyzing}
                  onLogout={handleLogout}
                  onNavigate={(v) => {
                    if (v === 'settings') {
                      setPreviousView('home');
                    }
                    setCurrentView(v);
                  }}
                  historyRefreshKey={historyRefreshKey}
                  onLoadHistory={(scan) => {
                    // Transform raw API response (same shape as handleAnalyzeRepo output)
                    const data = scan.scan_data;
                    const repoUrl = scan.repo_url;
                    const urlParts = repoUrl.split('/');
                    const newRepoName = scan.repo_name || repoUrl;
                    const owner = urlParts.length >= 2 ? urlParts[urlParts.length - 2] : 'org';

                    // Rebuild dagre layout
                    const g = new dagre.graphlib.Graph();
                    g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 180, marginx: 40, marginy: 40 });
                    g.setDefaultEdgeLabel(() => ({}));
                    const rawNodes = data.explain?.diagram?.nodes || [];
                    const rawEdges = data.explain?.diagram?.edges || [];
                    rawNodes.forEach((n: any, i: number) => g.setNode(n.id || `node-${i}`, { width: 192, height: 120 }));
                    rawEdges.forEach((e: any) => g.setEdge(e.source, e.target));
                    dagre.layout(g);

                      const reactNodes = rawNodes.map((n: any, i: number) => {
                        const nodeId = n.id || `node-${i}`;
                        const dagreNode = g.node(nodeId);
                        const cleanPath = cleanNodePath(n.filename || '');
                        return {
                          id: nodeId,
                          name: n.label || n.filename || n.id,
                          path: cleanPath,
                          type: n.category === 'infra' ? 'database' : (n.category === 'folder' ? 'folder' : 'file'),
                          status: 'SAFE',
                          description: n.category || 'Module',
                          x: dagreNode ? dagreNode.x - 96 : 0,
                          y: dagreNode ? dagreNode.y - 60 : 0,
                          codeSnippet: `// ${cleanPath}`,
                          dependencies: n.dependencies || []
                        };
                      });

                    const reactFindings: any[] = [];
                    data.audit?.secrets?.forEach((s: any, i: number) => reactFindings.push({ id: `sec-${i}`, title: 'Hardcoded Secret', description: `Secret at line ${s.line}.`, severity: 'CRITICAL', path: s.file, fixed: false }));
                    data.audit?.missing_env_vars?.forEach((v: string, i: number) => reactFindings.push({ id: `env-${i}`, title: 'Missing Env Var', description: `${v} is missing.`, severity: 'WARNING', path: '.env', fixed: false }));

                    const reactStack: any[] = [];
                    let idx = 0;
                    for (const [cat, items] of Object.entries(data.explain?.stack || {})) {
                      if (Array.isArray(items)) items.forEach((item: string) => reactStack.push({ id: `ts-${idx++}`, name: item, category: cat.charAt(0).toUpperCase() + cat.slice(1), color: '#3B82F6', version: 'latest', status: 'Up to Date', description: `Detected in ${cat}` }));
                    }

                    const restoredScan: RepositoryScan = {
                      scanId: scan.id,
                      repoUrl,
                      repoName: newRepoName,
                      owner,
                      scannedAt: new Date(scan.created_at).toLocaleDateString(),
                      status: 'completed',
                      aiSummary: data.explain?.summary || 'Analysis complete.',
                      nodes: reactNodes.length ? reactNodes : initialScan.nodes,
                      edges: rawEdges,
                      findings: reactFindings.length ? reactFindings : [],
                      techStack: reactStack.length ? reactStack : []
                    };

                    if (data.explain?.context) {
                      (window as any).lastContext = data.explain.context;
                      try { localStorage.setItem('clarity_last_context', JSON.stringify(data.explain.context)); } catch {}
                    }

                    setActiveScan(restoredScan);
                    setSelectedNode(restoredScan.nodes[0] || null);
                    // Persist so reload keeps the scan
                    try { localStorage.setItem('clarity_active_scan', JSON.stringify(restoredScan)); } catch {}
                    
                    if (data.chat_history && Array.isArray(data.chat_history)) {
                      const msgs = data.chat_history.map((msg: any, i: number) => ({
                        id: `hist-${i}`,
                        sender: msg.role === 'user' ? 'user' : 'ai',
                        text: msg.content,
                        timestamp: 'Previous Chat'
                      }));
                      setChatMessages(msgs);
                    } else {
                      setChatMessages(initialChatMessages);
                    }
                    
                    setCurrentView('map');
                  }}
                />
              </motion.div>
            )}

            {currentView === 'map' && (
              <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col relative overflow-hidden">
                <ArchitectureMapView
                  nodes={activeScan.nodes}
                  edges={activeScan.edges}
                  onSelectNode={setSelectedNode}
                  selectedNode={selectedNode}
                  aiSummary={activeScan.aiSummary}
                  detectedStack={activeScan.techStack.map((t) => t.name)}
                  onNavigate={setCurrentView}
                  repoFullName={activeScan.repoName}
                />
              </motion.div>
            )}

            {currentView === 'audit' && (
              <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col relative overflow-hidden">
                <SecurityAuditView
                  findings={activeScan.findings}
                  onFixFinding={handleFixFinding}
                  onTriggerAudit={() => setNewScanOpen(true)}
                />
              </motion.div>
            )}

            {currentView === 'techstack' && (
              <motion.div key="techstack" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col relative overflow-hidden">
                <TechStackView
                  stackItems={activeScan.techStack}
                />
              </motion.div>
            )}

            {currentView === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col relative overflow-hidden">
                <AiChatView
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  activeContextNode={selectedNode}
                  isGenerating={isGeneratingChat}
                  onClose={() => setCurrentView('map')}
                />
              </motion.div>
            )}

            {currentView === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col relative overflow-hidden">
                <SettingsView
                  token={token}
                  username={username}
                  authProvider={authProvider}
                  onLogout={handleLogout}
                  vigilantMode={vigilantMode}
                  onToggleVigilantMode={() => setVigilantMode(!vigilantMode)}
                  onBack={() => setCurrentView(previousView)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <NewScanModal
        isOpen={newScanOpen}
        onClose={() => setNewScanOpen(false)}
        onStartScan={handleAnalyzeRepo}
        isScanning={isAnalyzing}
      />

      <DocsModal
        isOpen={docsOpen}
        onClose={() => setDocsOpen(false)}
      />

      <PricingModal
        isOpen={pricingOpen}
        onClose={() => setPricingOpen(false)}
      />
    </div>
  );
}
