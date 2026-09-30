export function stableEntries(value) {
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
  const actualJson = JSON.stringify(stableEntries(actual));
  const expectedJson = JSON.stringify(stableEntries(expected));

  if (actualJson !== expectedJson) {
    throw new Error(
      `${label} mismatch between package.json and package-lock.json root package`,
    );
  }
}

export function validateLockfileData(packageJson, packageLock) {
  if (!packageLock || typeof packageLock !== "object") {
    throw new Error("package-lock.json must contain a JSON object");
  }

  if (
    !Number.isInteger(packageLock.lockfileVersion) ||
    packageLock.lockfileVersion < 2
  ) {
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

  return {
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
  };
}
