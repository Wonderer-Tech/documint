import * as vscode from "vscode";
import { DocumentationContext, DocumentationResult } from "../types";
import { SecretStorageManager } from "../config/secretStorage";
import { mergeChunkDocumentation } from "./chunkDocumentationMerge";
import {
  CONTEXT_WINDOW_TOO_SMALL_FOR_PROMPT_ERROR,
  requirePositiveChunkTokenBudget,
} from "./chunkTokenBudget";
import { ProviderRequestStartScheduler } from "./providerRequestStartScheduler";

export interface AIProvider {
  name: string;
  isLocal: boolean;
  generateDocumentation(
    context: DocumentationContext,
  ): Promise<DocumentationResult>;
  validateConnection(): Promise<boolean>;
  getTokenCount(text: string): number;
  getMaxContextWindow(model?: string): number;
}

export interface ApiCallParams {
  model: string;
  apiKey: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
  signal?: AbortSignal;
}

export interface RawMarkdownPromptParams {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  rateLimitDelay?: number;
  cancellationToken?: vscode.CancellationToken;
}

/**
 * Abstract base class providing shared prompt-building, chunking,
 * and generation orchestration for all providers.
 * Each concrete provider only needs to implement callApi() and getMaxContextWindow().
 */
export abstract class BaseAIProvider implements AIProvider {
  public abstract name: string;
  public abstract isLocal: boolean;

  protected secretManager: SecretStorageManager;
  private readonly requestStartScheduler = new ProviderRequestStartScheduler();

  constructor(protected context: vscode.ExtensionContext) {
    this.secretManager = SecretStorageManager.getInstance(context);
  }

  public abstract getMaxContextWindow(model?: string): number;

  /**
   * Maximum tokens the provider will return in a single response.
   * This is NOT the same as the context window — it is the output cap enforced
   * by the provider's API. Override per provider to avoid 400 errors.
   */
  protected getMaxOutputTokens(_model?: string): number {
    return 8192; // Safe default across all providers
  }

  /**
   * Provider-specific API call. Receives OpenAI-style messages array.
   * Implementations translate to their own wire format.
   */
  protected abstract callApi(
    params: ApiCallParams,
  ): Promise<DocumentationResult>;

  // ── Public interface ──────────────────────────────────────────────────────

  public async generateDocumentation(
    context: DocumentationContext,
  ): Promise<DocumentationResult> {
    const cfg = vscode.workspace.getConfiguration("aiDocGenerator");
    // Priority: context.model (sidebar) → VS Code setting → provider default
    const model =
      context.model || cfg.get<string>("model") || this.defaultModel();
    const apiKey = this.isLocal ? "" : await this.getApiKey();
    return this.generateWithMessages(context, model, apiKey);
  }

  public async validateConnection(): Promise<boolean> {
    try {
      if (this.isLocal) return true;
      const key = await this.secretManager.getApiKey(this.name);
      return !!key;
    } catch {
      return false;
    }
  }

  public async generateMarkdownFromPrompt(
    params: RawMarkdownPromptParams,
  ): Promise<DocumentationResult> {
    const cfg = vscode.workspace.getConfiguration("aiDocGenerator");
    const model = params.model || cfg.get<string>("model") || this.defaultModel();
    const apiKey = this.isLocal ? "" : await this.getApiKey();
    const maxCtx = this.getMaxContextWindow(model);
    const inputTokens =
      this.getTokenCount(params.systemPrompt) +
      this.getTokenCount(params.userPrompt);
    const maxTokens = Math.min(
      this.getMaxOutputTokens(model),
      Math.max(1024, maxCtx - inputTokens - 500),
    );

    if (params.cancellationToken?.isCancellationRequested) {
      throw new Error("Generation cancelled");
    }

    const abortController = params.cancellationToken
      ? new AbortController()
      : undefined;
    const cancellationSubscription =
      params.cancellationToken?.onCancellationRequested(() => {
        abortController?.abort();
      });

    try {
      await this.waitForRateLimitSlot({
        code: "",
        language: "markdown",
        filePath: "__raw_prompt__",
        depth: "standard",
        rateLimitDelay: params.rateLimitDelay,
        cancellationToken: params.cancellationToken,
      });
      return await this.callApi({
        model,
        apiKey,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        maxTokens,
        signal: abortController?.signal,
      });
    } finally {
      cancellationSubscription?.dispose();
    }
  }

