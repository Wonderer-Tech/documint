import test from "node:test";
import assert from "node:assert/strict";
import {
  getExplicitConfigurationValue,
  resolveConfigurationValue,
} from "../src/config/configurationPreference";

test("configuration migration keeps explicit legacy values ahead of new defaults", () => {
  const resolved = resolveConfigurationValue(
    {},
    { workspaceValue: "anthropic" },
    "openai",
  );

  assert.deepEqual(resolved, {
    value: "anthropic",
    source: "legacy-explicit",
  });
});

test("explicit documint values take precedence over explicit legacy values", () => {
  const resolved = resolveConfigurationValue(
    { globalValue: "local" },
    { workspaceValue: "ai" },
    "local",
  );

  assert.deepEqual(resolved, {
    value: "local",
    source: "current-explicit",
  });
});

test("current namespace default is used only when neither namespace is explicit", () => {
  const resolved = resolveConfigurationValue({}, {}, 5);

  assert.deepEqual(resolved, {
    value: 5,
    source: "current-default",
  });
});

test("configuration inspection chooses the most specific explicit scope", () => {
  assert.equal(
    getExplicitConfigurationValue({
      globalValue: "global",
      workspaceValue: "workspace",
      workspaceFolderValue: "folder",
    }),
    "folder",
  );

  assert.equal(
    getExplicitConfigurationValue({
      globalValue: "global",
      workspaceValue: "workspace",
      workspaceLanguageValue: "workspace-language",
    }),
    "workspace-language",
  );
});


test("configuration precedence preserves explicit falsy values", () => {
  assert.deepEqual(
    resolveConfigurationValue(
      { workspaceValue: 0 },
      { workspaceValue: 15 },
      5,
    ),
    { value: 0, source: "current-explicit" },
  );

  assert.deepEqual(
    resolveConfigurationValue(
      { workspaceValue: "" },
      { workspaceValue: "legacy" },
      "default",
    ),
    { value: "", source: "current-explicit" },
  );

  assert.equal(
    getExplicitConfigurationValue({ globalValue: false }),
    false,
  );
});
