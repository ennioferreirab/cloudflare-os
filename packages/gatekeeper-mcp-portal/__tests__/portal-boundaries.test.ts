import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { McpServerConfiguratorRpc } from
  "../src/configurator/server-configurator-types.js";

const mocks = vi.hoisted(() => ({ withClient: vi.fn() }));

vi.mock("capnweb-validate", () => ({
  validateRpc: () => (value: unknown) => value,
  skipRpcValidation: () => (value: unknown) => value,
}));

vi.mock("@gadgets/mcp-shared/connection", async importOriginal => ({
  ...await importOriginal<typeof import("@gadgets/mcp-shared/connection")>(),
  withClient: mocks.withClient,
}));

import portalHandler, {
  GatekeeperUserImpl,
  GatekeeperVendor,
  McpAccount,
  McpGatekeeperImpl,
} from "../src/portal.js";

const ENDPOINT = "https://gw.example.com/mcp";

type FakeClient = {
  callTool: ReturnType<typeof vi.fn>;
  listToolIndex: ReturnType<typeof vi.fn>;
  listMatchingToolSummaries: ReturnType<typeof vi.fn>;
};

function makeSubject(
  hiddenServerIds = "jira",
  auth = "oauth",
  vaultIdentity: { accountKey: string; credentialGeneration: number; label: string } | null = null,
): {
  user: GatekeeperUserImpl;
  client: FakeClient;
  gatekeeperFactory: ReturnType<typeof vi.fn>;
} {
  const client: FakeClient = {
    callTool: vi.fn(async () => ({
      isError: false,
      structuredContent: [
        { id: "jira", name: "Jira", enabled: true },
        { id: "gitlab", name: "GitLab", enabled: true },
      ],
    })),
    listToolIndex: vi.fn(),
    listMatchingToolSummaries: vi.fn(),
  };
  mocks.withClient.mockImplementation(async (...args: unknown[]) => {
    const callback = args[3] as (value: FakeClient) => unknown;
    return callback(client);
  });

  const account = {
    getServer: vi.fn(async () => ({
      endpoint: ENDPOINT,
      auth: auth === "vault-token" ? "token" : auth,
      provenance: "deployment",
      serverId: "portal",
      serverName: "CF Portal",
    })),
    getVaultIdentity: vi.fn(async () => vaultIdentity),
  };
  const gatekeeperFactory = vi.fn(() => ({ kind: "gatekeeper" }));
  const ctx = {
    props: { accountObjectId: "account-id" },
    exports: {
      McpAccount: {
        idFromString: vi.fn(() => "account-id"),
        get: vi.fn(() => account),
      },
      McpGatekeeperImpl: gatekeeperFactory,
    },
  };
  const env = {
    MCP_PORTAL_URL: ENDPOINT,
    MCP_PORTAL_NAME: auth === "vault-token" ? "ScaleOS Vault" : "CF Portal",
    MCP_PORTAL_AUTH: auth,
    MCP_PORTAL_HIDDEN_SERVER_IDS: hiddenServerIds,
  };
  return { user: new GatekeeperUserImpl(ctx as never, env as never), client, gatekeeperFactory };
}

async function configuratorFor(user: GatekeeperUserImpl): Promise<McpServerConfiguratorRpc> {
  const frame = await user.startResourceConfigurator("https://gw.example.com/*");
  return (frame.ui as unknown as { target: McpServerConfiguratorRpc }).target;
}

