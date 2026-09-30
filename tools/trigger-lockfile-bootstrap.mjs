import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const ghCommand = process.platform === "win32" ? "gh.exe" : "gh";

function capture(command, args) {
  return String(
    execFileSync(command, args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    }),
  ).trim();
}

const probe = spawnSync(ghCommand, ["--version"], {
  cwd: root,
  encoding: "utf8",
  shell: false,
});
if (probe.status !== 0 || probe.error) {
  console.error(
    "GitHub CLI (gh) is required. Install it and authenticate with: gh auth login",
  );
  process.exit(127);
}

const auth = spawnSync(ghCommand, ["auth", "status"], {
  cwd: root,
  encoding: "utf8",
  shell: false,
});
if (auth.status !== 0) {
  console.error(
    "GitHub CLI is not authenticated. Run: gh auth login",
  );
  process.exit(1);
}

const branch =
  process.env.DOCUMINT_BOOTSTRAP_REF?.trim() ||
  capture("git", ["branch", "--show-current"]);

if (!branch) {
  console.error(
    "Unable to determine the current branch. Set DOCUMINT_BOOTSTRAP_REF explicitly.",
  );
  process.exit(1);
}

const repository =
  process.env.DOCUMINT_BOOTSTRAP_REPO?.trim() ||
  manifest.repository?.url?.replace(/^git\+/, "").replace(/\.git$/, "");

if (!repository) {
  console.error(
    "Unable to determine repository URL. Set DOCUMINT_BOOTSTRAP_REPO=owner/repo.",
  );
  process.exit(1);
}

const repoArg = repository.includes("github.com/")
  ? repository.split("github.com/").pop()
  : repository;

const workflow = "lockfile-bootstrap.yml";
console.log(
  `Triggering ${workflow} on ${repoArg}@${branch} with run_readiness=true...`,
);

execFileSync(
  ghCommand,
  [
    "workflow",
    "run",
    workflow,
    "--repo",
    repoArg,
    "--ref",
    branch,
    "-f",
    "run_readiness=true",
  ],
  {
    cwd: root,
    stdio: "inherit",
    shell: false,
  },
);

console.log(
  `Triggered successfully. Watch it with: gh run watch --repo ${repoArg}`,
);
