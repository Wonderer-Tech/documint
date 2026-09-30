import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const scriptArgs = process.argv.slice(2);
if (!scriptArgs.length) {
  console.error("Usage: node tools/run-python.mjs <script> [...args]");
  process.exit(2);
}

const configured = process.env.DOCUMINT_PYTHON?.trim();
const preferredVenvPython =
  process.platform === "win32"
    ? undefined
    : join(homedir(), ".venvs", "documint-browser", "bin", "python");

const candidates = configured
  ? [{ command: configured, prefix: [] }]
  : process.platform === "win32"
    ? [
        { command: "py", prefix: ["-3"] },
        { command: "python", prefix: [] },
        { command: "python3", prefix: [] },
      ]
    : [
        ...(preferredVenvPython && existsSync(preferredVenvPython)
          ? [{ command: preferredVenvPython, prefix: [] }]
          : []),
        { command: "python3", prefix: [] },
        { command: "python", prefix: [] },
      ];

function probe(candidate) {
  const result = spawnSync(
    candidate.command,
    [...candidate.prefix, "-c", "import sys; print(sys.executable)"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: false,
    },
  );

  return result.status === 0 && !result.error;
}

function resolveBrowserExecutable() {
  const configuredBrowser = process.env.CHROMIUM_EXECUTABLE?.trim();
  if (configuredBrowser) {
    return existsSync(configuredBrowser) ? configuredBrowser : undefined;
  }

  if (process.platform === "win32") return undefined;

  for (const command of [
    "chromium",
    "chromium-browser",
    "brave-browser",
    "brave",
    "google-chrome",
    "google-chrome-stable",
  ]) {
    const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: false,
    });
    const resolved = result.status === 0 ? result.stdout.trim() : "";
    if (resolved && existsSync(resolved)) return resolved;
  }

  return undefined;
}

const selected = candidates.find(probe);
if (!selected) {
  console.error(
    configured
      ? `Configured Python executable is unavailable: ${configured}`
      : "Python 3 was not found. Install Python 3 or set DOCUMINT_PYTHON.",
  );
  process.exit(127);
}

const browserExecutable = resolveBrowserExecutable();
const childEnv = {
  ...process.env,
  ...(browserExecutable && !process.env.CHROMIUM_EXECUTABLE
    ? { CHROMIUM_EXECUTABLE: browserExecutable }
    : {}),
};

const result = spawnSync(
  selected.command,
  [...selected.prefix, ...scriptArgs],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    env: childEnv,
    shell: false,
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
