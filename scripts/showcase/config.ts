#!/usr/bin/env node

// Generates direct-deploy Wrangler configs for one persistent showcase instance. This is separate
// from both customer releases and throwaway PR previews: stable Worker names let Wrangler keep the
// automatically provisioned KV/R2 resources attached across every deployment from main.

import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  gatekeeperShortName,
  isGatekeeperPackage,
  readDeployablePackages,
  type DeployablePackage,
  type ServiceBinding,
} from "../release/manifest-lib.ts";
import {
  buildPreviewConfigs,
  PACKAGES_DIR,
  type StagingConfig,
} from "../preview/staging-config.ts";

/** Generated config name, written beside each package's checked-in Wrangler config. */
export const SHOWCASE_CONFIG_NAME = "wrangler.showcase.jsonc";

/** Stable prefix used unless the deployment explicitly supplies another one. */
export const DEFAULT_SHOWCASE_WORKER_PREFIX = "scaleos-showcase";

/** Values that identify one persistent showcase deployment. */
export interface ShowcaseTarget {
  accountId: string;
  domain: string;
  workerPrefix: string;
}

/** Resolve and validate the deployment target without guessing an account or domain. */
export function resolveShowcaseTarget({
  accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
  domain: rawDomain = process.env.SHOWCASE_DOMAIN,
  workerPrefix: rawWorkerPrefix = process.env.SHOWCASE_WORKER_PREFIX ??
    DEFAULT_SHOWCASE_WORKER_PREFIX,
}: {
  accountId?: string;
  domain?: string;
  workerPrefix?: string;
} = {}): ShowcaseTarget {
  const domain = rawDomain?.trim().toLowerCase() ?? "";
  const workerPrefix = rawWorkerPrefix.trim().toLowerCase();
  const hostname = new RegExp(
    "^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+" +
      "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$",
  );

  if (!accountId) throw new Error("CLOUDFLARE_ACCOUNT_ID is required for showcase deployment.");
  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID must be a 32-character Cloudflare account ID.");
  }
  if (!hostname.test(domain)) {
    throw new Error("SHOWCASE_DOMAIN must be a hostname such as os.example.com.");
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(workerPrefix)) {
    throw new Error("SHOWCASE_WORKER_PREFIX may contain only lowercase letters, numbers and hyphens.");
  }

  return { accountId, domain, workerPrefix };
}

/** Name one Worker without allowing the deployment prefix to exceed Cloudflare's 63-byte limit. */
export function showcaseWorkerName(packageName: string, workerPrefix: string): string {
  const name = `${workerPrefix}-${packageName}`;
  if (name.length > 63) {
    throw new Error(`Showcase Worker name is too long (${name.length}/63): ${name}`);
  }
  return name;
}

function rewriteServices(
  services: ServiceBinding[] | undefined,
  workerPrefix: string,
  origin: string,
): ServiceBinding[] | undefined {
  return services?.map(service => ({
    ...service,
    service: showcaseWorkerName(service.service, workerPrefix),
    ...(service.service === "gatekeeper-context" && service.entrypoint === "GatekeeperVendor"
      ? { props: { ...service.props, sharingDomain: origin } }
      : {}),
  }));
}

/** Build concrete, persistent configs for every deployable package. */
export function buildShowcaseConfigs({
  packages,
  target,
}: {
  packages: readonly DeployablePackage[];
  target: ShowcaseTarget;
}): Map<string, StagingConfig> {
  const origin = `https://${target.domain}`;

  // The baseline half of the preview generator already performs the two easy-to-miss operations:
  // it strips account-specific resource IDs for safe auto-provisioning and constructs the complete
  // router/backend/gatekeeper topology. Discard the preview half and resolve persistent identity.
  const baselines = buildPreviewConfigs({
    previewName: "showcase",
    packages,
    accountId: target.accountId,
    workersDevHost: "showcase.invalid",
  });

  const configs = new Map<string, StagingConfig>();
  for (const pkg of packages) {
    const baseline = baselines.get(pkg.name);
    if (!baseline) throw new Error(`No baseline config generated for ${pkg.name}.`);
    const config = structuredClone(baseline);

    delete config.previews;
    delete config.routes;
    config.name = showcaseWorkerName(pkg.name, target.workerPrefix);
    config.workers_dev = false;
    config.preview_urls = false;
    config.services = rewriteServices(config.services, target.workerPrefix, origin);

    if (isGatekeeperPackage(pkg.name)) {
      config.vars = {
        ...config.vars,
        BASE_URL: `${origin}/gatekeeper/${gatekeeperShortName(pkg.name)}`,
      };
    } else if (pkg.name === "workshop-backend") {
      config.vars = { ...config.vars, PUBLIC_BASE_URL: origin };
    } else if (pkg.name === "router") {
      config.routes = [{ pattern: target.domain, custom_domain: true }];
    } else {
      throw new Error(`Cannot build a showcase config for package: ${pkg.name}`);
    }

    configs.set(pkg.name, config);
  }

  return configs;
}

/** Remove generated configs so they never perturb the workspace build fingerprint. */
export function cleanShowcaseConfigs(
  packages: readonly DeployablePackage[] = readDeployablePackages(PACKAGES_DIR),
): void {
  for (const pkg of packages) {
    rmSync(join(pkg.dir, SHOWCASE_CONFIG_NAME), { force: true });
  }
}

/** Generate every per-package config on disk and return the deployment plan. */
export function generateShowcaseConfigs(target = resolveShowcaseTarget()): {
  origin: string;
  packages: DeployablePackage[];
  configs: Map<string, StagingConfig>;
} {
  const packages = readDeployablePackages(PACKAGES_DIR);
  const configs = buildShowcaseConfigs({ packages, target });

  for (const pkg of packages) {
    const config = configs.get(pkg.name);
    if (!config) throw new Error(`No showcase config generated for ${pkg.name}.`);
    const path = join(pkg.dir, SHOWCASE_CONFIG_NAME);
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
    console.log(`generated: ${path}`);
  }

  return { origin: `https://${target.domain}`, packages, configs };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateShowcaseConfigs();
}
