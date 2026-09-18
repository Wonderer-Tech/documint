import { mkdirSync, writeFileSync } from "node:fs";
import { SourceAnalyzer } from "../../src/analyzer/sourceAnalyzer";
import { buildLocalDocumentationDocument } from "../../src/services/localDocumentationDocument";
import { buildLocalArchitectureVisualBlueprint } from "../../src/services/localVisualBlueprint";
import { generateHtmlTemplate } from "../../src/services/htmlTemplate";
import { sanitizeHtml } from "../../src/services/outputSanitizerCore";
import { hardenGeneratedHtmlForOffline } from "../../src/services/htmlOfflineHardening";
import type { WorkspaceFile } from "../../src/types";

const output = "test-results/navigation-browser";
mkdirSync(output, { recursive: true });
const paths = [
  "src/providers/model.ts", "src/scanner/index.ts", "src/app/(internal)/[slug]/page.tsx",
  "src/components/hello world.ts", "src/lib/d2.ts", "packages/shared/index.ts",
  "packages/tools/index.ts", "apps/api/index.ts", "apps/web/index.ts", "package.json",
];
const files: WorkspaceFile[] = paths.map((path, i) => ({
  path, language: path.endsWith(".json") ? "json" : path.endsWith(".tsx") ? "typescriptreact" : "typescript",
  content: path.endsWith(".json") ? '{"name":"browser-fixture"}\n' : `export const value${i} = ${i};\n`,
}));
const analyzer = new SourceAnalyzer();
const project = analyzer.analyzeProject(files);
const local = buildLocalDocumentationDocument("Browser Fixture", files, project);
const fixtures: Array<{ name: string; files: number; lines: number; chart: boolean }> = [];
function emit(name: string, html: string, count: number, lines: number, chart = true) {
  writeFileSync(`${output}/${name}.html`, hardenGeneratedHtmlForOffline(sanitizeHtml(html)));
  fixtures.push({ name, files: count, lines, chart });
}
emit("local", local.html, files.length, local.totalLines);
emit("malformed-chart", local.html.replace(/(<code class="language-architecture-blueprint">)[\s\S]*?(<\/code>)/,
  '$1{"modules":[null]}$2'), files.length, local.totalLines, false);
const singleFiles: WorkspaceFile[] = [{ path: "index.ts", language: "typescript", content: "export const single = 1;\n" }];
const single = buildLocalDocumentationDocument("Single File", singleFiles, analyzer.analyzeProject(singleFiles));
emit("single-file", single.html, 1, single.totalLines);

// Provider-free fixture for the existing AI renderer contract: H1 file headings,
// canonical TOC links and the original ASCII project-tree payload.
const aiFiles = files.slice(0, 2);
const aiProject = analyzer.analyzeProject(aiFiles);
const blueprint = { ...buildLocalArchitectureVisualBlueprint({ projectName: "AI Format Fixture", files: aiFiles, project: aiProject }), source: "ai" };
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const toc = '<ul><li><a class="toc-link level-2" href="#overview"><span class="toc-text">Project Overview</span></a></li>' +
  '<li><a class="toc-link level-3" href="#visual"><span class="toc-text">Visual Blueprint: Architecture Map</span></a></li>' +
  aiFiles.map((file, i) => `<li><a class="toc-link level-1" href="#file-${i}"><span class="toc-text">${escape(file.path)}</span></a></li>`).join("") + '</ul>';
const tree = 'fixture/\n`-- src/\n    |-- providers/\n    |   `-- model.ts [typescript | 2 lines]\n    `-- scanner/\n        `-- index.ts [typescript | 2 lines]';
const content = '<h1>AI Format Fixture</h1><h2 id="overview">Project Overview</h2>' +
  `<pre><code class="language-project-tree">${escape(tree)}</code></pre>` +
  '<h3 id="visual">Visual Blueprint: Architecture Map</h3>' +
  `<pre><code class="language-architecture-blueprint">${escape(JSON.stringify(blueprint))}</code></pre>` +
  aiFiles.map((file, i) => `<h1 id="file-${i}">${escape(file.path)}</h1><p>Fixture file documentation.</p>`).join("");
const ai = generateHtmlTemplate({ title: "AI Format Fixture", projectName: "AI Format Fixture", fileCount: 2,
  generationDate: "2026-09-18T00:00:00.000Z", languages: ["typescript"], totalLines: 4, tocHtml: toc, contentHtml: content });
emit("ai-format", ai, 2, 4);
const legacyToc = toc.replace(/ class="toc-link level-[1-6]"/g, "").replace(/<span class="toc-text">([\s\S]*?)<\/span>/g, "$1");
emit("legacy-bare-links", ai.replace(toc, legacyToc), 2, 4);
writeFileSync(`${output}/fixtures.json`, JSON.stringify(fixtures, null, 2));
