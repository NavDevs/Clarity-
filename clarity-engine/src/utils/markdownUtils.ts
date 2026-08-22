export const cleanMarkdown = (text: string): string => {
  if (!text) return text;
  
  // 1. Strip any <think>...</think> tags or unclosed <think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim();
  
  // 2. Fix single-line tables by replacing "| |" with "|\n|"
  cleaned = cleaned.replace(/\|\s+\|/g, '|\n|');
  
  // 3. Ensure a blank line before any table headers to satisfy remark-gfm
  cleaned = cleaned.replace(/([^\n])\n(\s*\|.*\|\s*\n\s*\|[-:]+)/g, '$1\n\n$2');
  
  // 4. Normalize broken multi-line table rows
  // If an AI outputs multi-line bullets inside a table row without <br>, GFM treats each line as a new row.
  // We merge continuation lines back into the previous row cell using <br />.
  const lines = cleaned.split('\n');
  const normalizedLines: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.includes('|', 1)) {
      inTable = true;
      normalizedLines.push(line);
    } else if (inTable) {
      if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('```')) {
        inTable = false;
        normalizedLines.push(line);
      } else if (normalizedLines.length > 0) {
        // Continuation line inside a table row cell
        const lastIdx = normalizedLines.length - 1;
        let lastLine = normalizedLines[lastIdx];
        
        if (lastLine.trimEnd().endsWith('|')) {
          const lastPipe = lastLine.lastIndexOf('|');
          lastLine = lastLine.substring(0, lastPipe).trimEnd() + '<br />' + trimmed + ' |';
        } else {
          lastLine = lastLine + '<br />' + trimmed + ' |';
        }
        normalizedLines[lastIdx] = lastLine;
      } else {
        normalizedLines.push(line);
      }
    } else {
      normalizedLines.push(line);
    }
  }

  return normalizedLines.join('\n');
};