  /** Approximation: ~4 chars per token (suitable for English + code). */
  public getTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // ── Protected helpers ─────────────────────────────────────────────────────

  protected defaultModel(): string {
    return "gpt-5.4-nano";
  }

  protected get temperature(): number {
    return (
      vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<number>("temperature") ?? 0.2
    );
  }

  protected async getApiKey(): Promise<string> {
    const key = await this.secretManager.getApiKey(this.name);
    if (!key) {
      throw new Error(
        `No API key configured for "${this.name}". ` +
          `Use the "Configure API Key" command to set one.`,
      );
    }
    return key;
  }

  private getSystemPrompt(): string {
    return (
      `You are a Principal Documentation Engineer whose work sets the standard across ` +
      `a 10,000-engineer organization. Your docs are the single source of truth — ` +
      `used by onboarding engineers, on-call SREs, security reviewers, and API consumers.\n\n` +
      `Standards you follow:\n` +
      `- Google developer documentation style guide\n` +
      `- Amazon's "working backwards" clarity principle\n` +
      `- Stripe's API reference precision and completeness\n` +
      `- Microsoft's Docs contributor guide for code examples\n` +
      `- Netflix/Google SRE runbook standards for operational sections\n\n` +
      `CRITICAL — Symbol accuracy rules (violation makes docs worse than nothing):\n` +
      `- Use ONLY real function names, class names, method names, constants, and types ` +
      `that actually appear in the provided source code\n` +
      `- NEVER invent placeholder names like "functionName", "ClassName", "myMethod", ` +
      `"doSomething", "handleEvent", "processData", or "MyClass"\n` +
      `- Every code example must import/instantiate/call real exported symbols from the code\n` +
      `- Every table row describing a symbol must reference a symbol that exists in the code\n` +
      `- If a section requires symbols you cannot find, write "No [X] detected in this module"\n\n` +
      `HALLUCINATION PREVENTION — Focus on code only:\n` +
      `- Base ALL documentation solely on the provided source code. Do not infer functionality ` +
      `beyond what is explicitly present in the code.\n` +
      `- If information is not present in the code, explicitly state "Cannot determine from code" ` +
      `or "Not specified in source" rather than guessing.\n` +
      `- Avoid speculative explanations about intent, future use, or external systems unless ` +
      `explicitly referenced in the code.\n` +
      `- Documentation should be factual and derived directly from the code, not from general knowledge.\n\n` +
      `Non-negotiable rules:\n` +
      `- Every table must be complete — no placeholder rows\n` +
      `- Every code example must compile/run as written using real symbols\n` +
      `- State unknowns explicitly rather than guessing\n` +
      `- Lead with WHAT, follow with HOW, explain WHY\n` +
      `- Output only valid Markdown — no preamble, no meta-commentary\n` +
      `- Use fenced code blocks with language tags\n` +
      `- Mermaid diagrams must use valid Mermaid v10 syntax with real class/component names`
    );
  }

  private getOutputRules(): string {
    return (
      `\nNon-negotiable output rules:\n` +
      `- Output ONLY the Markdown documentation — zero preamble, zero meta-commentary\n` +
      `- Use ONLY real symbol names that exist in the provided source code\n` +
      `- Every table must have real data rows — placeholder text like "Description" or "your value" is a hard failure\n` +
      `- Every code example must compile/run as written with real imported symbols\n` +
      `- If a section genuinely does not apply, write one sentence saying so (e.g., "No environment variables used.")\n` +
      `- Mermaid diagrams must use valid Mermaid v10 syntax with real class/state names\n` +
      `- Never invent symbol names (functionName, ClassName, myMethod, doSomething) — use what is in the code\n` +
      `- State explicitly when information cannot be determined from the code alone\n` +
      `- Avoid hallucination: if something is not in the code, say "Cannot determine from code" rather than guessing`
    );
  }

