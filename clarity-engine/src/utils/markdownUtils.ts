export const cleanMarkdown = (text: string): string => {
  if (!text) return text;

  // 1. Strip any <think>...</think> tags or unclosed <think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim();

  // 2. Fix single-line tables by replacing "| |" with "|\n|"
  cleaned = cleaned.replace(/\|\s+\|/g, '|\n|');

  // 3. Ensure a blank line before any table headers to satisfy remark-gfm
  cleaned = cleaned.replace(/([^\n])\n(\s*\|.*\|\s*\n\s*\|[-:]+)/g, '$1\n\n$2');

  const lines = cleaned.split('\n');
  const outputLines: string[] = [];
  let inCodeBlock = false;
  let inTable = false;

  const isTableDelimiter = (l: string): boolean => {
    const trimmed = l.trim();
    return /^\|(?:\s*:?-{2,}:?\s*\|)+\s*$/.test(trimmed);
  };

  const isAsciiDiagramLine = (l: string): boolean => {
    const trimmed = l.trim();
    return /\+[-=]{3,}\+|[-=]{3,}\+|<-+>|--+>|<--+|\+[-=]{3,}/.test(trimmed);
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track fenced code blocks (never modify content inside code blocks)
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      outputLines.push(line);
      i++;
      continue;
    }

    if (inCodeBlock) {
      outputLines.push(line);
      i++;
      continue;
    }

    // Check if this starts a TRUE Markdown Table (must have a delimiter row next)
    if (!inTable && trimmed.startsWith('|') && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
      inTable = true;
      outputLines.push(line);
      outputLines.push(lines[i + 1]);
      i += 2;
      continue;
    }

    if (inTable) {
      if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('```') || isAsciiDiagramLine(line)) {
        inTable = false;
        outputLines.push(line);
      } else if (trimmed.startsWith('|') && (trimmed.match(/\|/g) || []).length >= 2) {
        outputLines.push(line);
      } else {
        // Multi-line continuation cell inside a table
        if (outputLines.length > 0) {
          const lastIdx = outputLines.length - 1;
          let lastLine = outputLines[lastIdx];
          if (lastLine.trimEnd().endsWith('|')) {
            const lastPipe = lastLine.lastIndexOf('|');
            lastLine = lastLine.substring(0, lastPipe).trimEnd() + '<br />' + trimmed + ' |';
          } else {
            lastLine = lastLine + '<br />' + trimmed + ' |';
          }
          outputLines[lastIdx] = lastLine;
        } else {
          outputLines.push(line);
        }
      }
      i++;
      continue;
    }

    // Check for un-fenced ASCII diagrams and wrap them in code blocks
    if (isAsciiDiagramLine(line)) {
      const asciiBlock: string[] = [line];
      let j = i + 1;
      while (
        j < lines.length &&
        (isAsciiDiagramLine(lines[j]) ||
          lines[j].trim().startsWith('|') ||
          lines[j].trim().startsWith('+') ||
          lines[j].includes('<-') ||
          lines[j].includes('->') ||
          lines[j].trim().startsWith('(') ||
          lines[j].trim() === '')
      ) {
        if (lines[j].trim() === '') {
          if (
            j + 1 < lines.length &&
            (isAsciiDiagramLine(lines[j + 1]) ||
              lines[j + 1].trim().startsWith('|') ||
              lines[j + 1].trim().startsWith('+'))
          ) {
            asciiBlock.push(lines[j]);
            j++;
            continue;
          } else {
            break;
          }
        }
        asciiBlock.push(lines[j]);
        j++;
      }

      if (asciiBlock.length >= 2) {
        outputLines.push('```text');
        outputLines.push(...asciiBlock);
        outputLines.push('```');
        i = j;
        continue;
      }
    }

    outputLines.push(line);
    i++;
  }

  return outputLines.join('\n');
};



