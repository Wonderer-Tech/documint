import { spawnSync } from "node:child_process";

const scriptArgs = process.argv.slice(2);
if (!scriptArgs.length) {
  console.error("Usage: node tools/run-python.mjs <script> [...args]");
  process.exit(2);
}

const configured = process.env.DOCUMINT_PYTHON?.trim();
const candidates = configured
  ? [{ command: configured, prefix: [] }]
  : process.platform === "win32"
    ? [
        { command: "py", prefix: ["-3"] },
        { command: "python", prefix: [] },
        { command: "python3", prefix: [] },
      ]
    : [
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

const selected = candidates.find(probe);
if (!selected) {
  console.error(
    configured
      ? `Configured Python executable is unavailable: ${configured}`
      : "Python 3 was not found. Install Python 3 or set DOCUMINT_PYTHON.",
  );
  process.exit(127);
}

const result = spawnSync(
  selected.command,
  [...selected.prefix, ...scriptArgs],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
    shell: false,
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
