import test from "node:test";
import assert from "node:assert/strict";
import { fetchPublicRepository } from "../repositoryFetch.mjs";
const api="https://api.github.com/repos/example/project";
const commit="a".repeat(40);
const source="export const value = 1;\n";
const sha="efeee5db16c087416d13e29bc506c998eeaf0827";
const raw="https://raw.githubusercontent.com/example/project/"+commit+"/";
function mock(corrupt){
  const tree=[
    {path:"src/index.ts",type:"blob",mode:"100644",size:source.length,sha},
    {path:"src/extra.ts",type:"blob",mode:"100644",size:source.length,sha},
  ];
  return async url=>{
    const u=String(url);
    if(u===api)return Response.json({private:false,default_branch:"main"});
    if(u===api+"/git/ref/heads/main")return Response.json({object:{type:"commit",sha:commit}});
    if(u===api+"/git/trees/"+commit+"?recursive=1")return Response.json({tree,sha:commit,truncated:false});
    if(u===raw+"src/index.ts")return new Response(source);
    if(u===raw+"src/extra.ts")return new Response(corrupt?"export const value = 2;\n":source);
    return new Response("missing",{status:404});
  };
}
test("mismatched raw blob is not analyzed and scan marked partial",async()=>{
  const d=await fetchPublicRepository("example/project",{maxFiles:10,fetchImpl:mock(true)});
  assert.deepEqual(d.files.map(x=>x.path),["src/index.ts"]);
  assert.equal(d.coverage.failedToFetch,1);
  assert.equal(d.coverage.complete,false);
});
test("valid raw Git blob SHAs retain complete coverage",async()=>{
  const d=await fetchPublicRepository("example/project",{maxFiles:10,fetchImpl:mock(false)});
  assert.deepEqual(d.files.map(x=>x.path),["src/extra.ts","src/index.ts"]);
  assert.equal(d.coverage.failedToFetch,0);
  assert.equal(d.coverage.complete,true);
});
