/**
 * Escapes source-derived text so it stays plain text when passed through
 * Markdown renderers. Local documentation treats comments/titles/descriptions
 * as evidence, never as trusted Markdown or HTML.
 */
export function escapeMarkdownPlainText(value: string): string {
  return String(value)
    .replace(/[\r\n]+/g, " ")
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\\/g, "\\\\")
    .replace(/([`*_{}\[\]()#+\-.!>])/g, "\\$1");
}

export function escapeMarkdownTableText(value: string): string {
  return escapeMarkdownPlainText(value).replace(/\|/g, "\\|");
}


/**
 * Neutralizes raw HTML starts outside fenced and inline code.
 *
 * Escaping every "<" outside code is intentionally conservative: Markdown
 * links remain available through normal [label](url) syntax, while raw HTML,
 * multiline tag starts, comments, and autolink-style angle brackets cannot
 * become executable DOM. Inline/fenced code is left untouched so code examples
 * still render correctly through the Markdown parser.
 */
export function escapeRawHtmlOutsideMarkdownCode(markdown: string): string {
  let inFence = false;
  let fenceChar = "";
  let fenceLength = 0;

  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const fenceMatch = line.match(/^\s*(\`{3,}|~{3,})/);
      if (fenceMatch) {
        const run = fenceMatch[1];
        const marker = run[0];
        if (!inFence) {
          inFence = true;
          fenceChar = marker;
          fenceLength = run.length;
        } else if (
          marker === fenceChar &&
          run.length >= fenceLength
        ) {
          inFence = false;
          fenceChar = "";
          fenceLength = 0;
        }
        return line;
      }

      if (inFence) {
        return line;
      }

      return escapeRawHtmlOutsideInlineCode(line);
    })
    .join("\n");
}

function escapeRawHtmlOutsideInlineCode(line: string): string {
  let output = "";
  let index = 0;

  while (index < line.length) {
    if (line[index] !== "`") {
      output += line[index] === "<" ? "&lt;" : line[index];
      index++;
      continue;
    }

    let runLength = 1;
    while (
      index + runLength < line.length &&
      line[index + runLength] === "`"
    ) {
      runLength++;
    }

    const delimiter = "`".repeat(runLength);
    const close = line.indexOf(delimiter, index + runLength);
    if (close < 0) {
      output += delimiter;
      index += runLength;
      continue;
    }

    output += line.slice(index, close + runLength);
    index = close + runLength;
  }

  return output;
}
