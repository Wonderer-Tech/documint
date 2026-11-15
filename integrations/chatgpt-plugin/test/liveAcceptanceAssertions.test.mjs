import test from "node:test";
import assert from "node:assert/strict";
import { assertLiveOverview, assertLiveFile, assertLiveMarkdown } from "../smoke/liveAcceptanceAssertions.mjs";
const SHA="a".repeat(40), repository="Wonderer-Tech/documint";
const path="src/analyzer/sourceAnalyzer.ts";
const base=()=>({
  repository,sourceUrl:"https://github.com/"+repository,branch:"main",
  commitSha:SHA,treeSha:"b".repeat(40),
  revisionUrl:"https://github.com/"+repository+"/tree/"+SHA,
  coverage:{selected:10,fetched:10,eligibleSourceFiles:103,
    omittedByFileLimit:93,failedToFetch:0,omittedByByteLimit:0,complete:false},
  caution:"PARTIAL SAMPLE",
});
const reply=(content)=>({structuredContent:content,content:[{type:"text",text:JSON.stringify(content)}]});
const overview=()=>reply({...base(),overview:{analyzedFiles:10,totalLines:120,modules:[]},analyzedPaths:[path]});
const file=()=>reply({...base(),file:{path,language:"typescript",lineCount:130,symbols:[],imports:[]}});
const markdown=()=>reply({...base(),markdown:"# DocuMint\n\nProject overview",documentTruncated:false,fullMarkdownCharacters:28});
const opts={repository,maxFiles:10};
test("accepts valid bounded partial repository analysis",()=>assert.equal(assertLiveOverview(overview(),opts).overview.analyzedFiles,10));
test("fails closed on tool error or invalid JSON",()=>{
  assert.throws(()=>assertLiveOverview({isError:true,content:[{type:"text",text:"bad"}]},opts),/tool error/i);
  assert.throws(()=>assertLiveOverview({content:[{type:"text",text:"invalid"}]},opts),/invalid tool result/i);
});
test("rejects wrong repository, SHA and revision URL",()=>{
  const a=overview();a.structuredContent.repository="fake/repo";
  assert.throws(()=>assertLiveOverview(a,opts),/repository/i);
  const b=overview();b.structuredContent.commitSha="bad";
  assert.throws(()=>assertLiveOverview(b,opts),/commit SHA/i);
  const c=overview();c.structuredContent.revisionUrl="https://github.com/fake/repo";
  assert.throws(()=>assertLiveOverview(c,opts),/revision URL/i);
});
test("rejects false completeness and missing omission evidence",()=>{
  const a=overview();a.structuredContent.coverage.complete=true;
  assert.throws(()=>assertLiveOverview(a,opts),/partial/i);
  const b=overview();b.structuredContent.coverage.omittedByFileLimit=0;
  assert.throws(()=>assertLiveOverview(b,opts),/omission/i);
});
test("explained file must match exact requested source path",()=>{
  assert.equal(assertLiveFile(file(),{...opts,filePath:path}).file.path,path);
  const a=file();a.structuredContent.file.path="src/wrong.ts";
  assert.throws(()=>assertLiveFile(a,{...opts,filePath:path}),/file path/i);
});
test("markdown is non-empty, bounded and counts characters",()=>{
  assert.match(assertLiveMarkdown(markdown(),{...opts,maxChars:5000}).markdown,/DocuMint/);
  const a=markdown();a.structuredContent.markdown="";
  assert.throws(()=>assertLiveMarkdown(a,{...opts,maxChars:5000}),/Markdown/i);
  const b=markdown();b.structuredContent.markdown="x".repeat(5100);
  assert.throws(()=>assertLiveMarkdown(b,{...opts,maxChars:5000}),/Markdown/i);
});
test("text-only MCP results are supported",()=>{
  const a=overview();delete a.structuredContent;
  assert.equal(assertLiveOverview(a,opts).repository,repository);
});
test("a default branch advancing between calls is not mistaken for one mixed scan",()=>{
  const a=overview();a.structuredContent.commitSha="c".repeat(40);
  a.structuredContent.revisionUrl="https://github.com/"+repository+"/tree/"+a.structuredContent.commitSha;
  assert.equal(assertLiveOverview(a,opts).commitSha,"c".repeat(40));
});
