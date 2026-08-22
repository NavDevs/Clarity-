export const cleanMarkdown = (text: string): string => {
  if (!text) return text;

  // 1. Strip <think>...</think> or unclosed <think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim();

  // 2. Ensure blank line before every markdown table (header row followed by delimiter)
  //    This lets remark-gfm detect the table correctly
  cleaned = cleaned.replace(/(^|\n)(\|[^\n]+\|[ \t]*\n\|[ \t]*[-:| ]+\|)/g, (_, before, table) => {
    // If before is empty or already has a blank line, don't add another
    return before === '\n' ? '\n\n' + table : before + '\n\n' + table;
  });

  const lines = cleaned.split('\n');
  const outputLines: string[] = [];
  let inCodeBlock = false;

  // Helper: is this line a GFM table delimiter? e.g. |---|---|
  const isTableDelimiter = (l: string): boolean =>
    /^\|(?:\s*:?-{2,}:?\s*\|)+\s*$/.test(l.trim());

  // Helper: is this line an ASCII diagram? (+---+, <--->, arrows etc.)
  const isAsciiDiagram = (l: string): boolean =>
    /\+[-=]{3,}|\+={3,}|<-{2,}>|-{2,}>|<-{2,}/.test(l);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track fenced code blocks — never modify content inside
    if (/^```/.test(trimmed)) {
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

    // Detect un-fenced ASCII diagram blocks and wrap in ```text ... ```
    if (isAsciiDiagram(line)) {
      const block: string[] = [line];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        // Continue collecting: ASCII lines, pipe-only lines, continuation text, blank separators
        if (
          isAsciiDiagram(next) ||
          /^\s*\|/.test(next) ||
          /^\s*\+/.test(next) ||
          next.includes('<-') ||
          next.includes('->')
        ) {
          block.push(next);
          j++;
        } else if (next.trim() === '') {
          // Peek: if what follows blank is still diagram content, include the blank
          const peek = lines[j + 1] ?? '';
          if (isAsciiDiagram(peek) || /^\s*\|/.test(peek) || /^\s*\+/.test(peek)) {
            block.push(next);
            j++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      if (block.length >= 2) {
        outputLines.push('```text');
        outputLines.push(...block);
        outputLines.push('```');
        i = j;
        continue;
      }
    }

    // Detect a GFM table: header row + delimiter on next line
    if (
      trimmed.startsWith('|') &&
      i + 1 < lines.length &&
      isTableDelimiter(lines[i + 1])
    ) {
      // Emit header
      const header = trimmed.endsWith('|') ? trimmed : trimmed + ' |';
      outputLines.push(header);

      // Emit delimiter — ensure it ends with |
      const delim = lines[i + 1].trim();
      outputLines.push(delim.endsWith('|') ? delim : delim + ' |');
      i += 2;

      // Emit table body rows
      while (i < lines.length) {
        const rowLine = lines[i];
        const rowTrimmed = rowLine.trim();

        // End table on blank line, heading, code fence
        if (rowTrimmed === '' || rowTrimmed.startsWith('#') || /^```/.test(rowTrimmed)) {
          outputLines.push(rowLine);
          i++;
          break;
        }

        if (isTableDelimiter(rowTrimmed)) {
          // Extra delimiter (shouldn't happen but handle it)
          outputLines.push(rowTrimmed.endsWith('|') ? rowTrimmed : rowTrimmed + ' |');
          i++;
          continue;
        }

        if (rowTrimmed.startsWith('|')) {
          // Normal row: ensure it ends with |
          outputLines.push(rowTrimmed.endsWith('|') ? rowTrimmed : rowTrimmed + ' |');
        } else {
          // Continuation text (line doesn't start with |) — merge into prev row's last cell
          if (outputLines.length > 0) {
            const lastIdx = outputLines.length - 1;
            const last = outputLines[lastIdx];
            if (last.trim().startsWith('|')) {
              const pipeIdx = last.lastIndexOf('|');
              outputLines[lastIdx] = last.substring(0, pipeIdx).trimEnd() + ' <br/>' + rowTrimmed + ' |';
            } else {
              outputLines.push(rowLine);
            }
          } else {
            outputLines.push(rowLine);
          }
        }
        i++;
      }
      continue;
    }

    outputLines.push(line);
    i++;
  }

  return outputLines.join('\n');
};
