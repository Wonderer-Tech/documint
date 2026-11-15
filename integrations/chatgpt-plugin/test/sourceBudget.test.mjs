import test from "node:test";
import assert from "node:assert/strict";
import { reserveSourceBytes } from "../sourceBudget.mjs";
const m = (path, size) => ({ path, size, type: "blob" });
test("source budget refuses to schedule downloads beyond 4 MiB", () => {
  const entries = [m("a", 2_000_000), m("b", 2_000_000), m("c", 1_000_000), m("d", 100)];
  const {scheduled,omitted} = reserveSourceBytes(entries, 4 * 1024 * 1024);
  assert.deepEqual(scheduled.map(x => x.path), ["a","b","d"]);
  assert.equal(omitted, 1);
});
test("oversized candidate does not displace subsequent smaller file", () => {
  const {scheduled,omitted} = reserveSourceBytes([m("big",200),m("small",20),m("tiny",3)],30);
  assert.deepEqual(scheduled.map(x=>x.path),["small","tiny"]);
  assert.equal(omitted,1);
});
test("focused file stays first when previously prioritized by the collector", () => {
  const {scheduled,omitted}=reserveSourceBytes([m("focus.ts",26),m("other.ts",25)],30);
  assert.deepEqual(scheduled.map(x=>x.path),["focus.ts"]);
  assert.equal(omitted,1);
});
test("budget does not mutate input and accepts exact-size file",()=>{
  const files=[m("index.ts",30)];
  const {scheduled,omitted}=reserveSourceBytes(files,30);
  assert.deepEqual(scheduled,files);
  assert.equal(omitted,0);
  assert.equal(files.length,1);
});
test("invalid byte budgets and source sizes are refused",()=>{
  for(const budget of [-1,Infinity,NaN,3.5])
    assert.throws(()=>reserveSourceBytes([],budget),/budget/i);
  for(const size of [-1,undefined,Number.MAX_SAFE_INTEGER+1])
    assert.throws(()=>reserveSourceBytes([m("x",size)],100),/size/i);
});
