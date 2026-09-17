interface MarkdownSection {
  heading?: string;
  body: string;
}

/**
 * Merges documentation generated for large-file chunks without naively
 * concatenating repeated Markdown sections. Top-level (##) and nested (###)
 * sections are merged in first-seen order, while exact repeated prose/code
 * blocks are removed. Headings inside fenced code blocks are ignored.
 */
export function mergeChunkDocumentation(chunks: string[]): string {
  const normalizedChunks = chunks
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (normalizedChunks.length === 0) {
    return "";
  }
  if (normalizedChunks.length === 1) {
    return normalizedChunks[0];
  }

  const sections = new Map<string, MarkdownSection>();
  const order: string[] = [];

  for (const chunk of normalizedChunks) {
    for (const section of splitByHeadingLevel(chunk, 2)) {
      const key = section.heading
        ? `heading:${normalizeHeading(section.heading)}`
        : "__preamble__";
      const existing = sections.get(key);
      if (!existing) {
        sections.set(key, { ...section });
        order.push(key);
        continue;
      }

      existing.body = section.heading
        ? mergeNestedSections(existing.body, section.body)
        : mergeMarkdownBlocks(existing.body, section.body);
    }
  }

  return order
    .map((key) => {
      const section = sections.get(key)!;
      return section.heading
        ? `${section.heading}\n${section.body}`.trim()
        : section.body.trim();
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function mergeNestedSections(left: string, right: string): string {
  const combined = new Map<string, MarkdownSection>();
  const order: string[] = [];

  for (const section of [
    ...splitByHeadingLevel(left, 3),
    ...splitByHeadingLevel(right, 3),
  ]) {
    const key = section.heading
      ? `heading:${normalizeHeading(section.heading)}`
      : "__preamble__";
    const existing = combined.get(key);
    if (!existing) {
      combined.set(key, { ...section });
      order.push(key);
      continue;
    }
    existing.body = mergeMarkdownBlocks(existing.body, section.body);
  }

  return order
    .map((key) => {
      const section = combined.get(key)!;
      return section.heading
        ? `${section.heading}\n${section.body}`.trim()
        : section.body.trim();
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function splitByHeadingLevel(markdown: string, level: 2 | 3): MarkdownSection[] {
  const lines = markdown.split(/\r?\n/);
  const prefix = "#".repeat(level) + " ";
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection = { body: "" };
  let bodyLines: string[] = [];
  let inFence = false;
  let fenceMarker = "";

  const flush = () => {
    current.body = bodyLines.join("\n").trim();
    if (current.heading || current.body) {
      sections.push(current);
    }
    current = { body: "" };
    bodyLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trimStart();
    const fence = trimmed.match(/^(```+|~~~+)/)?.[1];
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[0];
      } else if (fence[0] === fenceMarker) {
        inFence = false;
        fenceMarker = "";
      }
      bodyLines.push(line);
      continue;
    }

    if (!inFence && line.startsWith(prefix) && !line.startsWith(prefix + "#")) {
      flush();
      current.heading = line.trimEnd();
      continue;
    }

    bodyLines.push(line);
  }

  flush();
  return sections;
}

function mergeMarkdownBlocks(left: string, right: string): string {
  const blocks = [...splitMarkdownBlocks(left), ...splitMarkdownBlocks(right)];
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const block of blocks) {
    const key = normalizeBlock(block);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(block.trim());
  }

  return unique.join("\n\n").trim();
}

function splitMarkdownBlocks(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;
  let fenceMarker = "";

  const flush = () => {
    const block = current.join("\n").trim();
    if (block) {
      blocks.push(block);
    }
    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trimStart();
    const fence = trimmed.match(/^(```+|~~~+)/)?.[1];
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[0];
      } else if (fence[0] === fenceMarker) {
        inFence = false;
        fenceMarker = "";
      }
      current.push(line);
      continue;
    }

    if (!inFence && line.trim() === "") {
      flush();
      continue;
    }
    current.push(line);
  }

  flush();
  return blocks;
}

function normalizeHeading(heading: string): string {
  return heading.replace(/^#+\s*/, "").trim().toLowerCase();
}

function normalizeBlock(block: string): string {
  return block.replace(/\r/g, "").trim().replace(/[ \t]+$/gm, "");
}
