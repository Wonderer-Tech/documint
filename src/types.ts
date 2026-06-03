import * as vscode from "vscode";

/**
 * Represents the configuration for the documentation generator
 */
export interface DocGeneratorConfig {
  aiProvider:
    | "openai"
    | "anthropic"
    | "openrouter"
    | "deepseek"
    | "custom";
  model: string;
  documentationDepth: "simple" | "basic" | "standard" | "comprehensive";
  outputFormat: "markdown" | "html" | "both";
  targetLanguages: string[];
  maxTokens: number;
  temperature: number;
  rateLimitDelay: number;
  concurrentRequests: number;
  excludePatterns: string[];
  includePatterns: string[];
  generateUmlDiagrams?: boolean;
  enableDiffTracking?: boolean;
}

/**
 * Context provided to providers for generating documentation
 */
export interface DocumentationContext {
  code: string;
  language: string;
  filePath: string;
  depth: "simple" | "basic" | "standard" | "comprehensive";
  existingContext?: string;
  model?: string;
  /** User-specified context window override in tokens */
  contextWindow?: number;
  /** Delay between provider API request starts, in milliseconds. */
  rateLimitDelay?: number;
  cancellationToken?: vscode.CancellationToken;
}

/**
 * Represents the result of a documentation generation request
 */
export interface DocumentationResult {
  documentation: string;
  tokensUsed: number;
  model: string;
}

/**
 * Represents progress during documentation generation
 */
export interface GenerationProgress {
  phase:
    | "scanning"
    | "parsing"
    | "chunking"
    | "generating"
    | "formatting"
    | "writing"
    | "complete"
    | "error";
  currentFile: string;
  totalFiles: number;
  processedFiles: number;
  percentage: number;
  message: string;
}

/**
 * Represents a file in the workspace
 */
export interface WorkspaceFile {
  path: string;
  language: string;
  content: string;
}

/**
 * Represents a chunk of code for documentation generation
 */
export interface CodeChunk {
  filePath: string;
  language: string;
  content: string;
  startLine: number;
  endLine: number;
}

/**
 * Represents a documentation error
 */
export class DocumentationError extends Error {
  constructor(
    message: string,
    public type: "scan" | "parse" | "chunk" | "api" | "format" | "write",
    public filePath?: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "DocumentationError";
  }
}

/**
 * Represents a cancellation token for long-running operations
 */
export class CancellationToken {
  private _isCancellationRequested = false;
  private _listeners: Array<() => void> = [];

  get isCancellationRequested(): boolean {
    return this._isCancellationRequested;
  }

  cancel(): void {
    this._isCancellationRequested = true;
    this._listeners.forEach((listener) => listener());
  }

  onCancel(callback: () => void): void {
    this._listeners.push(callback);
  }
}