  private getSimplePrompt(filePath: string, lang: string): string {
    return (
      `Explain this ${lang} file in plain English with no jargon. ` +
      `Keep it short, factual, and based only on the source code. ` +
      `Include only these sections:\n\n` +
      `## What This Does\n` +
      `2-3 sentences explaining the purpose of this file.\n\n` +
      `## Key Things It Can Do\n` +
      `A short bullet list (max 5 items) of the main actions or features, in plain words.\n\n` +
      `## What Goes In / What Comes Out\n` +
      `Briefly describe the inputs this code needs and what it produces or does as a result.\n\n` +
      `File: \`${filePath}\``
    );
  }

  private getBasicPrompt(filePath: string, lang: string): string {
    return (
      `Generate concise reference documentation using ONLY real symbol names from the code. ` +
      `Do not add prerequisite, stability, failure-mode, or antipattern sections in basic mode. ` +
      `Include only these sections:\n\n` +
      `## Module Metadata\n` +
      `| Property | Value |\n` +
      `|----------|-------|\n` +
      `| File | \`${filePath}\` |\n` +
      `| Language | ${lang} |\n` +
      `| Exports | Exact names of every exported symbol in this file |\n\n` +
      `## Overview\n` +
      `One paragraph: what this module does, its single responsibility, and where it fits ` +
      `in the broader system.\n\n` +
      `## API Reference\n` +
      `For EVERY exported function, class, interface, and type found in the code, ` +
      `use the EXACT symbol name as it appears in the source:\n\n` +
      `### \`actualExportedName(param: ActualType): ActualReturnType\`\n` +
      `One-line description of what it does.\n` +
      `| Parameter | Type | Required | Description |\n` +
      `|-----------|------|----------|-------------|\n` +
      `| actualParamName | \`ActualType\` | Yes/No | What it represents |\n` +
      `**Returns:** \`ActualType\` - what the value means.\n` +
      `**Throws:** Include only errors explicitly thrown in the source.\n\n` +
      `## Quick Start\n` +
      `Include only if this file has exported symbols that can be used directly. ` +
      `Use real exported symbols only.\n\n` +
      `## See Also\n` +
      `- Related modules inferred from imports\n` +
      `- Relevant external references if detectable from code`
    );
  }

  private getStandardPrompt(filePath: string, lang: string): string {
    return (
      `Generate complete professional documentation using ONLY real symbol names from the code. ` +
      `Keep it factual and source-grounded. Include required sections, then include optional ` +
      `sections only when there is clear source evidence.\n\n` +
      `## Module Metadata\n` +
      `| Property | Value |\n` +
      `|----------|-------|\n` +
      `| File | \`${filePath}\` |\n` +
      `| Language | ${lang} |\n` +
      `| Exports | Exact names of every exported symbol in this file |\n` +
      `| Key Dependencies | Direct imports and the purpose of each |\n\n` +
      `## Overview\n` +
      `2-3 sentences: purpose, single responsibility, and role in the larger system.\n\n` +
      `## API Reference\n` +
      `For EVERY exported function, class, interface, and type, use EXACT names from the code:\n\n` +
      `### \`actualExportedName(param: ActualType, optional?: ActualType): ActualReturnType\`\n` +
      `What it does (not how).\n` +
      `| Parameter | Type | Required | Default | Description |\n` +
      `|-----------|------|----------|---------|-------------|\n` +
      `| actualParamName | \`ActualType\` | Yes | - | What it represents |\n` +
      `| optionalParam | \`ActualType\` | No | \`value\` | What it controls |\n` +
      `**Returns:** \`ActualType\` - exact description including null/undefined cases.\n` +
      `**Throws:** Include only errors explicitly thrown in the source.\n` +
      `**Side Effects:** All mutations, I/O, events, or state changes.\n\n` +
      `## Dependencies\n` +
      `All imports, their purpose, and version constraints if visible.\n\n` +
      `## Usage Examples\n\n` +
      `### Basic Usage\n` +
      `\`\`\`${lang}\n// Real-world example using actual exported symbols\n\`\`\`\n\n` +
      `### With Error Handling\n` +
      `\`\`\`${lang}\n// Same example with proper error handling and cleanup\n\`\`\`\n\n` +
      `After Usage Examples and before See Also, add compact sections only when source evidence exists: Configuration, Environment Variables, ` +
      `Errors and Recovery, Security Notes, Concurrency, Resource Lifecycle, Observability, or Testing Notes. ` +
      `Do not include empty or speculative sections.\n\n` +
      `## See Also\n` +
      `- Related modules inferred from imports and usage\n` +
      `- External docs or specifications referenced in code`
    );
  }

