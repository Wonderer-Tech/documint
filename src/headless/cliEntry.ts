#!/usr/bin/env node
import { runCli } from "./documintCli";

void runCli(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
