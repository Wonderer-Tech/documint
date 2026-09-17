import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = [
  readFileSync(join(process.cwd(), "src/services/docGenerator.ts"), "utf8"),
  readFileSync(join(process.cwd(), "src/services/docGeneratorBase.ts"), "utf8"),
].join("\n");

test("project visuals no longer generate the hard-coded DocuMint workflow", () => {
  for (const forbidden of [
    "interface CodeWorkflowStep",
    "interface CodeWorkflowLane",
    "interface CodeWorkflowBlueprint",
    "buildCodeWorkflowBlueprint",
    "generateCodeWorkflowMermaid",
    "generateCodeWorkflowD2",
    "Visual Blueprint: Code Workflow",
    "Editable Code Workflow Diagram",
    "D2 Code Workflow Source",
    "```code-workflow",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      `hard-coded workflow source returned: ${forbidden}`,
    );
  }
});

test("project visual cache version invalidates pre-workflow-removal cache", () => {
  assert.match(
    source,
    /VISUAL_CACHE_VERSION\s*=\s*"project-visuals-v3"/,
  );
  assert.doesNotMatch(
    source,
    /VISUAL_CACHE_VERSION\s*=\s*"project-visuals-v2"/,
  );
});

test("source-grounded architecture visuals remain enabled", () => {
  for (const required of [
    "Visual Blueprint: Architecture Map",
    "Editable Diagram Export",
    "D2 Style Architecture Source",
    "Whiteboard Architecture Sketch",
    "Interactive Dependency Graph",
  ]) {
    assert.ok(source.includes(required), `missing architecture visual: ${required}`);
  }
});
