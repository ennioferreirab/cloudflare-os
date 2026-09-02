// Configuration for sign-in via authentication gatekeepers (an optional, additive login feature).
//
// Authentication is provided by gatekeepers (e.g. "google", "github", "cloudflare") that advertise
// `providesAuth`. A deployment opts specific gatekeepers into the login UI via the AUTH_GATEKEEPERS
// allowlist (comma-separated vendor ids). When set, each listed, auth-capable gatekeeper gets a
// "Continue with ..." button alongside the normal username/password form (unless password auth is
// disabled). All OFF by default.

/**
 * Parse the AUTH_GATEKEEPERS allowlist into a list of gatekeeper vendor ids (lowercased). These are
 * the gatekeepers permitted to drive sign-in; a vendor must also actually advertise `providesAuth`
 * to be offered. Empty when unset.
 */
export function getAuthGatekeeperAllowlist(env: Cloudflare.Env): string[] {
  const raw = (env as { AUTH_GATEKEEPERS?: string }).AUTH_GATEKEEPERS;
  if (!raw) return [];
  return raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
}

/** Whether the deployment has opted any gatekeeper into sign-in. */
export function hasAuthGatekeepers(env: Cloudflare.Env): boolean {
  return getAuthGatekeeperAllowlist(env).length > 0;
}

/**
 * Whether username/password login + signup is available. Enabled by default. An installation can
 * set DISABLE_PASSWORD_AUTH=true to be OAuth-only — but that only takes effect when at least one
 * auth gatekeeper is allowlisted, otherwise we'd lock everyone out, so password auth stays on.
 */
export function isPasswordAuthEnabled(env: Cloudflare.Env): boolean {
  if (env.DISABLE_PASSWORD_AUTH !== "true") return true;
  return !hasAuthGatekeepers(env);
}

/**
 * Whether the public application may create new accounts. The deployment-level switch is a hard
 * override for production; the admin setting remains useful in deployments that do not set it.
 */
export function arePublicSignupsEnabled(
    env: Cloudflare.Env, adminSetting: boolean): boolean {
  return env.DISABLE_PUBLIC_SIGNUPS !== "true" && adminSetting;
}

/**
 * Whether this request carries the deployment's account-provisioning bearer token. Both values are
 * hashed before comparison so attacker-controlled token lengths do not create a timing oracle.
 */
export async function canProvisionAccount(req: Request, env: Cloudflare.Env): Promise<boolean> {
  const expected = env.ACCOUNT_PROVISIONING_TOKEN;
  const authorization = req.headers.get("Authorization");
  if (!expected || !authorization?.startsWith("Bearer ")) return false;

  const supplied = authorization.slice("Bearer ".length);
  if (!supplied) return false;

  const encoder = new TextEncoder();
  const [suppliedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(suppliedHash, expectedHash);
}
