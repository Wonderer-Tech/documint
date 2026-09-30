import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
);
const packageLock = JSON.parse(
  readFileSync(resolve(root, "package-lock.json"), "utf8"),
);

function stableEntries(value) {
  return Object.entries(value ?? {}).sort(([a], [b]) => a.localeCompare(b));
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(
      `${label} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertDependencyMap(label, actual, expected) {
  const actualEntries = stableEntries(actual);
  const expectedEntries = stableEntries(expected);
  const actualJson = JSON.stringify(actualEntries);
  const expectedJson = JSON.stringify(expectedEntries);

  if (actualJson !== expectedJson) {
    throw new Error(
      `${label} mismatch between package.json and package-lock.json root package`,
    );
  }
}

if (!Number.isInteger(packageLock.lockfileVersion) || packageLock.lockfileVersion < 2) {
  throw new Error(
    `Unsupported package-lock lockfileVersion: ${JSON.stringify(packageLock.lockfileVersion)}`,
  );
}

const rootPackage = packageLock.packages?.[""];
if (!rootPackage || typeof rootPackage !== "object") {
  throw new Error('package-lock.json is missing packages[""] root metadata');
}

assertEqual("package-lock name", packageLock.name, packageJson.name);
assertEqual("package-lock version", packageLock.version, packageJson.version);
assertEqual("root package name", rootPackage.name, packageJson.name);
assertEqual("root package version", rootPackage.version, packageJson.version);

for (const field of [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
]) {
  assertDependencyMap(field, rootPackage[field], packageJson[field]);
}

console.log(
  JSON.stringify(
    {
      valid: true,
      lockfileVersion: packageLock.lockfileVersion,
      name: packageLock.name,
      version: packageLock.version,
      rootDependencyCounts: {
        dependencies: stableEntries(packageJson.dependencies).length,
        devDependencies: stableEntries(packageJson.devDependencies).length,
        optionalDependencies: stableEntries(packageJson.optionalDependencies).length,
        peerDependencies: stableEntries(packageJson.peerDependencies).length,
      },
    },
    null,
    2,
  ),
);