beforeEach(() => {
  mocks.withClient.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hidden portal server boundaries", () => {
  it("removes hidden servers from the configurator RPC result", async () => {
    const { user } = makeSubject();

    await expect((await configuratorFor(user)).listServerOptions()).resolves.toEqual([{
      value: "gitlab",
      title: "GitLab",
      meta: undefined,
    }]);
  });

  it("does not fetch portal data for a hidden server's tool options", async () => {
    const { user } = makeSubject();

    await expect((await configuratorFor(user)).listToolOptions("jira")).resolves.toEqual([]);
    expect(mocks.withClient).not.toHaveBeenCalled();
  });

  it("rejects a crafted hidden-server URL before fetching portal data", async () => {
    const { user } = makeSubject();

    await expect(user.getGatekeeperClassFor(`${ENDPOINT}#server=jira`))
      .rejects.toThrow(/available through its native connector instead/);
    expect(mocks.withClient).not.toHaveBeenCalled();
  });

  it("keeps an existing hidden-server facet usable", async () => {
    const ctx = {
      props: {
        accountObjectId: "account-id",
        endpoint: ENDPOINT,
        serverId: "portal",
        serverName: "CF Portal",
        scopeServerName: "Jira",
        scope: { serverId: "jira" },
      },
      storage: {
        kv: {
          get: vi.fn(() => ({
            tools: [{ name: "jira_search", annotations: { readOnlyHint: true } }],
            revision: "cached",
            fetchedAt: Date.now(),
            truncated: false,
          })),
          put: vi.fn(),
        },
        sql: {},
      },
      exports: {
        McpAccount: {
          idFromString: vi.fn(() => "account-id"),
          get: vi.fn(() => ({})),
        },
      },
    };
    const facet = new McpGatekeeperImpl(ctx as never, {
      MCP_PORTAL_HIDDEN_SERVER_IDS: "jira",
    } as never);

    await expect(facet.tools()).resolves.toMatchObject([{
      tool: { name: "jira_search" },
      mode: "read",
    }]);
    expect(mocks.withClient).not.toHaveBeenCalled();
  });
});

describe("per-Vault account boundary", () => {
  const identity = {
    accountKey: "account-public-key",
    credentialGeneration: 3,
    label: "Financeiro",
  };

  it("brands Vault-token mode with the canonical ScaleOS icon", async () => {
    const vendor = new GatekeeperVendor({} as never, {
      MCP_PORTAL_URL: ENDPOINT,
      MCP_PORTAL_NAME: "ScaleOS Vault",
      MCP_PORTAL_AUTH: "vault-token",
    } as never);

    await expect(vendor.describe()).resolves.toMatchObject({
      displayName: "ScaleOS Vault",
      logo: { url: "/assets/scaleos/brand/scaleos-icon-40.png" },
      color: "#ffffff",
    });
  });

  it("uses the ScaleOS icon without exposing the account key", async () => {
    const { user } = makeSubject("", "vault-token", identity);

    await expect(user.describe()).resolves.toEqual({
      displayName: "Financeiro",
      avatar: { url: "/assets/scaleos/brand/scaleos-icon-40.png" },
    });
  });

  it("pins the facet to the selected account and credential generation", async () => {
    const { user, client, gatekeeperFactory } = makeSubject("", "vault-token", identity);
    client.callTool.mockResolvedValue({
      isError: false,
      structuredContent: [{ id: "vault", name: "Vault", enabled: true }],
    });

    await user.getGatekeeperClassFor(`${ENDPOINT}#server=vault`);

    expect(gatekeeperFactory).toHaveBeenCalledWith({
      props: expect.objectContaining({
        accountObjectId: "account-id",
        vaultAccountKey: "account-public-key",
        vaultCredentialGeneration: 3,
        vaultLabel: "Financeiro",
      }),
    });
    expect(JSON.stringify(gatekeeperFactory.mock.calls)).not.toContain("token");
  });

  it("refuses a legacy deployment-token account after switching to Vault tokens", async () => {
    const { user } = makeSubject("", "vault-token", null);

    await expect(user.getGatekeeperClassFor(`${ENDPOINT}#server=vault`))
      .rejects.toThrow(/authentication changed/);
    expect(mocks.withClient).not.toHaveBeenCalled();
  });

  it("rejects a binding captured before the Vault token was replaced", async () => {
    const values = new Map<string, unknown>([["vaultCredential", {
      accountKey: "account-public-key",
      credentialGeneration: 4,
      label: "Financeiro",
      token: "current-secret",
    }]]);
    const ctx = {
      id: { toString: () => "account-id" },
      storage: {
        kv: {
          get: (key: string) => values.get(key),
          put: (key: string, value: unknown) => values.set(key, value),
          delete: (key: string) => values.delete(key),
        },
      },
    };
    const account = new McpAccount(ctx as never, {
      MCP_PORTAL_URL: ENDPOINT,
      MCP_PORTAL_AUTH: "vault-token",
    } as never);

    await expect(account.getVaultConnection(ENDPOINT, 3))
      .rejects.toThrow(/older Vault token/);
    expect(JSON.stringify(await account.getVaultIdentity())).not.toContain("current-secret");
  });
});

