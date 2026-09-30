import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { validateLockfileData } from "./lockfile-policy.mjs";

const root = resolve(process.cwd());
const packageJsonPath = resolve(root, "package.json");
const requestedPath = process.argv[2]
  ? resolve(root, process.argv[2])
  : resolve(root, "package-lock.json");
const lockfilePath = statSync(requestedPath).isDirectory()
  ? resolve(requestedPath, "package-lock.json")
  : requestedPath;

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const packageLock = JSON.parse(readFileSync(lockfilePath, "utf8"));
const result = validateLockfileData(packageJson, packageLock);

console.log(
  JSON.stringify(
    {
      ...result,
      path: lockfilePath,
    },
    null,
    2,
  ),
);
