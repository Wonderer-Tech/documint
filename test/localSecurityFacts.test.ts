import test from "node:test";
import assert from "node:assert/strict";
import { extractLocalSecurityFacts } from "../src/services/localSecurityFacts";
import type { WorkspaceFile } from "../src/types";

function file(path: string, language: string, content: string): WorkspaceFile {
  return { path, language, content };
}

test("security facts detect secret storage, credential env names and policy headers", () => {
  const facts = extractLocalSecurityFacts(
    [
      file(
        "src/secrets.ts",
        "typescript",
        [
          "export function read(context: vscode.ExtensionContext) {",
          "  return context.secrets.get('api-key');",
          "}",
        ].join("\n"),
      ),
      file(
        "src/csp.ts",
        "typescript",
        'export const header = "Content-Security-Policy";\n',
      ),
    ],
    {
      environmentFiles: [
        {
          path: "src/provider.ts",
          referencedEnvironmentVariables: ["API_TOKEN", "LOG_LEVEL"],
        },
      ],
    },
  );

  assert.ok(facts);
  assert.ok(
    facts?.evidence.some(
      (item) =>
        item.kind === "secret-storage" &&
        item.path === "src/secrets.ts" &&
        item.line === 2,
    ),
  );
  assert.ok(
    facts?.evidence.some(
      (item) =>
        item.kind === "credential-environment" &&
        item.label === "API_TOKEN" &&
        item.path === "src/provider.ts",
    ),
  );
  assert.equal(
    facts?.evidence.some((item) => item.label === "LOG_LEVEL"),
    false,
  );
  assert.ok(
    facts?.evidence.some(
      (item) =>
        item.kind === "security-policy" &&
        item.label === "Content Security Policy",
    ),
  );
});

test("security facts detect imported authentication dependencies conservatively", () => {
  const facts = extractLocalSecurityFacts([], {
    externalDependencies: ["axios", "jose", "next-auth"],
  });

  assert.ok(facts);
  assert.deepEqual(
    facts?.evidence
      .filter((item) => item.kind === "auth-dependency")
      .map((item) => item.label),
    ["jose", "next-auth"],
  );
});

test("security facts remain absent without direct supported evidence", () => {
  const facts = extractLocalSecurityFacts(
    [
      file(
        "src/index.ts",
        "typescript",
        "export const passwordLabel = 'password';\n",
      ),
    ],
    {
      environmentFiles: [
        {
          path: "src/index.ts",
          referencedEnvironmentVariables: ["LOG_LEVEL", "NODE_ENV"],
        },
      ],
      externalDependencies: ["axios", "crypto"],
    },
  );

  assert.equal(facts, undefined);
});
