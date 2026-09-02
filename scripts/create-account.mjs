#!/usr/bin/env node

import { createRequire } from "node:module";

const requireFromFrontend = createRequire(
  new URL("../packages/workshop-frontend/package.json", import.meta.url),
);
const { newHttpBatchRpcSession } = requireFromFrontend("capnweb");
const { argon2id } = requireFromFrontend("hash-wasm");

// Protocol constant from workshop-shared/src/api.ts. Account login uses the same salt and params.
const SERVICE_SALT = new Uint8Array([
  0xd9, 0x4e, 0x54, 0x1d, 0x29, 0xc1, 0x03, 0x74,
  0x73, 0x7e, 0xb3, 0xe3, 0x34, 0x6d, 0x8f, 0x21,
]);

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? undefined : process.argv[index + 1];
}

function usage(exitCode = 1) {
  console.error(
    "Uso: pnpm account:create -- --username <nome> [--display-name <nome>] " +
      "[--url https://os.scaleos.pro] < senha",
  );
  process.exit(exitCode);
}

async function passwordFromStdin() {
  if (process.stdin.isTTY) {
    throw new Error("Envie a senha pela entrada padrão para que ela não apareça no histórico.");
  }
  let password = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) password += chunk;
  return password.replace(/[\r\n]+$/, "");
}

async function hashPassword(username, password) {
  const usernameBytes = new TextEncoder().encode(username);
  const salt = new Uint8Array(SERVICE_SALT.length + usernameBytes.length);
  salt.set(SERVICE_SALT);
  salt.set(usernameBytes, SERVICE_SALT.length);
  return argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 65536,
    hashLength: 32,
    outputType: "binary",
  });
}

async function main() {
  if (process.argv.includes("--help")) usage(0);

  const username = option("username")?.trim();
  const displayName = option("display-name")?.trim() || username;
  const baseUrl = option("url") ?? "https://os.scaleos.pro";
  const provisioningToken = process.env.ACCOUNT_PROVISIONING_TOKEN;
  if (!username || !displayName) usage();
  if (!provisioningToken) throw new Error("ACCOUNT_PROVISIONING_TOKEN não definido.");

  const endpoint = new URL("/api", baseUrl);
  if (endpoint.protocol !== "https:") throw new Error("A URL de produção precisa usar HTTPS.");
  const password = await passwordFromStdin();
  if (!password) throw new Error("A senha não pode ficar vazia.");

  const passwordHash = await hashPassword(username, password);
  const api = newHttpBatchRpcSession(new Request(endpoint, {
    headers: { Authorization: `Bearer ${provisioningToken}` },
  }));
  try {
    const sessionToken = await api.createAccount(username, displayName, passwordHash);
    if (sessionToken === null) throw new Error(`A conta "${username}" já existe.`);
  } finally {
    api[Symbol.dispose]();
  }

  console.log(`Conta "${username}" criada em ${endpoint.origin}.`);
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
