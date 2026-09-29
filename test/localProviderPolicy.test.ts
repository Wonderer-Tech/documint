import test from "node:test";
import assert from "node:assert/strict";
import {
  getLocalPresetDefinition,
  localPresetModelRequiredMessage,
  resolveLocalPresetModel,
} from "../src/providers/localProviderPolicy";

test("local provider presets use loopback OpenAI-compatible endpoints", () => {
  assert.deepEqual(getLocalPresetDefinition("ollama"), {
    name: "ollama",
    label: "Ollama",
    chatCompletionsEndpoint:
      "http://127.0.0.1:11434/v1/chat/completions",
    modelsEndpoint: "http://127.0.0.1:11434/v1/models",
  });

  assert.deepEqual(getLocalPresetDefinition("lmstudio"), {
    name: "lmstudio",
    label: "LM Studio",
    chatCompletionsEndpoint:
      "http://127.0.0.1:1234/v1/chat/completions",
    modelsEndpoint: "http://127.0.0.1:1234/v1/models",
  });
});

test("local provider model selection rejects inherited cloud defaults", () => {
  for (const cloudDefault of [
    "gpt-5.4-nano",
    "claude-sonnet-5",
    "openai/gpt-4o",
    "deepseek-flash",
  ]) {
    assert.equal(
      resolveLocalPresetModel(cloudDefault, undefined),
      "",
    );
  }

  assert.equal(
    resolveLocalPresetModel(undefined, "gpt-5.4-nano"),
    "",
  );
});

test("local provider model selection preserves user/local model names", () => {
  assert.equal(
    resolveLocalPresetModel("qwen3:8b", "gpt-5.4-nano"),
    "qwen3:8b",
  );
  assert.equal(
    resolveLocalPresetModel("deepseek-r1:7b", undefined),
    "deepseek-r1:7b",
  );
  assert.equal(
    resolveLocalPresetModel("my-org/model.gguf", undefined),
    "my-org/model.gguf",
  );
});

test("local provider missing-model message names the selected runtime", () => {
  assert.match(localPresetModelRequiredMessage("ollama"), /Ollama/);
  assert.match(localPresetModelRequiredMessage("lmstudio"), /LM Studio/);
  assert.match(localPresetModelRequiredMessage("ollama"), /documint\.model/);
});
