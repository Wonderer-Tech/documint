export interface LocalMakeTarget {
  name: string;
}

export interface LocalDockerfileFacts {
  baseImages: string[];
  stages: string[];
  exposedPorts: string[];
  entrypoint?: string;
  command?: string;
}

export function parseMakefileTargets(
  content: string | undefined,
): LocalMakeTarget[] {
  if (!content) {
    return [];
  }

  const targets = new Set<string>();
  const lines = collapseMakeContinuations(content);

  for (const rawLine of lines) {
    if (!rawLine || /^\s/.test(rawLine)) {
      continue;
    }

    const line = rawLine.replace(/\s+#.*$/, "").trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    // Exclude variable assignments/directives before interpreting ':' as a rule.
    if (/^[A-Za-z0-9_.-]+\s*(?::=|\?=|\+=|!=|=)/.test(line)) {
      continue;
    }

    const colon = line.indexOf(":");
    if (colon <= 0) {
      continue;
    }

    const left = line.slice(0, colon).trim();
    if (!left || left.startsWith(".") || left.includes("%") || left.includes("$")) {
      continue;
    }

    for (const candidate of left.split(/\s+/)) {
      if (/^[A-Za-z0-9_][A-Za-z0-9_.\/-]*$/.test(candidate)) {
        targets.add(candidate);
      }
    }
  }

  return Array.from(targets)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name }));
}

export function parseDockerfileFacts(
  content: string | undefined,
): LocalDockerfileFacts | undefined {
  if (!content) {
    return undefined;
  }

  const baseImages = new Set<string>();
  const stages = new Set<string>();
  const exposedPorts = new Set<string>();
  let entrypoint: string | undefined;
  let command: string | undefined;

  for (const rawLine of collapseDockerContinuations(content)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const from = line.match(
      /^FROM\s+(?:--platform=\S+\s+)?(\S+)(?:\s+AS\s+(\S+))?/i,
    );
    if (from) {
      baseImages.add(from[1]);
      if (from[2]) {
        stages.add(from[2]);
      }
      continue;
    }

    const expose = line.match(/^EXPOSE\s+(.+)$/i);
    if (expose) {
      for (const value of expose[1].trim().split(/\s+/)) {
        if (value) {
          exposedPorts.add(value);
        }
      }
      continue;
    }

    const entry = line.match(/^ENTRYPOINT\s+(.+)$/i);
    if (entry) {
      entrypoint = entry[1].trim();
      continue;
    }

    const cmd = line.match(/^CMD\s+(.+)$/i);
    if (cmd) {
      command = cmd[1].trim();
    }
  }

  if (
    baseImages.size === 0 &&
    stages.size === 0 &&
    exposedPorts.size === 0 &&
    !entrypoint &&
    !command
  ) {
    return undefined;
  }

  return {
    baseImages: Array.from(baseImages),
    stages: Array.from(stages),
    exposedPorts: Array.from(exposedPorts),
    entrypoint,
    command,
  };
}

function collapseMakeContinuations(content: string): string[] {
  const result: string[] = [];
  let buffer = "";

  for (const line of content.split(/\r?\n/)) {
    const continued = /\\\s*$/.test(line);
    const piece = line.replace(/\\\s*$/, "");
    buffer += (buffer ? " " : "") + piece;
    if (!continued) {
      result.push(buffer);
      buffer = "";
    }
  }

  if (buffer) {
    result.push(buffer);
  }
  return result;
}

function collapseDockerContinuations(content: string): string[] {
  return collapseMakeContinuations(content);
}