  private getComprehensivePrompt(filePath: string, lang: string): string {
    return (
      `Generate detailed enterprise documentation using ONLY real symbol names and facts from the code. ` +
      `Do not add project-level sections such as ADRs, incident response, capacity planning, ` +
      `rollback plans, FAQs, SLOs, alerting rules, compliance claims, or version history for a single file. ` +
      `Include required sections, then include optional sections only when clear source evidence exists.\n\n` +
      `## Module Metadata\n` +
      `| Property | Value |\n` +
      `|----------|-------|\n` +
      `| File | \`${filePath}\` |\n` +
      `| Language | ${lang} |\n` +
      `| Exports | Exact names of every exported symbol in this file |\n` +
      `| Key Dependencies | Direct imports and purpose of each |\n` +
      `| Complexity Drivers | Specific code features that make this file simple or complex |\n\n` +
      `## Overview\n` +
      `2-4 sentences: module purpose, single responsibility, place in system architecture, ` +
      `and the core problem it solves. Lead with a verb.\n\n` +
      `## Architecture & Design\n\n` +
      `**Design Patterns:** Include only patterns directly visible in the code.\n\n` +
      `**Module Boundaries:**\n` +
      `- What this module owns and controls\n` +
      `- What it explicitly does not do when this is clear from the code\n` +
      `- How it interacts with adjacent modules\n\n` +
      `## API Reference\n` +
      `Document EVERY exported symbol exhaustively using EXACT names from the code:\n\n` +
      `### \`actualExportedName(param1: ActualType, param2?: ActualType): ActualReturnType\`\n` +
      `Full behavioral description - what it does, not how.\n\n` +
      `| Parameter | Type | Required | Default | Constraints | Description |\n` +
      `|-----------|------|----------|---------|-------------|-------------|\n` +
      `| actualParam1 | \`ActualType\` | Yes | - | Must satisfy X | What it represents |\n` +
      `| actualParam2 | \`ActualType\` | No | \`null\` | Non-empty if set | What it controls |\n\n` +
      `**Returns:** \`ActualType\` - exact meaning, including all possible values and null cases.\n\n` +
      `**Throws:**\n` +
      `| Error | Condition | HTTP Status | Recovery |\n` +
      `|-------|-----------|-------------|----------|\n` +
      `| \`ActualErrorType\` | [exact condition] | [code if applicable] | [recovery action] |\n\n` +
      `**Side Effects:** ALL mutations, I/O, emitted events, external state changes.\n` +
      `**Time Complexity:** O(?) - explain only when inferable from loops, recursion, or data structures.\n` +
      `**Space Complexity:** O(?) - explain only when inferable from allocations or collection growth.\n` +
      `**Thread Safety:** Include only when the code has shared state, async coordination, or mutable singletons.\n\n` +
      `## Dependencies and Data Flow\n` +
      `Explain imports, internal calls, key data inputs, and returned or emitted outputs.\n\n` +
      `## Configuration and Environment\n` +
      `Include only when this file uses real configuration values, settings, environment variables, credentials, or endpoints.\n\n` +
      `## Errors and Recovery\n` +
      `Include only explicit thrown errors, caught errors, validation failures, API failures, or returned error states.\n\n` +
      `## Usage Examples\n\n` +
      `### Basic Usage\n` +
      `\`\`\`${lang}\n// Minimal real-world example using actual exported symbols\n\`\`\`\n\n` +
      `### Advanced Usage\n` +
      `\`\`\`${lang}\n// Complex scenario with full error handling and resource cleanup\n\`\`\`\n\n` +
      `### Integration Pattern\n` +
      `\`\`\`${lang}\n// How this module composes with adjacent modules (real imports and calls)\n\`\`\`\n\n` +
      `## Security Considerations\n` +
      `Discuss only visible input validation, auth checks, secret handling, file/network access, or injection risk. ` +
      `Do not make compliance claims.\n\n` +
      `## Known Limitations & Edge Cases\n` +
      `| Limitation | Impact | Affected Scenarios | Workaround |\n` +
      `|------------|--------|-------------------|------------|\n` +
      `| [description] | [severity] | [when it matters] | [mitigation] |\n\n` +
      `**TODO / FIXME / HACK inventory** (from code comments):\n` +
      `- List every TODO/FIXME/HACK comment with its location and implication\n\n` +
      `After Known Limitations and before See Also, add compact sections only when source evidence exists: State Machine, Concurrency, Resource Lifecycle, ` +
      `Observability, Testing Notes, or Performance Notes. Do not include empty or speculative sections.\n\n` +
      `## See Also\n` +
      `- **Related modules:** Inferred from imports and usage patterns\n` +
      `- **External references:** Specifications, RFCs, or docs referenced in comments\n` +
      `- **Upstream dependencies:** Key packages and their documentation links`
    );
  }

