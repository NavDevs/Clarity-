export const cleanMarkdown = (text: string): string => {
  if (!text) return text;
  
  // 1. Fix single-line tables by replacing "| |" with "|\n|"
  // The AI sometimes outputs rows separated by spaces instead of newlines.
  let cleaned = text.replace(/\|\s+\|/g, '|\n|');
  
  // 2. Ensure a blank line before any table headers to satisfy remark-gfm
  // A table header row looks like "| Goal |", followed by "|---|---|"
  // If it is immediately preceded by text (no blank line), insert one.
  cleaned = cleaned.replace(/([^\n])\n(\s*\|.*\|\s*\n\s*\|[-:]+)/g, '$1\n\n$2');
  
  return cleaned;
};
