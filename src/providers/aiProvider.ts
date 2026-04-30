import * as vscode from "vscode";
import { DocumentationContext, DocumentationResult } from "../types";
import { SecretStorageManager } from "../config/secretStorage";

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
}

/**
 * Abstract base class providing shared prompt-building, chunking,
 * and generation orchestration for all AI providers.
 * Each concrete provider only needs to implement callApi() and getMaxContextWindow().
 */
export abstract class BaseAIProvider implements AIProvider {
  public abstract name: string;
  public abstract isLocal: boolean;

  protected secretManager: SecretStorageManager;

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

  /** Approximation: ~4 chars per token (suitable for English + code). */
  public getTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // ── Protected helpers ─────────────────────────────────────────────────────

  protected defaultModel(): string {
    return "gpt-4";
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
      `Explain this ${lang} file in plain English that anyone can understand — no jargon. ` +
      `Keep it short and simple. Include only these sections:\n\n` +
      `## What This Does\n` +
      `2–3 sentences. Explain the purpose of this file like you're talking to a non-programmer.\n\n` +
      `## What It's Used For\n` +
      `Give 2–3 real-world examples of when or why this code runs.\n\n` +
      `## Key Things It Can Do\n` +
      `A short bullet list (max 5 items) of the main actions or features, in plain words.\n\n` +
      `## What Goes In / What Comes Out\n` +
      `Briefly describe the inputs this code needs and what it produces or does as a result.\n\n` +
      `## Watch Out For\n` +
      `1–2 simple warnings a non-technical user should know (e.g. "needs an internet connection", ` +
      `"requires an API key"). Skip this section if nothing notable.\n\n` +
      `File: \`${filePath}\``
    );
  }

  private getBasicPrompt(filePath: string, lang: string): string {
    return (
      `Generate concise reference documentation using ONLY real symbol names from the code. ` +
      `Include ALL of these sections:\n\n` +
      `## Module Metadata\n` +
      `| Property | Value |\n` +
      `|----------|-------|\n` +
      `| File | \`${filePath}\` |\n` +
      `| Language | ${lang} |\n` +
      `| Stability | Stable / Beta / Experimental |\n` +
      `| Exports | Exact names of every exported symbol in this file |\n\n` +
      `## Overview\n` +
      `One paragraph: what this module does, its single responsibility, and where it fits ` +
      `in the broader system.\n\n` +
      `## Prerequisites\n` +
      `- Runtime / language version required\n` +
      `- Modules or services that must be initialized before this one\n` +
      `- Required permissions, credentials, or environment variables\n\n` +
      `## API Reference\n` +
      `For EVERY exported function, class, interface, and type found in the code — ` +
      `use the EXACT symbol name as it appears in the source:\n\n` +
      `### \`actualExportedName(param: ActualType): ActualReturnType\`\n` +
      `One-line description of what it does.\n` +
      `| Parameter | Type | Required | Description |\n` +
      `|-----------|------|----------|-------------|\n` +
      `| actualParamName | \`ActualType\` | Yes/No | What it represents |\n` +
      `**Returns:** \`ActualType\` — what the value means.\n` +
      `**Throws:** \`ActualErrorType\` — exact condition that triggers this.\n\n` +
      `## Common Failure Modes\n` +
      `List the 2–3 most likely ways this module breaks and what to check:\n` +
      `| Symptom | Likely Cause | First Check |\n` +
      `|---------|-------------|-------------|\n` +
      `| [observable symptom] | [root cause] | [what to inspect] |\n\n` +
      `## What NOT to Do\n` +
      `- List 2–3 common misuse patterns or antipatterns specific to this module\n` +
      `- Explain why each is dangerous or incorrect\n\n` +
      `## Quick Start\n` +
      `\`\`\`${lang}\n// Minimal working example using real exported symbols — copy-paste ready\n\`\`\`\n\n` +
      `## See Also\n` +
      `- Related modules inferred from imports\n` +
      `- Relevant external references if detectable from code`
    );
  }

  private getStandardPrompt(filePath: string, lang: string): string {
    return (
      `Generate complete professional documentation using ONLY real symbol names from the code. ` +
      `Include ALL of these sections:\n\n` +
      `## Module Metadata\n` +
      `| Property | Value |\n` +
      `|----------|-------|\n` +
      `| File | \`${filePath}\` |\n` +
      `| Language | ${lang} |\n` +
      `| Stability | Stable / Beta / Experimental |\n` +
      `| Exports | Exact names of every exported symbol in this file |\n` +
      `| Key Dependencies | Direct imports and the purpose of each |\n\n` +
      `## Overview\n` +
      `2–3 sentences: purpose, single responsibility, and role in the larger system.\n\n` +
      `## Prerequisites\n` +
      `- Runtime / language version required\n` +
      `- Modules that must be initialized first (initialization order matters)\n` +
      `- Required credentials, permissions, or environment setup\n` +
      `- Any required peer dependencies\n\n` +
      `## Architecture & Design\n` +
      `- **Pattern(s) used:** (e.g., Singleton, Factory, Strategy, Observer) and WHY\n` +
      `- **Key dependencies:** What it imports and the role of each\n` +
      `- **Responsibilities:** What this module owns\n` +
      `- **Non-responsibilities:** What this module explicitly does NOT do\n\n` +
      `## API Reference\n` +
      `For EVERY exported function, class, interface, and type — use EXACT names from the code:\n\n` +
      `### \`actualExportedName(param: ActualType, optional?: ActualType): ActualReturnType\`\n` +
      `What it does (not how).\n` +
      `| Parameter | Type | Required | Default | Description |\n` +
      `|-----------|------|----------|---------|-------------|\n` +
      `| actualParamName | \`ActualType\` | Yes | — | What it represents |\n` +
      `| optionalParam | \`ActualType\` | No | \`value\` | What it controls |\n` +
      `**Returns:** \`ActualType\` — exact description including null/undefined cases.\n` +
      `**Throws:** \`ActualErrorType\` — exact condition that triggers it.\n` +
      `**Side Effects:** All mutations, I/O, events, or state changes.\n\n` +
      `## Environment Variables\n` +
      `List every environment variable read by this module:\n` +
      `| Variable | Required | Default | Description | Example |\n` +
      `|----------|----------|---------|-------------|---------|\n` +
      `| VAR_NAME | Yes/No | \`value\` | What it controls | \`example\` |\n` +
      `*(Write "No environment variables used." if none are present)*\n\n` +
      `## Failure Modes & Recovery\n` +
      `Every significant way this module can fail and what to do:\n` +
      `| Failure | Trigger Condition | Cascading Impact | Recovery Steps |\n` +
      `|---------|------------------|-----------------|----------------|\n` +
      `| [failure description] | [what causes it] | [downstream effect] | [how to recover] |\n\n` +
      `## Concurrency & State Safety\n` +
      `- Is this module safe for concurrent calls? Under what conditions?\n` +
      `- Any shared mutable state, locking requirements, or ordering constraints?\n` +
      `- Race conditions to watch for\n\n` +
      `## Resource Lifecycle\n` +
      `- Initialization requirements (what must be called first and when)\n` +
      `- Cleanup / teardown (what must be called on shutdown to avoid leaks)\n` +
      `- Held resources: file handles, connections, timers, subscriptions\n` +
      `*(Write "No lifecycle management required." if stateless)*\n\n` +
      `## Usage Examples\n\n` +
      `### Basic Usage\n` +
      `\`\`\`${lang}\n// Real-world example using actual exported symbols — not a toy\n\`\`\`\n\n` +
      `### With Error Handling\n` +
      `\`\`\`${lang}\n// Same example with proper error handling and cleanup\n\`\`\`\n\n` +
      `## What NOT to Do\n` +
      `Document antipatterns and misuse patterns specific to this module:\n` +
      `- **Antipattern:** [description] — **Why it breaks:** [reason]\n` +
      `- **Antipattern:** [description] — **Why it breaks:** [reason]\n\n` +
      `## Configuration & Dangerous Defaults\n` +
      `- List any configuration options with their defaults\n` +
      `- Flag any default that is unsafe in production\n` +
      `- Required vs optional configuration\n` +
      `*(Write "No configuration required." if none exists)*\n\n` +
      `## Error Reference\n` +
      `| Error Type | Condition | Retryable | Recovery |\n` +
      `|------------|-----------|-----------|----------|\n` +
      `| \`ActualErrorType\` | When X happens | Yes/No | Do Y |\n\n` +
      `## Testing\n` +
      `- **Unit test approach:** What to mock, what to test directly\n` +
      `- **Key test cases:** Edge cases and boundary values that must be covered\n` +
      `\`\`\`${lang}\n// Example unit test using real symbols — happy path\n\`\`\`\n\n` +
      `## Observability\n` +
      `**Key log patterns and what they mean:**\n` +
      `| Level | Pattern | Meaning | Action Required |\n` +
      `|-------|---------|---------|----------------|\n` +
      `| ERROR | [pattern] | [meaning] | [action] |\n\n` +
      `**Debugging first steps:** What to check when something goes wrong.\n\n` +
      `## Dependencies\n` +
      `All imports, their purpose, and version constraints if visible.\n\n` +
      `## See Also\n` +
      `- Related modules inferred from imports and usage\n` +
      `- External docs or specifications referenced in code`
    );
  }

  private getComprehensivePrompt(filePath: string, lang: string): string {
    return (
      `Generate exhaustive, Google/Amazon/Stripe/Netflix SRE-grade documentation. ` +
      `Use ONLY real symbol names from the provided code. Every section is MANDATORY.\n\n` +
      `## Module Metadata\n` +
      `| Property | Value |\n` +
      `|----------|-------|\n` +
      `| File | \`${filePath}\` |\n` +
      `| Language | ${lang} |\n` +
      `| Stability | Stable / Beta / Experimental / Deprecated |\n` +
      `| Exports | Exact names of every exported symbol in this file |\n` +
      `| Key Dependencies | Direct imports and purpose of each |\n` +
      `| Complexity | Simple / Moderate / Complex (with brief reason) |\n\n` +
      `## Overview\n` +
      `2–4 sentences: module purpose, single responsibility, place in system architecture, ` +
      `and the core problem it solves. Lead with a verb.\n\n` +
      `## Architecture Diagram\n` +
      `Generate a Mermaid diagram appropriate for this code using REAL class/component names ` +
      `(class diagram for OOP, sequence diagram for async flows, flowchart for algorithms). ` +
      `Use actual exported class and method names from the code:\n` +
      `\`\`\`mermaid\n` +
      `classDiagram\n` +
      `    class ActualClassName {\n` +
      `        +actualField: ActualType\n` +
      `        +actualMethod(param: ActualType): ActualReturnType\n` +
      `    }\n` +
      `\`\`\`\n\n` +
      `## Prerequisites\n` +
      `- Runtime / language version required (be specific: "Node.js >= 18.0.0")\n` +
      `- Modules that must be initialized before this one (initialization order)\n` +
      `- Required credentials, permissions, or IAM roles\n` +
      `- Required peer dependencies with minimum versions\n` +
      `- Operating system or platform constraints if any\n\n` +
      `## Architecture & Design\n\n` +
      `**Design Patterns:** Every pattern in use, with explanation of WHY it was chosen ` +
      `over alternatives.\n\n` +
      `**Module Boundaries:**\n` +
      `- What this module owns and controls\n` +
      `- What it explicitly does NOT do (critical for understanding scope)\n` +
      `- How it interacts with adjacent modules\n\n` +
      `**Architecture Decision Records (ADRs):**\n` +
      `For each non-obvious design decision in the code:\n` +
      `- **Decision:** What was chosen\n` +
      `- **Context:** Why a decision was needed\n` +
      `- **Alternatives considered:** What was rejected and why\n` +
      `- **Consequences:** Trade-offs accepted\n\n` +
      `## State Machine & Invariants\n` +
      `*(Include only if this module manages stateful objects or lifecycle phases)*\n` +
      `- All possible states this module or its objects can be in\n` +
      `- Valid state transitions and what triggers each\n` +
      `- Invariants that must hold in every state\n` +
      `- Invalid state combinations and their consequences\n` +
      `\`\`\`mermaid\n` +
      `stateDiagram-v2\n` +
      `    [*] --> ActualInitialState\n` +
      `    ActualInitialState --> ActualNextState : triggerEvent\n` +
      `\`\`\`\n\n` +
      `## API Reference\n` +
      `Document EVERY exported symbol exhaustively using EXACT names from the code:\n\n` +
      `### \`actualExportedName(param1: ActualType, param2?: ActualType): ActualReturnType\`\n` +
      `Full behavioral description — what it does, not how.\n\n` +
      `| Parameter | Type | Required | Default | Constraints | Description |\n` +
      `|-----------|------|----------|---------|-------------|-------------|\n` +
      `| actualParam1 | \`ActualType\` | Yes | — | Must satisfy X | What it represents |\n` +
      `| actualParam2 | \`ActualType\` | No | \`null\` | Non-empty if set | What it controls |\n\n` +
      `**Returns:** \`ActualType\` — exact meaning, including all possible values and null cases.\n\n` +
      `**Throws:**\n` +
      `| Error | Condition | HTTP Status | Recovery |\n` +
      `|-------|-----------|-------------|----------|\n` +
      `| \`ActualErrorType\` | [exact condition] | [code if applicable] | [recovery action] |\n\n` +
      `**Side Effects:** ALL mutations, I/O, emitted events, external state changes.\n` +
      `**Time Complexity:** O(?) — explain the dominant factor.\n` +
      `**Space Complexity:** O(?) — explain memory allocation.\n` +
      `**Thread Safety:** Safe for concurrent calls? Locking or ordering required?\n\n` +
      `\`\`\`${lang}\n// Copy-paste ready, realistic example using actual exported symbols\n\`\`\`\n\n` +
      `## Environment Variables\n` +
      `Every environment variable read by this module:\n` +
      `| Variable | Required | Default | Description | Valid Values | Example |\n` +
      `|----------|----------|---------|-------------|--------------|--------|\n` +
      `| VAR_NAME | Yes/No | \`value\` | What it controls | Range or enum | \`example\` |\n` +
      `*(Write "No environment variables used." if none are present)*\n\n` +
      `## Configuration & Dangerous Defaults\n` +
      `- All configuration options with their defaults and accepted values\n` +
      `- Flag any default value that is unsafe or inadequate for production with **[DANGER]**\n` +
      `- Minimum configuration required for production operation\n` +
      `- Configuration validation: what is checked at startup vs runtime\n` +
      `*(Write "No configuration required." if none exists)*\n\n` +
      `## Failure Modes & Cascading Impacts\n` +
      `Every significant failure mode, its blast radius, and recovery path:\n` +
      `| Failure Mode | Trigger Condition | Blast Radius | Cascading Impact | MTTR | Recovery |\n` +
      `|-------------|------------------|-------------|-----------------|------|----------|\n` +
      `| [failure description] | [what causes it] | [affected scope] | [downstream systems] | [estimate] | [steps] |\n\n` +
      `**Graceful Degradation Strategy:**\n` +
      `- Does this module fail-fast or fail-safe? Why?\n` +
      `- Circuit breaker pattern: is there one? What trips it?\n` +
      `- Fallback behavior when dependencies are unavailable\n` +
      `- What partial functionality remains available during degraded operation?\n\n` +
      `## Concurrency & Race Conditions\n` +
      `- Is this module safe for concurrent calls? Under what conditions?\n` +
      `- Shared mutable state: list every shared field and its protection mechanism\n` +
      `- Locking strategy: mutexes, semaphores, atomic operations in use\n` +
      `- Known race conditions and how they are prevented or mitigated\n` +
      `- Ordering constraints: operations that must happen before others\n` +
      `- Deadlock scenarios: can two callers deadlock? How is it prevented?\n\n` +
      `## Resource Lifecycle\n` +
      `- **Initialization:** What must be called first, in what order, and with what parameters\n` +
      `- **Startup validation:** What is checked before the module is considered ready\n` +
      `- **Graceful shutdown:** Exact sequence to drain and shut down cleanly\n` +
      `- **Held resources:** Every file handle, connection, timer, subscription, or buffer\n` +
      `- **Leak scenarios:** What happens if cleanup is skipped or interrupted\n` +
      `*(Write "Stateless — no lifecycle management required." if applicable)*\n\n` +
      `## Scalability Limits & Capacity Planning\n` +
      `- Maximum throughput (requests/sec, events/sec, records/batch) if inferable\n` +
      `- Memory footprint per unit of load (per request, per connection, per record)\n` +
      `- Connection pool or thread pool sizes and their limits\n` +
      `- Hard ceilings that cause failure when exceeded (not just slowdown)\n` +
      `- Horizontal scaling constraints: is this module stateless enough to scale out?\n` +
      `- When to add capacity: observable signals that indicate saturation\n\n` +
      `## Usage Examples\n\n` +
      `### Basic Usage\n` +
      `\`\`\`${lang}\n// Minimal real-world example using actual exported symbols\n\`\`\`\n\n` +
      `### Advanced Usage\n` +
      `\`\`\`${lang}\n// Complex scenario with full error handling and resource cleanup\n\`\`\`\n\n` +
      `### Integration Pattern\n` +
      `\`\`\`${lang}\n// How this module composes with adjacent modules (real imports and calls)\n\`\`\`\n\n` +
      `## What NOT to Do — Antipatterns\n` +
      `Document every known misuse pattern. Each entry must explain the harm:\n\n` +
      `**Antipattern 1: [Name]**\n` +
      `\`\`\`${lang}\n// BAD — shows the wrong way using real code patterns\n\`\`\`\n` +
      `**Why this breaks:** [precise failure mode, not vague "don't do this"]\n` +
      `**Correct approach:** [what to do instead]\n\n` +
      `## Error Codes Catalog\n` +
      `Complete reference for every error this module can produce:\n` +
      `| Code | Error Type | Message Template | Root Cause | Recovery | Retryable? | SLO Impact |\n` +
      `|------|------------|-----------------|------------|----------|------------|------------|\n` +
      `| E001 | \`ActualErrorType\` | "actual message template" | [root cause] | [recovery] | No | [impact] |\n` +
      `| E002 | \`ActualNetworkError\` | "actual message template" | [root cause] | Retry with backoff | Yes | [impact] |\n\n` +
      `## Testing Guide\n` +
      `**Unit Testing:**\n` +
      `- Exact mocks needed (list each external dependency and the mock strategy)\n` +
      `- What must NOT be mocked (real implementations required)\n` +
      `- Boundary values and edge cases that must have test coverage\n\n` +
      `**Integration Testing:**\n` +
      `- External services or databases required\n` +
      `- Test data setup and teardown procedures\n` +
      `- Minimum environment configuration for integration tests\n\n` +
      `**Example Tests:**\n` +
      `\`\`\`${lang}\n// Happy path — uses real exported symbols\n\`\`\`\n` +
      `\`\`\`${lang}\n// Error path — tests actual thrown error types\n\`\`\`\n` +
      `\`\`\`${lang}\n// Edge case — boundary condition that commonly regresses\n\`\`\`\n\n` +
      `## Observability\n` +
      `**Log patterns and meanings:**\n` +
      `| Level | Message Pattern | Meaning | Immediate Action |\n` +
      `|-------|----------------|---------|------------------|\n` +
      `| ERROR | [actual pattern] | [meaning] | [action] |\n` +
      `| WARN | [actual pattern] | [transient condition] | [monitor] |\n\n` +
      `**Metrics and SLO thresholds:**\n` +
      `| Metric | Unit | Warning Threshold | Critical Threshold | Dashboard Signal |\n` +
      `|--------|------|------------------|-------------------|------------------|\n` +
      `| [metric name] | [unit] | [warn value] | [crit value] | [what to look for] |\n\n` +
      `**Alerting rules:**\n` +
      `- Alert 1: [condition] → [severity] → [runbook step]\n` +
      `- Alert 2: [condition] → [severity] → [runbook step]\n\n` +
      `**Debug mode:** How to enable verbose logging or tracing for this module.\n\n` +
      `## Incident Response Runbook\n` +
      `For on-call engineers responding to production incidents:\n\n` +
      `**Triage — First 5 minutes:**\n` +
      `1. Check [specific log pattern or metric] to confirm this module is the source\n` +
      `2. Determine blast radius: [what downstream systems to check]\n` +
      `3. Assess severity: P1 (full outage) / P2 (degraded) / P3 (single-customer)\n\n` +
      `**Mitigation playbooks:**\n\n` +
      `*Scenario: [Most common failure mode]*\n` +
      `- Severity: P[1/2/3]\n` +
      `1. [First diagnostic step]\n` +
      `2. If [condition A] → [action A]\n` +
      `3. If [condition B] → [action B — may require rollback]\n` +
      `4. Escalation: [team or person to page if unresolved in X minutes]\n\n` +
      `*Scenario: [Second most common failure mode]*\n` +
      `- Severity: P[1/2/3]\n` +
      `1. [First diagnostic step]\n` +
      `2. [Recovery action]\n\n` +
      `## Performance Characteristics\n` +
      `- Time complexity of every critical path with explanation of dominant factor\n` +
      `- Space complexity and peak memory allocation\n` +
      `- Throughput limits or benchmarks if inferable from code\n` +
      `- Known bottlenecks and where to look for optimization\n` +
      `- Caching behavior: what is cached, TTL, invalidation strategy\n` +
      `- Hot paths: code paths exercised on every request that must stay lean\n\n` +
      `## Rollback & Deployment Safety\n` +
      `- Is this module safe to deploy without coordinating with other services?\n` +
      `- Schema or protocol changes that require multi-step rollout\n` +
      `- Feature flags or kill switches available\n` +
      `- Rollback procedure if deployment causes incidents\n` +
      `- Smoke test to verify healthy deployment\n\n` +
      `## Backwards Compatibility & Version History\n` +
      `- Current API stability guarantees (semver contract)\n` +
      `- Breaking changes detectable from the code (renamed symbols, changed signatures)\n` +
      `- Deprecated symbols: migration path and planned removal version\n` +
      `- Symbols that must NOT be changed without a major version bump\n\n` +
      `## Security Considerations\n` +
      `- **Input validation:** What is validated, what is trusted, what is sanitized\n` +
      `- **Authentication/Authorization:** Caller trust assumptions this module makes\n` +
      `- **Data sensitivity:** PII/secrets that pass through and how they are protected\n` +
      `- **Attack surface:** Injection risks, SSRF, privilege escalation, insecure deserialization\n` +
      `- **Supply chain:** Third-party dependencies with known risk surface\n` +
      `- **Compliance hooks:** GDPR / HIPAA / SOC 2 considerations if detectable\n\n` +
      `## Known Limitations & Edge Cases\n` +
      `| Limitation | Impact | Affected Scenarios | Workaround |\n` +
      `|------------|--------|-------------------|------------|\n` +
      `| [description] | [severity] | [when it matters] | [mitigation] |\n\n` +
      `**TODO / FIXME / HACK inventory** (from code comments):\n` +
      `- List every TODO/FIXME/HACK comment with its location and implication\n\n` +
      `## FAQ\n` +
      `Answer the 4–6 questions a new engineer would most likely ask:\n\n` +
      `**Q: [Most common onboarding question]?**\n` +
      `A: [Precise, complete answer]\n\n` +
      `**Q: [Most common operational question]?**\n` +
      `A: [Precise, complete answer]\n\n` +
      `## See Also\n` +
      `- **Related modules:** Inferred from imports and usage patterns\n` +
      `- **External references:** Specifications, RFCs, or docs referenced in comments\n` +
      `- **Upstream dependencies:** Key packages and their documentation links\n\n` +
      `## Deprecations & Stability\n` +
      `- Deprecated symbols with exact migration path and removal timeline\n` +
      `- Stability guarantees: which APIs are stable vs experimental vs internal\n` +
      `- Breaking change history if detectable from code or comments`
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
    const { system, user: promptTemplate } = this.buildPrompt(context);
    const maxCtx = this.getMaxContextWindow(model);
    const overhead =
      this.getTokenCount(system) +
      this.getTokenCount(promptTemplate.replace("{CODE}", "")) +
      500;
    const maxCodeTokens = maxCtx - overhead - 1024;

    if (this.getTokenCount(context.code) > maxCodeTokens) {
      return this.generateChunked(
        context,
        model,
        apiKey,
        system,
        promptTemplate,
        maxCodeTokens,
      );
    }

    const userContent = promptTemplate.replace("{CODE}", context.code);
    const inputTokens =
      this.getTokenCount(system) + this.getTokenCount(userContent);
    const maxTokens = Math.min(
      this.getMaxOutputTokens(model),
      Math.max(1024, maxCtx - inputTokens - 500),
    );

    return this.callApi({
      model,
      apiKey,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      maxTokens,
    });
  }

  /** Splits large files into chunks and merges the AI output. */
  private async generateChunked(
    context: DocumentationContext,
    model: string,
    apiKey: string,
    system: string,
    promptTemplate: string,
    maxCodeTokens: number,
  ): Promise<DocumentationResult> {
    const chunks = this.chunkCode(context.code, maxCodeTokens);
    let combined = "";
    let totalTokens = 0;

    for (let i = 0; i < chunks.length; i++) {
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

      const result = await this.callApi({
        model,
        apiKey,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        maxTokens,
      });
      combined += `\n\n${result.documentation}`;
      totalTokens += result.tokensUsed;
    }

    return { documentation: combined.trim(), tokensUsed: totalTokens, model };
  }

  /** Splits code at logical boundaries (function/class declarations, blank lines). */
  protected chunkCode(code: string, maxTokens: number): string[] {
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

      if (lt > maxTokens) {
        flush();
        let rem = line;
        while (rem.length > 0) {
          chunks.push(rem.substring(0, maxTokens * 4));
          rem = rem.substring(maxTokens * 4);
        }
        continue;
      }

      if (currentTokens + lt > maxTokens) {
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
    const user =
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
