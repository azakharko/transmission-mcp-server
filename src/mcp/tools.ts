import { FastMCP, UserError } from "fastmcp";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { logMutation } from "../log/mutationLog.js";
import * as ops from "../transmission/operations.js";
import {
  getTorrentIdFromAddResult,
  parseAddTorrentArguments,
} from "../transmission/schemas.js";
import { TransmissionRpcClient, TransmissionRpcError } from "../transmission/rpcClient.js";
import { resolveEffectiveDownloadDir } from "../validators/paths.js";
import { assertDeleteLocalDataConfirmed } from "../validators/removeTorrent.js";
import { assertValidTorrentSource } from "../validators/torrentSource.js";

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function addTransmissionTools(
  server: FastMCP,
  client: TransmissionRpcClient,
  config: AppConfig,
): void {
  server.addTool({
    name: "transmission_list_torrents",
    description:
      "List torrents (id, name, status, progress, rates, sizes, downloadDir, …). Optional ids filters to specific torrents; optional limit caps response size (see total_count/truncated when truncated).",
    parameters: z.object({
      ids: z
        .array(z.number().int().positive())
        .optional()
        .describe("If set, only fetch these torrent ids (Transmission torrent-get ids)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10_000)
        .optional()
        .describe("Max torrents to return after fetch; omit for full list"),
    }),
    execute: async (input) => {
      try {
        const args = await ops.listTorrents(client, {
          ids: input.ids,
          limit: input.limit,
        });
        return jsonText(args);
      } catch (e) {
        if (e instanceof TransmissionRpcError) {
          throw new UserError(
            `Failed to list torrents: ${e.message}${e.rpcMessage ? ` (${e.rpcMessage})` : ""}`,
          );
        }
        throw e;
      }
    },
  });

  server.addTool({
    name: "transmission_add_torrent",
    description:
      "Add a torrent from an http(s) .torrent URL or magnet link. download_dir must be allowlisted if multiple dirs are configured.",
    parameters: z.object({
      url: z.string().describe("Torrent URL (http/https) or magnet:? link"),
      download_dir: z
        .string()
        .optional()
        .describe(
          "Absolute download directory (must be in TRANSMISSION_ALLOWED_DOWNLOAD_DIRS)",
        ),
    }),
    execute: async (args) => {
      let downloadDir = "";
      try {
        const source = assertValidTorrentSource(args.url);
        downloadDir = resolveEffectiveDownloadDir({
          requested: args.download_dir,
          allowlist: config.allowedDownloadDirs,
          defaultDir: config.defaultDownloadDir,
        });
        const result = await ops.addTorrent(client, source, downloadDir);
        const parsed = parseAddTorrentArguments(result);
        if (!parsed.ok) {
          const msg = `Invalid torrent-add response: ${parsed.message}`;
          logMutation("add_torrent", {
            ok: false,
            sourceType: source.startsWith("magnet:") ? "magnet" : "url",
            download_dir: downloadDir,
            error: msg,
          });
          throw new UserError(msg);
        }
        const id = getTorrentIdFromAddResult(parsed.value);
        logMutation("add_torrent", {
          ok: true,
          sourceType: source.startsWith("magnet:") ? "magnet" : "url",
          download_dir: downloadDir,
          torrent_id: id,
          duplicate: parsed.value["torrent-duplicate"] !== undefined,
        });
        return jsonText(parsed.value);
      } catch (e) {
        if (e instanceof UserError) {
          throw e;
        }
        const msg = e instanceof Error ? e.message : String(e);
        logMutation("add_torrent", {
          ok: false,
          download_dir: downloadDir || undefined,
          error: msg,
        });
        throw new UserError(msg);
      }
    },
  });

  server.addTool({
    name: "transmission_start_torrent",
    description: "Start a torrent by numeric id.",
    parameters: z.object({
      id: z.number().int().positive(),
    }),
    execute: async ({ id }) => {
      try {
        await ops.startTorrent(client, id);
        logMutation("start", { ok: true, torrent_id: id });
        return jsonText({ ok: true, id });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logMutation("start", { ok: false, torrent_id: id, error: msg });
        throw new UserError(msg);
      }
    },
  });

  server.addTool({
    name: "transmission_stop_torrent",
    description: "Stop a torrent by numeric id.",
    parameters: z.object({
      id: z.number().int().positive(),
    }),
    execute: async ({ id }) => {
      try {
        await ops.stopTorrent(client, id);
        logMutation("stop", { ok: true, torrent_id: id });
        return jsonText({ ok: true, id });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logMutation("stop", { ok: false, torrent_id: id, error: msg });
        throw new UserError(msg);
      }
    },
  });

  server.addTool({
    name: "transmission_remove_torrent",
    description:
      "Remove a torrent. When delete_local_data is true, confirm_delete_local_data must be true (explicit acknowledgement).",
    parameters: z.object({
      id: z.number().int().positive(),
      delete_local_data: z.boolean().optional().default(false),
      confirm_delete_local_data: z.boolean().optional().default(false),
    }),
    execute: async ({ id, delete_local_data, confirm_delete_local_data }) => {
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
        throw new UserError(msg);
      }
      try {
        await ops.removeTorrent(client, id, delete_local_data);
        logMutation("remove", {
          ok: true,
          torrent_id: id,
          delete_local_data,
        });
        return jsonText({ ok: true, id, delete_local_data });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logMutation("remove", {
          ok: false,
          torrent_id: id,
          delete_local_data,
          error: msg,
        });
        throw new UserError(msg);
      }
    },
  });

  server.addTool({
    name: "transmission_get_session",
    description: "Read Transmission session settings and statistics (read-only).",
    parameters: z.object({}),
    execute: async () => {
      try {
        const session = await ops.getSession(client);
        return jsonText(session);
      } catch (e) {
        if (e instanceof TransmissionRpcError) {
          throw new UserError(
            `Failed to get session: ${e.message}${e.rpcMessage ? ` (${e.rpcMessage})` : ""}`,
          );
        }
        throw e;
      }
    },
  });
}
