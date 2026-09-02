import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isGatekeeperPackage,
  readDeployablePackages,
  type BindingDecl,
  type ServiceBinding,
} from "../release/manifest-lib.ts";
import { PACKAGES_DIR, type StagingConfig } from "../preview/staging-config.ts";
import {
  buildShowcaseConfigs,
  resolveShowcaseTarget,
  showcaseWorkerName,
} from "./config.ts";

const TARGET = {
  accountId: "0".repeat(32),
  domain: "os.example.com",
  workerPrefix: "scaleos-showcase",
};

function buildAll() {
  const packages = readDeployablePackages(PACKAGES_DIR);
  return { packages, configs: buildShowcaseConfigs({ packages, target: TARGET }) };
}

function resourceBindings(config: StagingConfig): BindingDecl[] {
  return [
    ...(config.kv_namespaces ?? []),
    ...(config.r2_buckets ?? []),
    ...(config.worker_loaders ?? []),
  ];
}

test("showcase target validation fails closed", () => {
  assert.deepEqual(resolveShowcaseTarget(TARGET), TARGET);
  assert.throws(() => resolveShowcaseTarget({ ...TARGET, accountId: "wrong" }),
      /32-character/);
  assert.throws(() => resolveShowcaseTarget({ ...TARGET, domain: "https://os.example.com" }),
      /hostname/);
  assert.throws(() => resolveShowcaseTarget({ ...TARGET, workerPrefix: "ScaleOS_showcase" }),
      /lowercase letters/);
});

test("showcase uses stable prefixed Worker names and no preview surface", () => {
  const { packages, configs } = buildAll();
  assert.equal(configs.size, packages.length);

  for (const [packageName, config] of configs) {
    assert.equal(config.name, showcaseWorkerName(packageName, TARGET.workerPrefix));
    assert.equal(config.account_id, TARGET.accountId);
    assert.equal(config.workers_dev, false);
    assert.equal(config.preview_urls, false);
    assert.equal(config.previews, undefined);
    if (packageName !== "router") assert.equal(config.routes, undefined);
  }
});

test("only the router owns the custom domain", () => {
  const { configs } = buildAll();
  const router = configs.get("router");
  assert.ok(router);
  assert.deepEqual(router.routes, [{ pattern: TARGET.domain, custom_domain: true }]);
  assert.deepEqual(router.services?.map(service => service.service), [
    showcaseWorkerName("workshop-backend", TARGET.workerPrefix),
    ...[...configs.keys()]
      .filter(isGatekeeperPackage)
      .toSorted()
      .map(name => showcaseWorkerName(name, TARGET.workerPrefix)),
  ]);
});

test("backend and gatekeepers use the custom origin and persistent service names", () => {
  const { packages, configs } = buildAll();
  const origin = `https://${TARGET.domain}`;
  const backend = configs.get("workshop-backend");
  assert.ok(backend);
  assert.equal(backend.vars?.PUBLIC_BASE_URL, origin);
  assert.deepEqual(backend.ai, { binding: "WORKERS_AI" });

  const gatekeepers = packages.filter(pkg => isGatekeeperPackage(pkg.name));
  for (const gatekeeper of gatekeepers) {
    const config = configs.get(gatekeeper.name);
    assert.ok(config);
    assert.ok(String(config.vars?.BASE_URL).startsWith(`${origin}/gatekeeper/`));
    const backendBinding: ServiceBinding | undefined = backend.services?.find(candidate =>
      candidate.service === showcaseWorkerName(gatekeeper.name, TARGET.workerPrefix));
    assert.ok(backendBinding, `backend does not bind ${gatekeeper.name}`);
    assert.equal(backendBinding.entrypoint, "GatekeeperVendor");
  }

  const context = backend.services?.find(service =>
    service.service === showcaseWorkerName("gatekeeper-context", TARGET.workerPrefix));
  assert.deepEqual(context?.props, { sharingDomain: origin });
});

test("stateful resources remain binding-only for automatic persistent provisioning", () => {
  const { configs } = buildAll();
  const resources = [...configs.values()].flatMap(resourceBindings);
  assert.ok(resources.length >= 4);
  for (const resource of resources) {
    assert.deepEqual(Object.keys(resource), ["binding"]);
  }
});

test("overlong Worker prefixes are rejected", () => {
  assert.throws(() => showcaseWorkerName("workshop-backend", "x".repeat(60)), /too long/);
});
