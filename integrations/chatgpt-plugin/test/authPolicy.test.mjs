import test from "node:test";
import assert from "node:assert/strict";
import { parseAccessToken, isAuthorizedRequest, configureMcpAccess } from "../authPolicy.mjs";

const TOKEN = "f12c39a851d976cb8f85a41be6e0a649593f19f12ee2b0a987ca61d803772ad4";

test("absent token preserves loopback development mode", () => {
  assert.equal(parseAccessToken(undefined), null);
  assert.equal(parseAccessToken(""), null);
  assert.equal(isAuthorizedRequest(undefined, null), true);
});
test("only exact Bearer token is accepted when configured", () => {
  const expected = parseAccessToken(TOKEN);
  assert.equal(isAuthorizedRequest("Bearer " + TOKEN, expected), true);
  for (const header of [
    undefined, "Bearer " + TOKEN.slice(0, -1) + "z",
    "bearer " + TOKEN, "Basic " + TOKEN, "Bearer  " + TOKEN,
    "Bearer " + TOKEN + ", Bearer another",
  ]) assert.equal(isAuthorizedRequest(header, expected), false);
});
test("weak and malformed secret configurations fail startup", () => {
  for (const bad of [
    "short", "password".repeat(4), "a".repeat(31),
    "a".repeat(257), "a".repeat(33) + "\n",
    "Bearer " + "a".repeat(40), "a".repeat(32) + "/",
  ]) assert.throws(() => parseAccessToken(bad), /token/i);
});
test("non-string headers fail authorization", () => {
  const expected = parseAccessToken(TOKEN);
  for (const value of [null, 12, {}, ["Bearer " + TOKEN], "Bearer " + TOKEN + "\n"]) {
    assert.equal(isAuthorizedRequest(value, expected), false);
  }
});
test("expected digest does not serialize the secret", () => {
  assert.ok(!JSON.stringify(parseAccessToken(TOKEN)).includes(TOKEN));
});
test("required token mode refuses missing credentials", () => {
  assert.throws(() => configureMcpAccess({ required: "1" }), /requires MCP_ACCESS_TOKEN/);
  assert.throws(() => configureMcpAccess({ required: "invalid", token: TOKEN }), /require/i);
  assert.equal(configureMcpAccess({ required: "0" }), null);
  assert.equal(isAuthorizedRequest("Bearer " + TOKEN, configureMcpAccess({ required: "1", token: TOKEN })), true);
});
