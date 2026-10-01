import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import manifest from "../package.json";

function vscodeIgnoreLines(): Set<string> {
  return new Set(
    readFileSync(join(process.cwd(), ".vscodeignore"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#")),
  );
}

test("VSIX excludes bundled dependencies and development-only content", () => {
  const ignored = vscodeIgnoreLines();

  for (const path of [
    "node_modules/**",
    "src/**",
    "test/**",
    ".github/**",
    "docs/**",
    "documint/**",
    "coverage/**",
    "release-artifacts/**",
    "tools/**",
    "audit/**",
    "*.vsix",
    "*.tgz",
  ]) {
    assert.ok(ignored.has(path), `missing VSIX exclusion: ${path}`);
  }

  assert.ok(ignored.has("dist/**"));
  assert.ok(ignored.has("!dist/extension.js"));
  assert.equal(manifest.main, "./dist/extension.js");
  assert.equal(manifest.scripts["vscode:prepublish"], "npm run compile");
});

test("README-only media stays out of VSIX while runtime icons remain packageable", () => {
  const ignored = vscodeIgnoreLines();
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

  for (const media of [
    "resources/demo.gif",
    "resources/screenshot1.png",
    "resources/s2.png",
    "resources/s3.png",
    "resources/s4.png",
    "resources/Screenshot From 2026-10-01 12-18-49.png",
    "resources/Screenshot From 2026-10-01 12-19-21.png",
    "resources/Screenshot From 2026-10-01 12-20-05.png",
    "resources/Screenshot From 2026-10-01 12-20-27.png",
    "resources/Screenshot From 2026-10-01 12-20-38.png",
  ]) {
    assert.ok(ignored.has(media), `README-only media should be excluded: ${media}`);
  }

  for (const screenshot of [
    "Screenshot%20From%202026-10-01%2012-18-49.png",
    "Screenshot%20From%202026-10-01%2012-19-21.png",
    "Screenshot%20From%202026-10-01%2012-20-05.png",
    "Screenshot%20From%202026-10-01%2012-20-27.png",
    "Screenshot%20From%202026-10-01%2012-20-38.png",
  ]) {
    assert.ok(
      readme.includes(
        `https://raw.githubusercontent.com/Wonderer-Tech/documint/main/resources/${screenshot}`,
      ),
      `README should use current 1.0.8 screenshot: ${screenshot}`,
    );
  }

  for (const retainedMedia of [
    "resources/demo.gif",
    "resources/screenshot1.png",
  ]) {
    assert.ok(
      readme.includes(
        `https://raw.githubusercontent.com/Wonderer-Tech/documint/main/${retainedMedia}`,
      ),
      `README should retain current media: ${retainedMedia}`,
    );
  }

  for (const staleMedia of [
    "resources/s2.png",
    "resources/s3.png",
    "resources/s4.png",
  ]) {
    assert.equal(
      readme.includes(staleMedia),
      false,
      `README should not reference legacy media: ${staleMedia}`,
    );
  }

  assert.match(readme, /`documint\/documentation\.md`/);
  assert.match(readme, /`documint\/documentation\.html`/);
  assert.doesNotMatch(readme, /`docs\/documentation\.(?:md|html)`/);
  assert.doesNotMatch(
    readme,
    /Very large demo media can make the VSIX larger than the extension code itself\./,
  );
  assert.equal(manifest.icon, "resources/icon.png");
  assert.equal(
    manifest.contributes.viewsContainers.activitybar[0].icon,
    "resources/sidebar-icon.svg",
  );
  assert.equal(ignored.has("resources/icon.png"), false);
  assert.equal(ignored.has("resources/sidebar-icon.svg"), false);
});

test("README scanner extensions stay aligned with C and C++ header support", () => {
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

  assert.match(readme, /C \(`\.c`, `\.h`\)/);
  assert.match(readme, /C\+\+ \(`\.cc`, `\.cpp`, `\.cxx`, `\.hh`, `\.hpp`, `\.hxx`\)/);
  assert.match(readme, /C# \(`\.cs`\)/);
});

test("README project structure documents public facades and implementation modules", () => {
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

  for (const required of [
    "sourceAnalyzer.ts",
    "sourceAnalyzerBase.ts",
    "extension.ts",
    "extensionBase.ts",
    "openAICapabilities.ts",
    "anthropicCapabilities.ts",
    "deepSeekCapabilities.ts",
    "docGenerator.ts",
    "docGeneratorBase.ts",
    "generationCacheIdentity.ts",
  ]) {
    assert.ok(readme.includes(required), `README project structure missing ${required}`);
  }

  assert.doesNotMatch(readme, /extensionPolicy\.ts/);
  assert.match(
    readme,
    /The `\*Base\.ts` modules are implementation details\./,
  );
  assert.match(
    readme,
    /Runtime AI code should import the public facade modules/,
  );
});


test("release workflow publishes VSIX reproducibly as a tag asset without mutating main", () => {
  const workflow = readFileSync(
    join(process.cwd(), ".github/workflows/release.yml"),
    "utf8",
  );

  assert.match(workflow, /tags:\s*\n\s*- "v\*"/);
  assert.match(workflow, /test -f package-lock\.json/);
  assert.match(workflow, /npm ci --no-audit --no-fund/);
  assert.doesNotMatch(workflow, /npm install --no-audit --no-fund/);
  assert.match(workflow, /python -m playwright install --with-deps chromium/);
  assert.match(workflow, /npm run release:readiness/);
  assert.match(workflow, /documint-release-readiness/);
  assert.match(workflow, /release-artifacts\/readiness/);
  assert.match(workflow, /release-artifacts\/\*\.vsix/);
  assert.match(workflow, /gh release upload/);
  assert.match(workflow, /gh release create/);
  assert.doesNotMatch(workflow, /git\s+push/);
  assert.doesNotMatch(workflow, /git\s+add\s+-f/);
  assert.doesNotMatch(workflow, /HEAD:main/);
});


test("daily development check stays browser- and packaging-free", () => {
  assert.equal(
    manifest.scripts.check,
    "npm run typecheck && npm run test:unit",
  );
  assert.doesNotMatch(manifest.scripts.check, /test:browser|release:readiness|vsce|audit:self/);
});


test("unit test bundle runs outside node_modules", () => {
  const script = manifest.scripts["test:unit"];

  assert.match(
    script,
    /--outfile=test-results\/documint-regression\.test\.cjs/,
  );
  assert.match(
    script,
    /node --test \.\/test-results\/documint-regression\.test\.cjs/,
  );
  assert.doesNotMatch(script, /node --test node_modules\//);
});


test("release readiness command runs strict verification and writes measurable evidence", () => {
  const readiness = readFileSync(
    join(process.cwd(), "tools/release-readiness.mjs"),
    "utf8",
  );

  assert.equal(
    manifest.scripts["release:readiness"],
    "node tools/release-readiness.mjs",
  );
  assert.match(readiness, /package-lock\.json is required/);
  assert.match(readiness, /lockfile:validate/);
  assert.match(readiness, /evidence\.checks\.lockfileIdentity/);
  assert.match(readiness, /\["run", "verify"\]/);
  assert.match(readiness, /\["run", "test:browser"\]/);
  assert.match(readiness, /node_modules/);
  assert.match(readiness, /\.bin/);
  assert.match(readiness, /vsceCommand/);
  assert.match(readiness, /Local @vscode\/vsce binary is missing/);
  assert.match(
    readiness,
    /pythonRunner = join\(root, "tools", "run-python\.mjs"\)/,
  );
  assert.match(readiness, /Python Playwright\/browser runtime is unavailable/);
  assert.match(readiness, /CHROMIUM_EXECUTABLE/);
  assert.match(readiness, /DOCUMINT_PYTHON/);
  assert.match(readiness, /\.venvs/);
  assert.match(readiness, /documint-browser/);
  assert.match(readiness, /brave-browser/);
  assert.match(readiness, /chromium-browser/);
  assert.match(readiness, /discoverPythonExecutable/);
  assert.match(readiness, /discoverBrowserExecutable/);
  assert.match(readiness, /browserEnv/);
  assert.match(readiness, /executable_path/);
  assert.match(readiness, /system-executable/);
  assert.match(readiness, /playwright-managed/);
  assert.match(readiness, /evidence\.checks\.browserRuntime/);
  assert.match(readiness, /readiness\.json/);
  assert.match(readiness, /DOCUMINT_SELF_AUDIT_OUTPUT/);
  assert.match(readiness, /createHash\("sha256"\)/);
  assert.match(readiness, /DOCUMINT_BASELINE_VSIX/);
  assert.match(readiness, /deltaPercent/);
  assert.match(readiness, /reader-results\.json/);
  assert.match(readiness, /results\.json/);
  assert.match(readiness, /VSIX does not have a ZIP signature/);
  assert.match(readiness, /ZIP signature validation was used instead/);
});


test("lockfile adopter verifies Bootstrap SHA metadata when present", () => {
  const adopter = readFileSync(
    join(process.cwd(), "tools/adopt-lockfile.mjs"),
    "utf8",
  );

  assert.match(adopter, /package-lock\.sha256/);
  assert.match(adopter, /Lockfile artifact SHA-256 mismatch/);
  assert.match(adopter, /artifactSha256Verified/);
});


test("lockfile validator reuses the shared package-identity policy", () => {
  const validator = readFileSync(
    join(process.cwd(), "tools/validate-lockfile.mjs"),
    "utf8",
  );
  const policy = readFileSync(
    join(process.cwd(), "tools/lockfile-policy.mjs"),
    "utf8",
  );

  assert.equal(
    manifest.scripts["lockfile:validate"],
    "node tools/validate-lockfile.mjs",
  );
  assert.match(validator, /validateLockfileData/);
  assert.match(validator, /process\.argv\[2\]/);
  assert.match(validator, /statSync\(requestedPath\)\.isDirectory/);
  assert.match(policy, /lockfileVersion/);
  assert.match(policy, /packages\?\.\[""\]/);
  assert.match(policy, /package-lock name/);
  assert.match(policy, /root package version/);
  assert.match(policy, /assertDependencyMap/);
  assert.match(policy, /devDependencies/);
  assert.match(policy, /optionalDependencies/);
  assert.match(policy, /peerDependencies/);
});


test("lockfile artifact adoption validates before replacing the root lockfile", () => {
  assert.equal(
    manifest.scripts["lockfile:adopt"],
    "node tools/adopt-lockfile.mjs",
  );
  const sandbox = mkdtempSync(join(tmpdir(), "documint-lockfile-adopt-"));
  const artifact = join(sandbox, "artifact");
  mkdirSync(artifact);

  const packageJson = {
    name: "documint-fixture",
    version: "1.2.3",
    devDependencies: {
      typescript: "^5.3.3",
    },
  };
  const validLock = {
    name: packageJson.name,
    version: packageJson.version,
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: packageJson.name,
        version: packageJson.version,
        devDependencies: {
          typescript: "^5.3.3",
        },
      },
    },
  };

  writeFileSync(
    join(sandbox, "package.json"),
    JSON.stringify(packageJson, null, 2),
  );
  const writeArtifact = (lockfile: unknown, hashOverride?: string) => {
    const text = JSON.stringify(lockfile, null, 2) + "\n";
    writeFileSync(join(artifact, "package-lock.json"), text);
    const hash =
      hashOverride ??
      createHash("sha256").update(text).digest("hex");
    writeFileSync(
      join(artifact, "package-lock.sha256"),
      `${hash}  package-lock.json\n`,
    );
  };

  writeArtifact(validLock);

  try {
    const adopter = join(process.cwd(), "tools/adopt-lockfile.mjs");
    const first = execFileSync(process.execPath, [adopter, artifact], {
      cwd: sandbox,
      encoding: "utf8",
    });
    assert.match(first, /"adopted": true/);
    assert.ok(existsSync(join(sandbox, "package-lock.json")));

    const second = execFileSync(process.execPath, [adopter, artifact], {
      cwd: sandbox,
      encoding: "utf8",
    });
    assert.match(second, /"reason": "already-current"/);

    const original = readFileSync(join(sandbox, "package-lock.json"), "utf8");

    writeArtifact(validLock, "0".repeat(64));
    const badHash = spawnSync(process.execPath, [adopter, artifact], {
      cwd: sandbox,
      encoding: "utf8",
    });
    assert.notEqual(badHash.status, 0);
    assert.match(
      badHash.stderr,
      /Lockfile artifact SHA-256 mismatch/,
    );
    assert.equal(
      readFileSync(join(sandbox, "package-lock.json"), "utf8"),
      original,
      "checksum-mismatched artifact must not replace the root lockfile",
    );

    const stale = {
      ...validLock,
      version: "9.9.9",
      packages: {
        "": {
          ...validLock.packages[""],
          version: "9.9.9",
        },
      },
    };
    writeArtifact(stale);

    const rejected = spawnSync(process.execPath, [adopter, artifact], {
      cwd: sandbox,
      encoding: "utf8",
    });
    assert.notEqual(rejected.status, 0);
    assert.equal(
      readFileSync(join(sandbox, "package-lock.json"), "utf8"),
      original,
      "identity-mismatched artifact must not replace the existing root lockfile",
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});


test("lockfile validator is valid Node ESM syntax", () => {
  execFileSync(
    process.execPath,
    ["--check", join(process.cwd(), "tools/validate-lockfile.mjs")],
    { stdio: "pipe" },
  );
});


test("shared lockfile policy and adopter are valid Node ESM syntax", () => {
  for (const script of [
    "tools/lockfile-policy.mjs",
    "tools/adopt-lockfile.mjs",
  ]) {
    execFileSync(
      process.execPath,
      ["--check", join(process.cwd(), script)],
      { stdio: "pipe" },
    );
  }
});


test("release readiness runner is valid Node ESM syntax", () => {
  execFileSync(
    process.execPath,
    ["--check", join(process.cwd(), "tools/release-readiness.mjs")],
    { stdio: "pipe" },
  );
});


test("Python launcher prefers the DocuMint browser venv and reuses local Chromium", () => {
  const runner = readFileSync(
    join(process.cwd(), "tools/run-python.mjs"),
    "utf8",
  );

  assert.match(runner, /documint-browser/);
  assert.match(runner, /DOCUMINT_PYTHON/);
  assert.match(runner, /CHROMIUM_EXECUTABLE/);
  assert.match(runner, /chromium-browser/);
  assert.match(runner, /brave-browser/);
});

test("Python launcher is valid Node ESM syntax", () => {
  execFileSync(
    process.execPath,
    ["--check", join(process.cwd(), "tools/run-python.mjs")],
    { stdio: "pipe" },
  );
});


test("lockfile bootstrap dispatcher pins the manual workflow and readiness input", () => {
  const dispatcher = readFileSync(
    join(process.cwd(), "tools/trigger-lockfile-bootstrap.mjs"),
    "utf8",
  );

  assert.equal(
    manifest.scripts["lockfile:bootstrap"],
    "node tools/trigger-lockfile-bootstrap.mjs",
  );
  assert.match(dispatcher, /lockfile-bootstrap\.yml/);
  assert.match(dispatcher, /run_readiness=true/);
  assert.match(dispatcher, /gh auth login/);
  assert.match(dispatcher, /DOCUMINT_BOOTSTRAP_REF/);
  assert.match(dispatcher, /DOCUMINT_BOOTSTRAP_REPO/);
  assert.match(dispatcher, /workflow/);
  assert.match(dispatcher, /--ref/);
});


test("lockfile bootstrap dispatcher is valid Node ESM syntax", () => {
  execFileSync(
    process.execPath,
    ["--check", join(process.cwd(), "tools/trigger-lockfile-bootstrap.mjs")],
    { stdio: "pipe" },
  );
});


test("CI requires the committed lockfile and installs with npm ci only", () => {
  const workflow = readFileSync(
    join(process.cwd(), ".github/workflows/ci.yml"),
    "utf8",
  );

  assert.match(workflow, /npm ci --no-audit --no-fund/);
  assert.doesNotMatch(workflow, /npm install --no-audit --no-fund/);
  assert.doesNotMatch(workflow, /hashFiles\('package-lock\.json'\)/);
  assert.doesNotMatch(workflow, /package-lock\.json is missing/);
});
