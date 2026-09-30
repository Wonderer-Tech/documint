import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const releaseRoot = join(root, "release-artifacts");
const evidenceRoot = join(releaseRoot, "readiness");
const selfAuditPath = join(evidenceRoot, "local-self-audit.json");
const readinessPath = join(evidenceRoot, "readiness.json");
const vsixPath = join(releaseRoot, `documint-${manifest.version}.vsix`);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const vsceCommand = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vsce.cmd" : "vsce",
);
const pythonRunner = join(root, "tools", "run-python.mjs");

function elapsedMs(startedAt) {
  return Math.round(Number(process.hrtime.bigint() - startedAt) / 10000) / 100;
}

function run(label, command, args, extraEnv = {}) {
  console.log(`\n==> ${label}`);
  const startedAt = process.hrtime.bigint();
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: process.platform === "win32",
  });
  return elapsedMs(startedAt);
}

function capture(command, args) {
  try {
    return String(
      execFileSync(command, args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        shell: process.platform === "win32",
      }),
    ).trim();
  } catch {
    return undefined;
  }
}

function readJson(path) {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function ensureZipLike(path) {
  const bytes = readFileSync(path);
  const signature = bytes.subarray(0, 4).toString("hex");
  if (!["504b0304", "504b0506", "504b0708"].includes(signature)) {
    throw new Error(`VSIX does not have a ZIP signature: ${signature}`);
  }

  const unzipAvailable =
    process.platform !== "win32" && Boolean(capture("unzip", ["-v"]));
  if (!unzipAvailable) {
    console.warn("unzip is unavailable; ZIP signature validation was used instead.");
    return "zip-signature";
  }

  run("Verify VSIX archive integrity", "unzip", ["-t", path]);
  return "unzip -t";
}

function relativePath(path) {
  return relative(root, path).replace(/\\/g, "/");
}

function writeEvidence(evidence) {
  mkdirSync(evidenceRoot, { recursive: true });
  writeFileSync(readinessPath, JSON.stringify(evidence, null, 2) + "\n");
}

rmSync(evidenceRoot, { recursive: true, force: true });
mkdirSync(evidenceRoot, { recursive: true });
mkdirSync(releaseRoot, { recursive: true });
rmSync(vsixPath, { force: true });

const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  package: {
    name: manifest.name,
    version: manifest.version,
  },
  git: {
    commit: capture("git", ["rev-parse", "HEAD"]),
  },
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  checks: {},
  artifacts: {},
  browser: {},
  passed: false,
};

let phase = "preflight";

try {
  if (!existsSync(join(root, "package-lock.json"))) {
    throw new Error(
      "package-lock.json is required. Generate it with npm run lockfile:generate on a registry-enabled checkout.",
    );
  }
  evidence.checks.packageLock = { passed: true };

  if (!existsSync(vsceCommand)) {
    throw new Error(
      "Local @vscode/vsce binary is missing. Install locked dependencies with npm ci first.",
    );
  }
  evidence.checks.localVsce = { passed: true };

  if (!existsSync(pythonRunner)) {
    throw new Error("Python launcher is missing: tools/run-python.mjs");
  }

  const browserProbe = capture(process.execPath, [
    pythonRunner,
    "-c",
    [
      "from playwright.sync_api import sync_playwright",
      "p=sync_playwright().start()",
      "b=p.chromium.launch(headless=True,args=['--no-sandbox'])",
      "b.close()",
      "p.stop()",
      "print('ok')",
    ].join(";"),
  ]);
  if (browserProbe !== "ok") {
    throw new Error(
      "Python Playwright/Chromium is unavailable. Install with: python -m pip install playwright && python -m playwright install chromium",
    );
  }
  evidence.checks.browserRuntime = { passed: true };

  phase = "verify";
  evidence.checks.verify = {
    passed: true,
    durationMs: run("Run unit/regression suite and Local self-audit", npmCommand, ["run", "verify"], {
      DOCUMINT_SELF_AUDIT_OUTPUT: selfAuditPath,
    }),
  };

  phase = "browser";
  evidence.checks.browser = {
    passed: true,
    durationMs: run("Run full generated-HTML browser acceptance", npmCommand, ["run", "test:browser"]),
  };

  phase = "package";
  evidence.checks.package = {
    passed: true,
    durationMs: run("Package VSIX", vsceCommand, [
      "package",
      "--out",
      vsixPath,
    ]),
  };

  if (!existsSync(vsixPath)) {
    throw new Error("VSIX packaging completed without producing the expected artifact.");
  }

  phase = "integrity";
  const integrityStarted = process.hrtime.bigint();
  const integrityMethod = ensureZipLike(vsixPath);
  evidence.checks.vsixIntegrity = {
    passed: true,
    method: integrityMethod,
    durationMs: elapsedMs(integrityStarted),
  };

  const bundlePath = join(root, "dist", "extension.js");
  evidence.artifacts.bundle = existsSync(bundlePath)
    ? {
        path: relativePath(bundlePath),
        bytes: statSync(bundlePath).size,
      }
    : undefined;

  evidence.artifacts.vsix = {
    path: relativePath(vsixPath),
    bytes: statSync(vsixPath).size,
    sha256: sha256(vsixPath),
  };

  const baselinePath = process.env.DOCUMINT_BASELINE_VSIX
    ? resolve(root, process.env.DOCUMINT_BASELINE_VSIX)
    : undefined;
  if (baselinePath && existsSync(baselinePath)) {
    const baselineBytes = statSync(baselinePath).size;
    evidence.artifacts.baselineVsix = {
      path: relativePath(baselinePath),
      bytes: baselineBytes,
      deltaBytes: evidence.artifacts.vsix.bytes - baselineBytes,
      deltaPercent:
        baselineBytes === 0
          ? undefined
          : Math.round(
              ((evidence.artifacts.vsix.bytes - baselineBytes) / baselineBytes) *
                10000,
            ) / 100,
    };
  }

  evidence.selfAudit = readJson(selfAuditPath);
  evidence.browser.navigation = readJson(
    join(root, "test-results", "navigation-browser", "results.json"),
  );
  evidence.browser.reader = readJson(
    join(root, "test-results", "navigation-browser", "reader-results.json"),
  );

  evidence.passed = true;
  writeEvidence(evidence);

  console.log("\nRelease readiness PASS");
  console.log(`Evidence: ${relativePath(readinessPath)}`);
  console.log(
    `VSIX: ${relativePath(vsixPath)} (${evidence.artifacts.vsix.bytes.toLocaleString()} bytes)`,
  );
} catch (error) {
  evidence.failedPhase = phase;
  evidence.failure =
    error instanceof Error ? error.message : String(error);
  writeEvidence(evidence);
  console.error(`\nRelease readiness FAILED during ${phase}: ${evidence.failure}`);
  console.error(`Evidence: ${relativePath(readinessPath)}`);
  process.exitCode = 1;
}
