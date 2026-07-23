import { ArchitectureNode, SecurityFinding, TechStackItem, ChatMessage, RepositoryScan } from '../types';

export const initialNodes: ArchitectureNode[] = [];

export const initialFindings: SecurityFinding[] = [];

export const initialTechStack: TechStackItem[] = [];

export const initialChatMessages: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'ai',
    text: 'Welcome to Clarity AI. Scan a repository to begin analyzing its architecture and security.',
    timestamp: 'Just now'
  }
];

export const initialScan: RepositoryScan = {
  repoUrl: '',
  repoName: 'No Repository Loaded',
  owner: '',
  scannedAt: '',
  status: 'idle',
  aiSummary: 'Enter a GitHub URL on the left to begin analyzing.',
  nodes: initialNodes,
  findings: initialFindings,
  techStack: initialTechStack
};
