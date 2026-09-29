import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDockerfileFacts,
  parseMakefileTargets,
} from "../src/services/localBuildFacts";

test("Makefile facts keep concrete callable targets only", () => {
  const targets = parseMakefileTargets([
    ".PHONY: build test clean",
    "NODE_ENV := production",
    "build: compile",
    "\tnpm run build",
    "test clean:",
    "\tnpm test",
    "dist/%: src/%",
    "$(TARGET):",
    "docker/build: build",
  ].join("\n"));

  assert.deepEqual(targets, [
    { name: "build" },
    { name: "clean" },
    { name: "docker/build" },
    { name: "test" },
  ]);
});

test("Dockerfile facts preserve source directives without inventing run commands", () => {
  const facts = parseDockerfileFacts([
    "FROM node:22-alpine AS build",
    "WORKDIR /app",
    "FROM node:22-alpine AS runtime",
    "EXPOSE 3000 9229/tcp",
    'ENTRYPOINT ["node"]',
    'CMD ["dist/server.js"]',
  ].join("\n"));

  assert.deepEqual(facts, {
    baseImages: ["node:22-alpine"],
    stages: ["build", "runtime"],
    exposedPorts: ["3000", "9229/tcp"],
    entrypoint: '["node"]',
    command: '["dist/server.js"]',
  });
});

test("build-fact parsers stay empty when no supported evidence exists", () => {
  assert.deepEqual(parseMakefileTargets(undefined), []);
  assert.deepEqual(parseMakefileTargets("# comments only"), []);
  assert.equal(parseDockerfileFacts(undefined), undefined);
  assert.equal(parseDockerfileFacts("RUN echo hello"), undefined);
});
