import test from "node:test";
import assert from "node:assert/strict";
import { isTrustedHttpHost, parseAllowedHosts } from "../hostPolicy.mjs";
test("loopback hostnames allowed by default with numeric ports",()=>{
  const hosts=parseAllowedHosts(undefined);
  for(const h of ["localhost","localhost:8787","127.0.0.1","127.0.0.1:33891","[::1]","[::1]:8787"])
    assert.equal(isTrustedHttpHost(h,hosts),true,h);
});
test("DNS rebinding and malformed host headers rejected",()=>{
  const hosts=parseAllowedHosts(undefined);
  for(const h of ["evil.example","evil.example:443","127.0.0.1.evil.example","localhost.evil.example","",undefined,"localhost:abc","localhost:0","localhost:65536","localhost:443@evil.example"," localhost:8787","localhost:8787\nInjected: 1","[::1]:-1"])
    assert.equal(isTrustedHttpHost(h,hosts),false,String(h));
});
test("explicit tunnel hostname allowed but lookalikes refused",()=>{
  const hosts=parseAllowedHosts("mcp.example.net, localhost");
  assert.equal(isTrustedHttpHost("mcp.example.net",hosts),true);
  assert.equal(isTrustedHttpHost("MCP.EXAMPLE.NET:443",hosts),true);
  assert.equal(isTrustedHttpHost("other.example.net:443",hosts),false);
  assert.equal(isTrustedHttpHost("mcp.example.net.attacker.org",hosts),false);
});
test("invalid Host allowlist configuration is rejected",()=>{
  for(const h of ["*","https://mcp.example.net","example.com:8787","example.com,",",","127.0.0.1/foo","a.example.net\nevil.net"])
    assert.throws(()=>parseAllowedHosts(h),/host/i);
});
