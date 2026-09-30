import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { validateLockfileData } from "./lockfile-policy.mjs";

const root = resolve(process.cwd());
const packageJsonPath = resolve(root, "package.json");
const targetPath = resolve(root, "package-lock.json");
const input = process.argv[2];

if (!input) {
  console.error(
    "Usage: npm run lockfile:adopt -- /path/to/package-lock.json-or-artifact-directory",
  );
  process.exit(2);
}

const requestedPath = resolve(root, input);
if (!existsSync(requestedPath)) {
  throw new Error(`Lockfile artifact path does not exist: ${requestedPath}`);
}

const candidatePath = statSync(requestedPath).isDirectory()
  ? resolve(requestedPath, "package-lock.json")
  : requestedPath;

if (!existsSync(candidatePath)) {
  throw new Error(
    `No package-lock.json found at candidate path: ${candidatePath}`,
  );
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const candidateText = readFileSync(candidatePath, "utf8");
const candidateLock = JSON.parse(candidateText);
const validation = validateLockfileData(packageJson, candidateLock);
const candidateHash = createHash("sha256").update(candidateText).digest("hex");

const existingText = existsSync(targetPath)
  ? readFileSync(targetPath, "utf8")
  : undefined;
const existingHash = existingText
  ? createHash("sha256").update(existingText).digest("hex")
  : undefined;

if (existingHash === candidateHash) {
  console.log(
    JSON.stringify(
      {
        adopted: false,
        reason: "already-current",
        source: candidatePath,
        target: targetPath,
        sha256: candidateHash,
        validation,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const tempPath = resolve(
  dirname(targetPath),
  `.${basename(targetPath)}.documint-${process.pid}.tmp`,
);

try {
  writeFileSync(tempPath, candidateText);
  renameSync(tempPath, targetPath);
} finally {
  rmSync(tempPath, { force: true });
}

const adoptedText = readFileSync(targetPath, "utf8");
const adoptedHash = createHash("sha256").update(adoptedText).digest("hex");
if (adoptedHash !== candidateHash) {
  throw new Error(
    `Adopted package-lock checksum mismatch: expected ${candidateHash}, got ${adoptedHash}`,
  );
}

console.log(
  JSON.stringify(
    {
      adopted: true,
      source: candidatePath,
      target: targetPath,
      previousSha256: existingHash,
      sha256: adoptedHash,
      validation,
    },
    null,
    2,
  ),
);
