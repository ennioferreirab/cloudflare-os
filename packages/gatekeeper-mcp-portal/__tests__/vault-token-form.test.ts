import { describe, expect, it } from "vitest";

import {
  parseVaultTokenInput,
  vaultTokenFormHtml,
} from "../src/vault-token-form.js";

function form(label: string, token: string): FormData {
  const result = new FormData();
  result.set("label", label);
  result.set("token", token);
  return result;
}

describe("ScaleOS Vault token form", () => {
  it("normalizes the public label and accepts a bounded token", () => {
    expect(parseVaultTokenInput(form("  Financeiro   Brasil  ", "  vault-secret  ")))
      .toEqual({
        ok: true,
        value: { label: "Financeiro Brasil", token: "vault-secret" },
      });
  });

  it("rejects missing or unsafe values without echoing the token", () => {
    expect(parseVaultTokenInput(form("", "vault-secret"))).toMatchObject({ ok: false });
    const invalid = parseVaultTokenInput(form("Financeiro", "bad\r\ntoken"));
    expect(invalid).toMatchObject({ ok: false });
    expect(JSON.stringify(invalid)).not.toContain("bad");
  });

  it("never renders a submitted token back into the page", () => {
    const html = vaultTokenFormHtml({
      actionUrl: "https://os.example/gatekeeper/mcp-portal/id/nonce",
      portalName: "ScaleOS Vault",
      label: "Financeiro <Brasil>",
      error: "O token informado não é válido.",
    });

    expect(html).toContain("Financeiro &lt;Brasil&gt;");
    expect(html).toContain('type="password"');
    expect(html).not.toContain("vault-secret");
  });
});
