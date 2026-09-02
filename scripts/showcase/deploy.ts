#!/usr/bin/env node

// Builds and directly deploys one persistent showcase instance in dependency order:
// gatekeepers first, then the backend, and the public router last.

import { spawn } from "node:child_process";
import { resolveBinEntry } from "../bin-entry.ts";
import { pnpmCommand } from "../pnpm-command.ts";
import { isGatekeeperPackage, type DeployablePackage } from "../release/manifest-lib.ts";
import {
  cleanShowcaseConfigs,
  generateShowcaseConfigs,
  resolveShowcaseTarget,
  SHOWCASE_CONFIG_NAME,
} from "./config.ts";
import { ROOT } from "../preview/staging-config.ts";

const GATEKEEPER_CONCURRENCY = 8;

function run(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: "inherit" });
    child.once("error", reject);
    child.once("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

async function mapWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  work: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  let firstError: unknown;
  async function worker() {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      try {
        await work(item);
      } catch (error) {
        firstError ??= error;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  if (firstError !== undefined) throw firstError;
}

function deploymentTiers(packages: readonly DeployablePackage[]): {
  gatekeepers: DeployablePackage[];
  backend: DeployablePackage;
  router: DeployablePackage;
} {
  const named = (name: string) => {
    const pkg = packages.find(candidate => candidate.name === name);
    if (!pkg) throw new Error(`Missing deployable package: ${name}`);
    return pkg;
  };
  return {
    gatekeepers: packages.filter(pkg => isGatekeeperPackage(pkg.name))
      .toSorted((left, right) => left.name.localeCompare(right.name)),
    backend: named("workshop-backend"),
    router: named("router"),
  };
}

async function deployPackage(pkg: DeployablePackage, dryRun: boolean): Promise<void> {
  console.log(`\nDeploying ${pkg.name}${dryRun ? " (dry run)" : ""}...`);
  const entry = resolveBinEntry(ROOT, "wrangler");
  const wrangler = entry
    ? [process.execPath, [entry]] as const
    : pnpmCommand(["exec", "wrangler"]);
  await run(wrangler[0], [
    ...wrangler[1],
    "deploy",
    "--config",
    SHOWCASE_CONFIG_NAME,
    ...(dryRun ? ["--dry-run"] : []),
  ], { cwd: pkg.dir });
}

async function main(): Promise<void> {
  const unknown = process.argv.slice(2).filter(arg => arg !== "--" && arg !== "--dry-run");
  if (unknown.length > 0) throw new Error(`Unknown argument: ${unknown[0]}`);
  const dryRun = process.argv.includes("--dry-run");
  const target = resolveShowcaseTarget();
  const origin = `https://${target.domain}`;

  console.log(`\nShowcase target: ${origin}`);

  cleanShowcaseConfigs();
  const build = pnpmCommand(["run", "build"]);
  await run(build[0], build[1], {
    cwd: ROOT,
    env: { ...process.env, VITE_CF_ACCESS_MODE: "false" },
  });

  try {
    const { packages, configs } = generateShowcaseConfigs(target);
    const { gatekeepers, backend, router } = deploymentTiers(packages);
    console.log(`Workers: ${configs.size} (${gatekeepers.length} gatekeepers + backend + router)`);

    await mapWithConcurrency(
      gatekeepers,
      GATEKEEPER_CONCURRENCY,
      pkg => deployPackage(pkg, dryRun),
    );
    await deployPackage(backend, dryRun);
    await deployPackage(router, dryRun);
  } finally {
    cleanShowcaseConfigs();
  }

  console.log(dryRun
    ? `\nDry run complete for ${origin}.`
    : `\nShowcase deployed to ${origin}.`);
}

await main();
