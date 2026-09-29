import { normalizeProjectPath } from "./structuralModule";

export interface ReadmeFileDescription {
  text: string;
  source: "readme";
}

export interface LocalReadmeFacts {
  descriptionsByPath: Map<string, ReadmeFileDescription>;
}

/**
 * Extracts only path-linked descriptions that README text states explicitly.
 * It does not infer responsibilities from filenames.
 */
export function extractLocalReadmeFacts(
  readme: string | undefined,
  knownFilePaths: Iterable<string>,
): LocalReadmeFacts {
  const descriptionsByPath = new Map<string, ReadmeFileDescription>();
  if (!readme) {
    return { descriptionsByPath };
  }

  const known = new Set(
    Array.from(knownFilePaths, (value) => normalizeProjectPath(value)),
  );
  const lines = readme.split(/\r?\n/);

  collectExplicitPathDescriptions(lines, known, descriptionsByPath);
  collectTreeDescriptions(lines, known, descriptionsByPath);

  return { descriptionsByPath };
}

function collectExplicitPathDescriptions(
  lines: string[],
  known: Set<string>,
  output: Map<string, ReadmeFileDescription>,
): void {
  for (const line of lines) {
    for (const filePath of known) {
      if (!line.includes(filePath)) {
        continue;
      }

      const description = descriptionAfterPath(line, filePath);
      if (description) {
        output.set(filePath, { text: description, source: "readme" });
      }
    }
  }
}

function collectTreeDescriptions(
  lines: string[],
  known: Set<string>,
  output: Map<string, ReadmeFileDescription>,
): void {
  let inFence = false;
  let root: string | undefined;
  const directories: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trimEnd();

    if (/^\s*```/.test(trimmed)) {
      inFence = !inFence;
      if (!inFence) {
        root = undefined;
        directories.length = 0;
      }
      continue;
    }
    if (!inFence) {
      continue;
    }

    const rootMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/$/);
    if (rootMatch) {
      root = rootMatch[1];
      directories.length = 0;
      continue;
    }
    if (!root) {
      continue;
    }

    const match = rawLine.match(
      /^((?:(?:\|   |    ))*)(?:\|--|`--|├──|└──)\s+([^#]+?)(?:\s+#\s+(.+))?\s*$/,
    );
    if (!match) {
      continue;
    }

    const level = Math.floor(match[1].length / 4);
    const name = match[2].trim();
    const description = cleanDescription(match[3] ?? "");
    const parent =
      level === 0
        ? root
        : directories[level - 1] ?? root;
    const itemPath = normalizeProjectPath(`${parent}/${name.replace(/\/$/, "")}`);

    if (name.endsWith("/")) {
      directories[level] = itemPath;
      directories.length = level + 1;
      continue;
    }

    if (description && known.has(itemPath) && !output.has(itemPath)) {
      output.set(itemPath, { text: description, source: "readme" });
    }
  }
}

function descriptionAfterPath(line: string, filePath: string): string | undefined {
  const index = line.indexOf(filePath);
  if (index < 0) {
    return undefined;
  }

  const tail = line.slice(index + filePath.length);
  const match = tail.match(/^\s*(?:#|—|–|:|-)\s*(.+)$/);
  return match ? cleanDescription(match[1]) : undefined;
}

function cleanDescription(value: string): string | undefined {
  const text = String(value)
    .replace(/```/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 500) : undefined;
}
