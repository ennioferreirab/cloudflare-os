import { escapeHtml, PAGE_STYLE } from "@gadgets/mcp-shared/html";

const MAX_VAULT_LABEL_LENGTH = 60;
const MAX_VAULT_TOKEN_LENGTH = 8192;

function hasAsciiControl(value: string): boolean {
  return [...value].some(char => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

/** Validated values submitted by the nonce-bound ScaleOS Vault connect form. */
export type VaultTokenInput = {
  /** Non-secret name shown in account, binding, and approval UI. */
  label: string;
  /** Bearer token kept only by the account Durable Object. */
  token: string;
};

/** A safe form-validation result that never echoes the submitted token. */
export type VaultTokenInputResult =
  | { ok: true; value: VaultTokenInput }
  | { ok: false; error: string; label: string };

/** Parses and bounds a Vault label and token without returning secret text in an error. */
export function parseVaultTokenInput(form: FormData): VaultTokenInputResult {
  const label = String(form.get("label") ?? "").replace(/\s+/g, " ").trim();
  const token = String(form.get("token") ?? "").trim();

  if (!label) return { ok: false, error: "Informe um nome para identificar este Vault.", label };
  if (label.length > MAX_VAULT_LABEL_LENGTH || hasAsciiControl(label)) {
    return {
      ok: false,
      error: `O nome deve ter no máximo ${MAX_VAULT_LABEL_LENGTH} caracteres.`,
      label: "",
    };
  }
  if (!token) return { ok: false, error: "Informe o token deste Vault.", label };
  if (token.length > MAX_VAULT_TOKEN_LENGTH || /[\r\n]/.test(token)) {
    return { ok: false, error: "O token informado não é válido.", label };
  }
  return { ok: true, value: { label, token } };
}

/** Renders the ScaleOS Vault connect page. The token is never rendered back into the response. */
export function vaultTokenFormHtml(options: {
  actionUrl: string;
  portalName: string;
  label?: string;
  error?: string;
}): string {
  const label = escapeHtml(options.label ?? "");
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'">
<title>Conectar ${escapeHtml(options.portalName)}</title>
<style>${PAGE_STYLE}
  :root { color-scheme: light; --brand: #2351ff; --contrast: #2351ff; }
  label { display: block; margin: 0 0 6px; color: var(--strong); font-size: 13px;
          font-weight: 600; }
  input { width: 100%; box-sizing: border-box; margin: 0 0 18px; padding: 10px 12px;
          border: 1px solid var(--line); border-radius: 8px; background: var(--control);
          color: var(--text); font: inherit; outline: none; }
  input:focus { border-color: var(--brand); box-shadow: 0 0 0 2px rgb(35 81 255 / 15%); }
  button { width: 100%; padding: 10px 14px; border: 0; border-radius: 8px;
           background: var(--contrast); color: var(--on-contrast); font: inherit;
           font-weight: 600; cursor: pointer; }
  .hint { margin: -12px 0 20px; color: var(--subtle); font-size: 12px; }
</style></head>
<body><main>
  <h1>Conectar ${escapeHtml(options.portalName)}</h1>
  <p class="sub">Cada token conecta um Vault. Depois você escolhe quais Vaults liberar para cada sessão.</p>
  ${options.error ? `<p class="err">${escapeHtml(options.error)}</p>` : ""}
  <form method="post" action="${escapeHtml(options.actionUrl)}" autocomplete="off">
    <label for="label">Nome do Vault</label>
    <input id="label" name="label" maxlength="${MAX_VAULT_LABEL_LENGTH}" required
           value="${label}" placeholder="Ex.: Financeiro" autofocus>
    <label for="token">Token do Vault</label>
    <input id="token" name="token" type="password" maxlength="${MAX_VAULT_TOKEN_LENGTH}"
           required spellcheck="false" autocomplete="new-password" placeholder="Cole o token aqui">
    <p class="hint">O token fica armazenado somente no conector e não é enviado ao Gadget.</p>
    <button type="submit">Conectar Vault</button>
  </form>
</main></body></html>`;
}
