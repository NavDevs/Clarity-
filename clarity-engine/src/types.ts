export type ViewMode = 
  | 'landing' 
  | 'auth'
  | 'home'
  | 'map' 
  | 'audit' 
  | 'techstack' 
  | 'chat' 
  | 'settings' 
  | 'docs' 
  | 'pricing';

export type NodeStatus = 'SAFE' | 'REVIEW' | 'CRITICAL' | 'WARNING';

export interface ArchitectureNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder' | 'database' | 'service';
  status: NodeStatus;
  size?: string;
  fileCount?: number;
  description: string;
  x: number;
  y: number;
  color?: string;
  codeSnippet?: string;
  incoming?: string[];
  outgoing?: string[];
  dependencies?: string[];
}

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'SAFE';
  path: string;
  lineNumbers?: string;
  codeSnippet: string;
  fixActionLabel?: string;
  fixed?: boolean;
}

export interface TechStackItem {
  id: string;
  name: string;
  category: 'Frontend' | 'Backend' | 'Database' | 'DevOps' | 'Utility';
  color: string;
  version: string;
  status: 'Up to Date' | 'Update Available' | 'Vulnerable';
  description: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  codeSnippet?: string;
  timestamp: string;
  contextTag?: string;
  suggestedPrompts?: string[];
}

export interface ArchitectureEdge {
  source: string;
  target: string;
}

export interface RepositoryScan {
  scanId?: number;
  repoUrl: string;
  repoName: string;
  owner: string;
  scannedAt: string;
  status: 'scanning' | 'completed' | 'failed';
  aiSummary: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  findings: SecurityFinding[];
  techStack: TechStackItem[];
}
