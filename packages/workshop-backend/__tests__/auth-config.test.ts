import { describe, expect, it } from "vitest";
import { arePublicSignupsEnabled, canProvisionAccount } from "../src/auth/config";

function env(values: Partial<Cloudflare.Env> = {}): Cloudflare.Env {
  return values as Cloudflare.Env;
}

function request(token?: string): Request {
  return new Request("https://os.example.com/api", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

describe("production account provisioning", () => {
  it("hard-disables public signups without changing the stored admin setting", () => {
    expect(arePublicSignupsEnabled(env(), true)).toBe(true);
    expect(arePublicSignupsEnabled(env({ DISABLE_PUBLIC_SIGNUPS: "true" }), true)).toBe(false);
    expect(arePublicSignupsEnabled(env({ DISABLE_PUBLIC_SIGNUPS: "false" }), false)).toBe(false);
  });

  it("accepts only the configured bearer token", async () => {
    const configured = env({ ACCOUNT_PROVISIONING_TOKEN: "correct-token" });

    await expect(canProvisionAccount(request("correct-token"), configured)).resolves.toBe(true);
    await expect(canProvisionAccount(request("wrong-token"), configured)).resolves.toBe(false);
    await expect(canProvisionAccount(request(), configured)).resolves.toBe(false);
    await expect(canProvisionAccount(request("correct-token"), env())).resolves.toBe(false);
  });
});