  /**
   * Core generation pipeline shared by all providers.
   * Builds the prompt, checks context window, chunks if needed, calls the API.
   */
  protected async generateWithMessages(
    context: DocumentationContext,
    model: string,
    apiKey: string,
  ): Promise<DocumentationResult> {
    if (context.cancellationToken?.isCancellationRequested) {
      throw new Error("Generation cancelled");
    }

    const abortController = context.cancellationToken
      ? new AbortController()
      : undefined;
    const cancellationSubscription =
      context.cancellationToken?.onCancellationRequested(() => {
        abortController?.abort();
      });

    try {
      const { system, user: promptTemplate } = this.buildPrompt(context);
      const maxCtx = this.getMaxContextWindow(model);
      const overhead =
        this.getTokenCount(system) +
        this.getTokenCount(promptTemplate.replace("{CODE}", "")) +
        500;
      const maxCodeTokens = maxCtx - overhead - 1024;
      if (maxCodeTokens <= 0) {
        throw new Error(CONTEXT_WINDOW_TOO_SMALL_FOR_PROMPT_ERROR);
      }

      if (this.getTokenCount(context.code) > maxCodeTokens) {
        return await this.generateChunked(
          context,
          model,
          apiKey,
          system,
          promptTemplate,
          maxCodeTokens,
          abortController?.signal,
        );
      }

      const userContent = promptTemplate.replace("{CODE}", context.code);
      const inputTokens =
        this.getTokenCount(system) + this.getTokenCount(userContent);
      const maxTokens = Math.min(
        this.getMaxOutputTokens(model),
        Math.max(1024, maxCtx - inputTokens - 500),
      );

      await this.waitForRateLimitSlot(context);
      return await this.callApi({
        model,
        apiKey,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        maxTokens,
        signal: abortController?.signal,
      });
    } catch (error) {
      if (context.cancellationToken?.isCancellationRequested) {
        throw new Error("Generation cancelled");
      }
      throw error;
    } finally {
      cancellationSubscription?.dispose();
    }
  }

  /** Splits large files into chunks and merges the AI output. */
  private async generateChunked(
    context: DocumentationContext,
    model: string,
    apiKey: string,
    system: string,
    promptTemplate: string,
    maxCodeTokens: number,
    signal?: AbortSignal,
  ): Promise<DocumentationResult> {
    const chunks = this.chunkCode(context.code, maxCodeTokens);
    const documentationParts: string[] = [];
    let totalTokens = 0;

    for (let i = 0; i < chunks.length; i++) {
      if (context.cancellationToken?.isCancellationRequested) {
        throw new Error("Generation cancelled");
      }

      const label = `Part ${i + 1} of ${chunks.length}`;
      const userContent =
        `[Large file — ${label}. Document only what is in this chunk. ` +
        `Parts will be merged.]\n\n${promptTemplate.replace("{CODE}", chunks[i])}`;
      const inputTokens =
        this.getTokenCount(system) + this.getTokenCount(userContent);
      const maxTokens = Math.min(
        this.getMaxOutputTokens(model),
        Math.max(1024, this.getMaxContextWindow(model) - inputTokens - 500),
      );

      await this.waitForRateLimitSlot(context);
      const result = await this.callApi({
        model,
        apiKey,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        maxTokens,
        signal,
      });
      documentationParts.push(result.documentation);
      totalTokens += result.tokensUsed;
    }

    return {
      documentation: mergeChunkDocumentation(documentationParts),
      tokensUsed: totalTokens,
      model,
    };
  }

