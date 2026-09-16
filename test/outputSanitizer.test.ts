import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeHtml,
  sanitizeMarkdown,
} from "../src/services/outputSanitizerCore";

test("markdown sanitizer removes unsafe workflow sections at document start", () => {
  const input = [
    "### Visual Blueprint: Code Workflow",
    "unsafe body",
    "### Safe Section",
    "keep me",
  ].join("\n");

  const output = sanitizeMarkdown(input);
  assert.equal(output.includes("Code Workflow"), false);
  assert.equal(output.includes("unsafe body"), false);
  assert.equal(output.includes("### Safe Section"), true);
  assert.equal(output.includes("keep me"), true);
});

test("markdown sanitizer preserves unrelated architecture content", () => {
  const input = [
    "## Project Overview",
    "### Visual Blueprint: Architecture Map",
    "architecture facts",
    "### Interactive Dependency Graph",
    "dependency facts",
  ].join("\n");

  assert.equal(sanitizeMarkdown(input), input);
});

test("html sanitizer removes unsafe workflow section and keeps following content", () => {
  const input = [
    '<h3 id="workflow">Visual Blueprint: Code Workflow</h3>',
    "<p>unsafe body</p>",
    '<h3 id="safe">Interactive Dependency Graph</h3>',
    "<p>keep me</p>",
  ].join("");

  const output = sanitizeHtml(input);
  assert.equal(output.includes("Code Workflow"), false);
  assert.equal(output.includes("unsafe body"), false);
  assert.equal(output.includes("Interactive Dependency Graph"), true);
  assert.equal(output.includes("keep me"), true);
});
