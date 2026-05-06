import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { logMutation } from "../log/mutationLog.js";
import * as ops from "../transmission/operations.js";
import { TransmissionRpcClient, TransmissionRpcError } from "../transmission/rpcClient.js";
import { resolveEffectiveDownloadDir } from "../validators/paths.js";
import { assertDeleteLocalDataConfirmed } from "../validators/removeTorrent.js";
import { assertValidTorrentSource } from "../validators/torrentSource.js";

function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

function errorResult(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

export function registerTransmissionTools(
  mcp: McpServer,
  client: TransmissionRpcClient,
  config: AppConfig,
): void {
  mcp.registerTool(
    "transmission_list_torrents",
    {
      description:
        "List torrents in Transmission with id, name, status, progress, rates, sizes, and download directory.",
    },
    async () => {
      try {
        const args = await ops.listTorrents(client);
        return jsonResult(args);
      } catch (e) {
        if (e instanceof TransmissionRpcError) {
          return errorResult(
            `Failed to list torrents: ${e.message}${e.rpcMessage ? ` (${e.rpcMessage})` : ""}`,
          );
        }
        throw e;
      }
    },
  );

  mcp.registerTool(
    "transmission_add_torrent",
    {
      description:
        "Add a torrent from an http(s) .torrent URL or magnet link. download_dir must be allowlisted if multiple dirs are configured.",
      inputSchema: {
        url: z.string().describe("Torrent URL (http/https) or magnet:? link"),
        download_dir: z
          .string()
          .optional()
          .describe(
            "Absolute download directory (must be in TRANSMISSION_ALLOWED_DOWNLOAD_DIRS)",
          ),
      },
    },
    async (args) => {
      let downloadDir = "";
      try {
        const source = assertValidTorrentSource(args.url);
        downloadDir = resolveEffectiveDownloadDir({
          requested: args.download_dir,
          allowlist: config.allowedDownloadDirs,
          defaultDir: config.defaultDownloadDir,
        });
        const result = await ops.addTorrent(client, source, downloadDir);
        const id =
          (result["torrent-added"]?.["id"] as number | undefined) ??
          (result["torrent-duplicate"]?.["id"] as number | undefined);
        logMutation("add_torrent", {
          ok: true,
          sourceType: source.startsWith("magnet:") ? "magnet" : "url",
          download_dir: downloadDir,
          torrent_id: id,
          duplicate: result["torrent-duplicate"] !== undefined,
        });
        return jsonResult(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logMutation("add_torrent", {
          ok: false,
          download_dir: downloadDir || undefined,
          error: msg,
        });
        return errorResult(msg);
      }
    },
  );

  mcp.registerTool(
    "transmission_start_torrent",
    {
      description: "Start a torrent by numeric id.",
      inputSchema: {
        id: z.number().int().positive(),
      },
    },
    async ({ id }) => {
      try {
        await ops.startTorrent(client, id);
        logMutation("start", { ok: true, torrent_id: id });
        return jsonResult({ ok: true, id });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logMutation("start", { ok: false, torrent_id: id, error: msg });
        return errorResult(msg);
      }
    },
  );

  mcp.registerTool(
    "transmission_stop_torrent",
    {
      description: "Stop a torrent by numeric id.",
      inputSchema: {
        id: z.number().int().positive(),
      },
    },
    async ({ id }) => {
      try {
        await ops.stopTorrent(client, id);
        logMutation("stop", { ok: true, torrent_id: id });
        return jsonResult({ ok: true, id });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logMutation("stop", { ok: false, torrent_id: id, error: msg });
        return errorResult(msg);
      }
    },
  );

  mcp.registerTool(
    "transmission_remove_torrent",
    {
      description:
        "Remove a torrent. When delete_local_data is true, confirm_delete_local_data must be true (explicit acknowledgement).",
      inputSchema: {
        id: z.number().int().positive(),
        delete_local_data: z.boolean().optional().default(false),
        confirm_delete_local_data: z.boolean().optional().default(false),
      },
    },
    async ({ id, delete_local_data, confirm_delete_local_data }) => {
      try {
        assertDeleteLocalDataConfirmed(delete_local_data, confirm_delete_local_data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logMutation("remove", {
          ok: false,
          torrent_id: id,
          delete_local_data,
          error: msg,
        });
        return errorResult(msg);
      }
      try {
        await ops.removeTorrent(client, id, delete_local_data);
        logMutation("remove", {
          ok: true,
          torrent_id: id,
          delete_local_data,
        });
        return jsonResult({ ok: true, id, delete_local_data });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logMutation("remove", {
          ok: false,
          torrent_id: id,
          delete_local_data,
          error: msg,
        });
        return errorResult(msg);
      }
    },
  );

  mcp.registerTool(
    "transmission_get_session",
    {
      description: "Read Transmission session settings and statistics (read-only).",
    },
    async () => {
      try {
        const session = await ops.getSession(client);
        return jsonResult(session);
      } catch (e) {
        if (e instanceof TransmissionRpcError) {
          return errorResult(
            `Failed to get session: ${e.message}${e.rpcMessage ? ` (${e.rpcMessage})` : ""}`,
          );
        }
        throw e;
      }
    },
  );
}
