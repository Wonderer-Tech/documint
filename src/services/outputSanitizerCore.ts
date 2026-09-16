const UNSAFE_WORKFLOW_HEADINGS = [
  "Visual Blueprint: Code Workflow",
  "Editable Code Workflow Diagram",
  "D2 Code Workflow Source",
];

export function sanitizeMarkdown(markdown: string): string {
  let cleaned = markdown;

  for (const heading of UNSAFE_WORKFLOW_HEADINGS) {
    cleaned = removeMarkdownSection(cleaned, heading);
  }

  return cleaned.replace(/\n{4,}/g, "\n\n\n");
}

function removeMarkdownSection(markdown: string, heading: string): string {
  const escaped = escapeRegExp(heading);
  const pattern = new RegExp(
    `(?:^|\\n)### ${escaped}\\n[\\s\\S]*?(?=\\n### |\\n## |\\n# |$)`,
    "g",
  );
  return markdown.replace(pattern, "");
}

export function sanitizeHtml(html: string): string {
  let cleaned = html;

  for (const heading of UNSAFE_WORKFLOW_HEADINGS) {
    const escaped = escapeRegExp(heading);
    const pattern = new RegExp(
      `<h3([^>]*)>${escaped}(?:<a[^>]*class="anchor"[^>]*>.*?<\\/a>)?<\\/h3>[\\s\\S]*?(?=<h[1-3]\\b|<footer\\b|$)`,
      "gi",
    );
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
