import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { WorkspaceFile } from "../types";
import {
  buildWorkspaceExcludePatterns,
  buildExplicitFolderExcludePatterns,
  getLanguageFromPath,
  isInsideWorkspace,
} from "../scanner/scannerPolicy";

export interface DiskScanOptions {
  /** Relative or absolute paths within the workspace. Exact files bypass normal extension-level exclusions. */
  targets?: string[];
  maxFiles?: number;
  maxBytes?: number;
}

/**
 * Secure, VS Code-free file discovery. Uses the extension's language mapping and
 * default exclusion policy; never traverses symlinks or hidden generated folders.
 * Unlike the VS Code API, this runner cannot inherit VS Code's workspace.findFiles
 * or project-specific exclude settings, so resulting inventories may differ.
 */
export async function scanWorkspaceOnDisk(
  workspaceRoot: string,
  options: DiskScanOptions = {},
): Promise<WorkspaceFile[]> {
  const root = path.resolve(workspaceRoot);
  const stat = await fs.lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("--root must be a real directory, not a symlink");
  }

  const maxFiles = validateBudget(options.maxFiles, 50000, "maxFiles");
  const maxBytes = validateBudget(options.maxBytes, 256 * 1024 * 1024, "maxBytes");
  const isExplicit = Boolean(options.targets?.length);
  const exclusions = isExplicit
    ? buildExplicitFolderExcludePatterns()
    : buildWorkspaceExcludePatterns();
  const dirExclusions = new Set(exclusions
    .filter(p => p.startsWith("**/") && p.endsWith("/**"))
    .map(p => p.slice(3, -3).toLowerCase()));
  const nameExclusions = exclusions.filter(p => p.startsWith("**/") && !p.endsWith("/**"))
    .map(p => p.slice(3));
  const discovered = new Map<string, WorkspaceFile>();
  let totalBytes = 0;

  async function visit(absolute: string, exactFile: boolean): Promise<void> {
    const entry = await fs.lstat(absolute);
    // Symbolic links are deliberately skipped even when explicitly selected.
    if (entry.isSymbolicLink()) return;
    const relative = path.relative(root, absolute).replace(/\\/g, "/");
    if (!isInsideWorkspace(root, absolute)) {
      throw new Error(`Target escapes workspace: ${absolute}`);
    }
    if (entry.isDirectory()) {
      if (relative && path.basename(absolute).startsWith(".") && !exactFile) {
        // VS Code default discovery may read some hidden folders, but these
        // frequently contain local configuration or credentials.
        return;
      }
      if (!exactFile && dirExclusions.has(path.basename(absolute).toLowerCase())) return;
      const childNames = (await fs.readdir(absolute)).sort();
      for (const name of childNames) {
        await visit(path.join(absolute, name), false);
      }
      return;
    }
    if (!entry.isFile()) return;
    const language = getLanguageFromPath(relative);
    if (!language || discovered.has(relative)) return;
    if (!exactFile) {
      if (path.basename(absolute).startsWith(".")) return;
      if (nameExclusions.some(pattern => matchScannerFilePattern(path.basename(absolute), pattern))) return;
    }
    if (discovered.size >= maxFiles) {
      throw new Error(`File count limit (${maxFiles}) exceeded; refusing incomplete documentation`);
    }
    if (totalBytes + entry.size > maxBytes) {
      throw new Error(`Source byte limit (${maxBytes}) exceeded; refusing incomplete documentation`);
    }
    // Recheck against symlink substitution between lstat and read where possible.
    const handle = await fs.open(absolute, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    try {
      const actualStat = await handle.stat();
      if (!actualStat.isFile()) return;
      if (totalBytes + actualStat.size > maxBytes) {
        throw new Error(`Source byte limit (${maxBytes}) exceeded; refusing incomplete documentation`);
      }
      const content = await handle.readFile({ encoding: "utf8" });
      totalBytes += Buffer.byteLength(content, "utf8");
      discovered.set(relative, { path: relative, language, content });
    } finally {
      await handle.close();
    }
  }

  if (isExplicit) {
    for (const supplied of options.targets!) {
      const absolute = path.resolve(root, supplied);
      if (!isInsideWorkspace(root, absolute)) {
        throw new Error(`Target escapes workspace: ${supplied}`);
      }
      const selectedStat = await fs.lstat(absolute);
      await visit(absolute, selectedStat.isFile());
    }
  } else {
    await visit(root, false);
  }
  return [...discovered.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function validateBudget(given: number | undefined, defaultValue: number, name: string): number {
  const value = given ?? defaultValue;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return value;
}

function matchScannerFilePattern(name: string, pattern: string): boolean {
  // VS Code scanner's default file glob patterns, matched against basename.
  if (pattern === "*.min.*") return /\.min\./i.test(name);
  if (pattern === "*.test.*") return /\.test\./i.test(name);
  if (pattern === "*.spec.*") return /\.spec\./i.test(name);
  if (pattern === "*.d.ts") return name.toLowerCase().endsWith(".d.ts");
  if (pattern === ".env*") return name.toLowerCase().startsWith(".env");
  if (pattern === "*.log") return name.toLowerCase().endsWith(".log");
  return name.toLowerCase() === pattern.toLowerCase();
}
