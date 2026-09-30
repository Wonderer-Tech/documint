import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeSourcePathSegment,
  relativeSourceHref,
} from "../src/services/sourceLink";

test("source links encode Markdown-sensitive path characters", () => {
  assert.equal(encodeSourcePathSegment("hello world.ts"), "hello%20world.ts");
  assert.equal(encodeSourcePathSegment("(internal)"), "%28internal%29");
  assert.equal(encodeSourcePathSegment("[slug]"), "%5Bslug%5D");
  assert.equal(encodeSourcePathSegment("hash#name.ts"), "hash%23name.ts");
});

test("relative source links normalize separators and preserve line anchors", () => {
  assert.equal(
    relativeSourceHref("src\\app\\(internal)\\[slug]\\hello world.ts", 42),
    "../src/app/%28internal%29/%5Bslug%5D/hello%20world.ts#L42",
  );
});
