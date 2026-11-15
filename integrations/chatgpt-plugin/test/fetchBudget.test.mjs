import test from "node:test";
import assert from "node:assert/strict";
import { fetchPublicRepository } from "../repositoryFetch.mjs";
const sha="a".repeat(40);
const api="https://api.github.com/repos/example/project";
const raw="https://raw.githubusercontent.com/example/project/"+sha+"/";
test("collector skips network fetches that cannot fit total source-byte limit",async()=>{
  const size=120*1024;
  const tree=Array.from({length:40},(_,i)=>({
    path:"src/file"+String(i).padStart(2,"0")+".ts",type:"blob",mode:"100644",size
  }));
  const calls=[];
  const fetchImpl=async url=>{
    const href=String(url);calls.push(href);
    if(href===api)return Response.json({private:false,default_branch:"main"});
    if(href===api+"/git/ref/heads/main")return Response.json({object:{type:"commit",sha}});
    if(href===api+"/git/trees/"+sha+"?recursive=1")return Response.json({tree,sha,truncated:false});
    if(href.startsWith(raw))return new Response("export const value = 1;");
    return new Response("not found",{status:404});
  };
  const data=await fetchPublicRepository("example/project",{maxFiles:80,fetchImpl});
  const requests=calls.filter(url=>url.startsWith(raw));
  assert.equal(requests.length,Math.floor(4*1024*1024/size));
  assert.equal(data.coverage.omittedByByteLimit,40-requests.length);
  assert.equal(data.coverage.omittedByFileLimit,0);
  assert.equal(data.coverage.complete,false);
});
