import test from "node:test";
import assert from "node:assert/strict";
import { SourceAnalyzer } from "../src/analyzer/sourceAnalyzer";
import {
  renderLocalProjectDocumentation,
  renderLocalProjectDocumentationFromModel,
} from "../src/services/localProjectDocumentation";
import { buildLocalDocumentationModel } from "../src/services/localDocumentationModel";
import type { WorkspaceFile } from "../src/types";

const files: WorkspaceFile[] = [
  {
    path: "src/index.ts",
    language: "typescript",
    content: [
      'import { helper } from "../lib/helper";',
      'import React from "react";',
      "export function start(): number { return helper(); }",
    ].join("\n"),
  },
  {
    path: "lib/helper.ts",
    language: "typescript",
    content: [
      "export function helper(): number { return 1; }",
      "// TODO: replace stub implementation",
    ].join("\n"),
  },
];

const analyzer = new SourceAnalyzer();
const project = analyzer.analyzeProject(files);

test("local project overview renders deterministic project facts", () => {
  const output = renderLocalProjectDocumentation({
    projectName: "Example Project",
    files,
    project,
  });

  assert.match(output, /^# Example Project — Local Documentation/m);
  assert.match(output, /No AI inference, model, API key, or external provider is used/);
  assert.match(output, /\*\*Files:\*\* 2/);
  assert.match(output, /\*\*Lines:\*\* 5/);
  assert.match(output, /\*\*Internal dependency links:\*\* 1/);
  assert.match(output, /\*\*External dependencies:\*\* 1/);
  assert.match(output, /\*\*TODO\/FIXME\/HACK comments:\*\* 1/);
  assert.match(output, /`react`/);
});

test("local project overview includes module facts and a stable source tree", () => {
  const output = renderLocalProjectDocumentation({
    projectName: "Example Project",
    files,
    project,
  });

  assert.match(output, /## Module Summary/);
  assert.match(output, /\| `lib` \| 1 \|/);
  assert.match(output, /\| `src` \| 1 \|/);
  assert.match(output, /## Where is what/);
  assert.match(output, /## Suggested reading path/);
  assert.match(output, /## Core files/);
  assert.match(output, /`src\/index\.ts`/);
  assert.match(output, /`lib\/helper\.ts`/);
  assert.match(output, /Example Project\//);
  assert.match(output, /├── lib\//);
  assert.match(output, /└── src\//);
  assert.match(output, /helper\.ts/);
  assert.match(output, /index\.ts/);
});


test("local project overview renders package scripts and VS Code manifest facts when present", () => {
  const manifestFiles: WorkspaceFile[] = [
    {
      path: "package.json",
      language: "json",
      content: JSON.stringify({
        main: "./dist/extension.js",
        packageManager: "pnpm@9.15.4",
        scripts: {
          compile: "tsc --noEmit",
          test: "node --test",
        },
        contributes: {
          commands: [
            { command: "documint.generate", title: "Generate Documentation" },
          ],
          configuration: {
            properties: {
              "documint.mode": { default: "local" },
              "aiDocGenerator.mode": {
                default: "ai",
                deprecationMessage: "Use documint.mode instead.",
              },
            },
          },
        },
      }),
    },
    {
      path: "src/extension.ts",
      language: "typescript",
      content: "export function activate() {}",
    },
  ];
  const manifestProject = analyzer.analyzeProject(manifestFiles);
  const output = renderLocalProjectDocumentation({
    projectName: "Extension",
    files: manifestFiles,
    project: manifestProject,
  });

  assert.match(output, /## How to run/);
  assert.match(output, /\*\*Package manager:\*\* `pnpm`/);
  assert.match(output, /`pnpm run compile`/);
  assert.match(output, /`tsc --noEmit`/);
  assert.match(output, /### VS Code commands/);
  assert.match(output, /### VS Code settings/);
  assert.match(output, /`\.\/dist\/extension\.js`/);
  assert.match(output, /`documint\.generate`/);
  assert.match(output, /`documint\.mode`/);
  assert.doesNotMatch(output, /`aiDocGenerator\.mode`/);
});


test("Local overview uses portable relative source links", () => {
  const output = renderLocalProjectDocumentation({
    projectName: "Example Project",
    files,
    project,
  });

  assert.match(output, /\[\`src\/index\.ts\`\]\(\.\.\/src\/index\.ts\)/);
  assert.match(output, /\[\`lib\/helper\.ts\`\]\(\.\.\/lib\/helper\.ts\)/);
  assert.doesNotMatch(output, /vscode:\/\/file/i);
  assert.doesNotMatch(output, /github\.com\/Wonderer-Tech\/documint/i);
});


test("Local overview labels environment names as references rather than requirements", () => {
  const envFiles: WorkspaceFile[] = [
    ...files,
    {
      path: "src/env.ts",
      language: "typescript",
      content: "export const api = process.env.API_URL;",
    },
  ];
  const envProject = analyzer.analyzeProject(envFiles);
  const output = renderLocalProjectDocumentation({
    projectName: "Example Project",
    files: envFiles,
    project: envProject,
  });

  assert.match(output, /## Referenced environment variables/);
  assert.match(output, /static analysis does not claim they are required/i);
  assert.match(output, /\`API_URL\`/);
  assert.doesNotMatch(output, /Required environment variables/);
});


test("local project overview lists referenced environment variables conservatively", () => {
  const envFiles: WorkspaceFile[] = [
    {
      path: "src/index.ts",
      language: "typescript",
      content: [
        'const key = process.env.API_KEY;',
        'const mode = import.meta.env.MODE;',
      ].join("\n"),
    },
    {
      path: "worker.py",
      language: "python",
      content: [
        "import os",
        'region = os.getenv("REGION")',
      ].join("\n"),
    },
  ];
  const envProject = analyzer.analyzeProject(envFiles);
  const output = renderLocalProjectDocumentation({
    projectName: "Env Example",
    files: envFiles,
    project: envProject,
  });

  assert.match(output, /## Referenced environment variables/);
  assert.match(output, /`API_KEY`/);
  assert.match(output, /`MODE`/);
  assert.match(output, /`REGION`/);
  assert.match(output, /does not claim they are required/i);
});


test("local project facts report trusted-description coverage", () => {
  const describedFiles: WorkspaceFile[] = [
    {
      path: "src/documented.ts",
      language: "typescript",
      content: [
        "/** Documented module. */",
        "export class Documented {}",
      ].join("\n"),
    },
    {
      path: "src/undocumented.ts",
      language: "typescript",
      content: "export const value = 1;",
    },
  ];
  const describedProject = analyzer.analyzeProject(describedFiles);
  const output = renderLocalProjectDocumentation({
    projectName: "Coverage",
    files: describedFiles,
    project: describedProject,
  });

  assert.match(output, /\*\*Files with trusted descriptions:\*\* 1/);
  assert.match(output, /\*\*Undocumented files:\*\* 1/);
});


test("How to run renders Makefile targets and Dockerfile facts without inventing Docker commands", () => {
  const projectFiles: WorkspaceFile[] = [
    {
      path: "src/main.ts",
      language: "typescript",
      content: "export const value = 1;",
    },
  ];
  const buildProject = analyzer.analyzeProject(projectFiles);
  const model = buildLocalDocumentationModel(
    "Build Example",
    projectFiles,
    buildProject,
    {
      makefile: "build:\n\tnpm run build\n",
      dockerfile: [
        "FROM node:22-alpine AS runtime",
        "EXPOSE 3000",
        'ENTRYPOINT ["node"]',
        'CMD ["dist/server.js"]',
      ].join("\n"),
    },
  );
  const output = renderLocalProjectDocumentationFromModel(model);

  assert.match(output, /### Makefile/);
  assert.match(output, /\| `build` \| `make build` \|/);
  assert.match(output, /### Dockerfile facts/);
  assert.match(output, /\*\*Base images:\*\* `node:22-alpine`/);
  assert.match(output, /\*\*Stages:\*\* `runtime`/);
  assert.match(output, /\*\*Exposed ports:\*\* `3000`/);
  assert.match(output, /\*\*ENTRYPOINT:\*\* `\["node"\]`/);
  assert.match(output, /\*\*CMD:\*\* `\["dist\/server\.js"\]`/);
  assert.doesNotMatch(output, /docker build/);
});