  private async waitForRateLimitSlot(
    context: DocumentationContext,
  ): Promise<void> {
    const delayMs = this.resolveRateLimitDelay(context.rateLimitDelay);
    await this.requestStartScheduler.waitForSlot(
      delayMs,
      (waitMs) => this.waitForRateLimitDelay(waitMs, context.cancellationToken),
      () => !!context.cancellationToken?.isCancellationRequested,
    );
  }

  private async waitForRateLimitDelay(
    waitMs: number,
    cancellationToken?: vscode.CancellationToken,
  ): Promise<void> {
    if (waitMs <= 0) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let disposable: vscode.Disposable | undefined;
      const timeout = setTimeout(() => {
        disposable?.dispose();
        resolve();
      }, waitMs);

      disposable = cancellationToken?.onCancellationRequested(() => {
        clearTimeout(timeout);
        disposable?.dispose();
        reject(new Error("Generation cancelled"));
      });
    });
  }

  private resolveRateLimitDelay(overrideDelay?: number): number {
    const configured =
      overrideDelay ??
      vscode.workspace
        .getConfiguration("aiDocGenerator")
        .get<number>("rateLimitDelay") ??
      0;
    const parsed = Number(configured);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }

  /** Splits code at logical boundaries (function/class declarations, blank lines). */
  protected chunkCode(code: string, maxTokens: number): string[] {
    const safeMaxTokens = requirePositiveChunkTokenBudget(maxTokens);
    const chunks: string[] = [];
    const lines = code.split("\n");
    let current: string[] = [];
    let currentTokens = 0;

    const flush = () => {
      if (current.length > 0) {
        chunks.push(current.join("\n"));
        current = [];
        currentTokens = 0;
      }
    };

    for (const line of lines) {
      const lt = this.getTokenCount(line);

      if (lt > safeMaxTokens) {
        flush();
        let rem = line;
        while (rem.length > 0) {
          chunks.push(rem.substring(0, maxTokens * 4));
          rem = rem.substring(maxTokens * 4);
        }
        continue;
      }

      if (currentTokens + lt > safeMaxTokens) {
        let splitAt = -1;
        for (let i = current.length - 1; i >= 0; i--) {
          const p = current[i].trim();
          if (
            !p ||
            /^(function |class |const |let |var |export |async |import |def |public |private |protected )/.test(
              p,
            )
          ) {
            splitAt = i;
            break;
          }
        }
        if (splitAt > 0) {
          chunks.push(current.slice(0, splitAt).join("\n"));
          current = current.slice(splitAt);
          currentTokens = current.reduce(
            (s, l) => s + this.getTokenCount(l),
            0,
          );
        } else {
          flush();
        }
      }

      current.push(line);
      currentTokens += lt;
    }

    flush();
    return chunks.length > 0 ? chunks : [code];
  }

  /**
   * Builds documentation generation prompts for all depths. Shared by all providers.
   */
  protected buildPrompt(context: DocumentationContext): {
    system: string;
    user: string;
  } {
    const system = this.getSystemPrompt();
    const lang = context.language;
    const filePath = context.filePath;

    const isSimple = context.depth === "simple";
    let sections: string;
    if (isSimple) {
      sections = this.getSimplePrompt(filePath, lang);
    } else if (context.depth === "basic") {
      sections = this.getBasicPrompt(filePath, lang);
    } else if (context.depth === "standard") {
      sections = this.getStandardPrompt(filePath, lang);
    } else {
      sections = this.getComprehensivePrompt(filePath, lang);
    }

    const rules = isSimple ? "" : this.getOutputRules();
    const verifiedContext = context.existingContext
      ? `Verified source analysis (treat this as authoritative and prefer it over guesses):\n` +
        `\`\`\`text\n${context.existingContext}\n\`\`\`\n\n`
      : "";
    const user =
      verifiedContext +
      `File: \`${filePath}\`\n` +
      `Language: ${lang}\n\n` +
      `\`\`\`${lang}\n{CODE}\n\`\`\`\n\n` +
      `${sections}` +
      rules;

    return { system, user };
  }

  // Keep legacy chunkText for backwards compat
  protected chunkText(text: string, maxTokens: number): string[] {
    return this.chunkCode(text, maxTokens);
  }
}