describe("Vault-token HTTP flow", () => {
  it("submits the bearer only to the account DO and never returns it in HTML", async () => {
    const account = {
      isAwaitingVaultToken: vi.fn(async () => true),
      getVaultIdentity: vi.fn(async () => null),
      beginVaultTokenConnect: vi.fn(async () => ({ kind: "done" as const })),
    };
    const objectId = "a".repeat(64);
    const nonce = "b".repeat(64);
    const ctx = {
      exports: {
        McpAccount: {
          idFromString: vi.fn(() => objectId),
          get: vi.fn(() => account),
        },
      },
    };
    const env = {
      BASE_URL: "https://os.example/gatekeeper/mcp-portal",
      MCP_PORTAL_URL: "https://vault.scaleos.pro/mcp",
      MCP_PORTAL_NAME: "ScaleOS Vault",
      MCP_PORTAL_AUTH: "vault-token",
    };
    const url = `${env.BASE_URL}/${objectId}/${nonce}`;
    const body = new URLSearchParams({ label: "Financeiro", token: "vault-secret" });

    const response = await portalHandler.fetch(
      new Request(url, { method: "POST", body }), env as never, ctx as never);

    expect(response.status).toBe(200);
    expect(account.beginVaultTokenConnect).toHaveBeenCalledWith(nonce, {
      label: "Financeiro",
      token: "vault-secret",
    });
    expect(await response.text()).not.toContain("vault-secret");
  });

  it("probes with the submitted bearer before publishing the account", async () => {
    const values = new Map<string, unknown>();
    const complete = vi.fn(async () => undefined);
    const authorizations: Array<string | null> = [];
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      authorizations.push(request.headers.get("Authorization"));
      const payload = await request.json() as { id?: string };
      if (!payload.id) return new Response(null, { status: 202 });
      return Response.json({
        jsonrpc: "2.0",
        id: payload.id,
        result: {
          protocolVersion: "2025-11-25",
          capabilities: { tools: {} },
          serverInfo: { name: "ScaleOS Vault", version: "1.0.0" },
        },
      });
    });

    const objectId = "c".repeat(64);
    const nonce = "d".repeat(64);
    const accountContext = {
      id: { toString: () => objectId },
      storage: {
        setAlarm: vi.fn(async () => undefined),
        deleteAlarm: vi.fn(async () => undefined),
        kv: {
          get: (key: string) => values.get(key),
          put: (key: string, value: unknown) => values.set(key, value),
          delete: (key: string) => values.delete(key),
        },
      },
      exports: {
        GatekeeperUserImpl: vi.fn(() => ({ kind: "vault-account" })),
      },
    };
    const env = {
      BASE_URL: "https://os.example/gatekeeper/mcp-portal",
      MCP_PORTAL_URL: "https://vault.scaleos.pro/mcp",
      MCP_PORTAL_NAME: "ScaleOS Vault",
      MCP_PORTAL_AUTH: "vault-token",
    };
    const account = new McpAccount(accountContext as never, env as never);
    await account.setCallback({ complete } as never, nonce);
    const routerContext = {
      exports: {
        McpAccount: {
          idFromString: vi.fn(() => objectId),
          get: vi.fn(() => account),
        },
      },
    };
    const body = new URLSearchParams({ label: "Comercial", token: "submitted-secret" });

    const response = await portalHandler.fetch(new Request(
      `${env.BASE_URL}/${objectId}/${nonce}`,
      { method: "POST", body },
    ), env as never, routerContext as never);

    expect(response.status).toBe(200);
    expect(authorizations).toEqual(["Bearer submitted-secret", "Bearer submitted-secret"]);
    expect(complete).toHaveBeenCalledOnce();
    expect(await account.getVaultIdentity()).toEqual({
      accountKey: expect.any(String),
      credentialGeneration: 1,
      label: "Comercial",
    });
    expect(JSON.stringify(await account.getVaultIdentity())).not.toContain("submitted-secret");
    expect(await response.text()).not.toContain("submitted-secret");
  });
});
