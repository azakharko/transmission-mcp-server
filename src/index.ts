#!/usr/bin/env node

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FastMCP } from "fastmcp";

const packageVersion = (
  createRequire(import.meta.url)("../package.json") as { version: string }
).version;
import { loadConfig } from "./config.js";
import { addTransmissionTools } from "./mcp/tools.js";
import { TransmissionRpcClient } from "./transmission/rpcClient.js";
import * as ops from "./transmission/operations.js";
import { normalizeDownloadPath } from "./validators/paths.js";

function logStartupWarning(payload: Record<string, unknown>): void {
  console.error(
    JSON.stringify({
      type: "transmission_mcp_warning",
      ts: new Date().toISOString(),
      ...payload,
    }),
  );
}

export function reportMainFailure(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exitCode = 1;
}

async function warnIfSessionDownloadDirMismatch(
  client: TransmissionRpcClient,
  allowlist: readonly string[],
): Promise<void> {
  try {
    const session = await ops.getSession(client);
    const dd = session["download-dir"];
    if (typeof dd !== "string") {
      return;
    }
    const normalized = normalizeDownloadPath(dd);
    if (!allowlist.includes(normalized)) {
      logStartupWarning({
        message: "Transmission session download-dir is not in the allowlist",
        transmissionDownloadDir: dd,
        allowlist,
      });
    }
  } catch (e) {
    logStartupWarning({
      message: "Could not read Transmission session for startup checks",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function main(): Promise<void> {
  const config = loadConfig();
  const client = new TransmissionRpcClient(
    {
      rpcUrl: config.rpcUrl,
      rpcUser: config.rpcUser,
      rpcPassword: config.rpcPassword,
      rpcTimeoutMs: config.rpcTimeoutMs,
    },
    globalThis.fetch,
  );

  await warnIfSessionDownloadDirMismatch(client, config.allowedDownloadDirs);

  const server = new FastMCP({
    name: "transmission-mcp-server",
    version: packageVersion as `${number}.${number}.${number}`,
    instructions:
      "Transmission BitTorrent MCP: list/add/start/stop/remove torrents and read session over loopback JSON-RPC. Requires allowlisted download directories; destructive removes need explicit confirmation.",
  });

  addTransmissionTools(server, client, config);

  await server.start({
    transportType: "stdio",
  });
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (typeof entry !== "string") {
    return false;
  }
  return path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url));
}

if (isMainModule()) {
  main().catch(reportMainFailure);
}
