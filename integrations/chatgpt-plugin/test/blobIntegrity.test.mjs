import test from "node:test";
import assert from "node:assert/strict";
import { matchesGitBlobSha } from "../blobIntegrity.mjs";
const SRC="export const value = 1;\n";
const SHA="efeee5db16c087416d13e29bc506c998eeaf0827";
test("known Git SHA-1 blob bytes match, corrupted content fails",()=>{
  assert.equal(matchesGitBlobSha(SRC,SHA),true);
  assert.equal(matchesGitBlobSha(SRC+" ",SHA),false);
});
test("malformed or short blob SHA fails closed",()=>{
  assert.equal(matchesGitBlobSha(SRC,"not-a-hash"),false);
  assert.equal(matchesGitBlobSha(SRC,"a".repeat(39)),false);
});
test("missing SHA in synthetic fixtures produces unknown, not verified",()=>{
  assert.equal(matchesGitBlobSha(SRC,undefined),null);
});
