export const cleanMarkdown = (text: string): string => {
  if (!text) return text;
  
  // 1. Strip any <think>...</think> tags or unclosed <think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim();
  
  // 2. Fix single-line tables by replacing "| |" with "|\n|"
  cleaned = cleaned.replace(/\|\s+\|/g, '|\n|');
  
  // 3. Ensure a blank line before any table headers to satisfy remark-gfm
  cleaned = cleaned.replace(/([^\n])\n(\s*\|.*\|\s*\n\s*\|[-:]+)/g, '$1\n\n$2');
  
  return cleaned;
};

