import path from "node:path";
import { z } from "zod";
import { normalizeDownloadPath } from "./validators/paths.js";

function normalizeHostname(hostname: string): string {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

function assertLoopbackRpcUrl(url: URL): void {
  const hostname = normalizeHostname(url.hostname);
  if (hostname !== "127.0.0.1" && hostname !== "::1") {
    throw new Error(
      `TRANSMISSION_RPC_URL must use loopback (127.0.0.1 or ::1), got hostname "${hostname}"`,
    );
  }
}

export function normalizeTransmissionRpcUrl(raw: string): string {
  const trimmed = raw.trim();
  const withScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`TRANSMISSION_RPC_URL is not a valid URL: ${raw}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`TRANSMISSION_RPC_URL must be http(s), got ${url.protocol}`);
  }
  assertLoopbackRpcUrl(url);
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/transmission/rpc";
  }
  if (!url.pathname.endsWith("/transmission/rpc")) {
    throw new Error(
      "TRANSMISSION_RPC_URL path must be empty or end with /transmission/rpc",
    );
  }
  url.hash = "";
  return url.toString();
}

const configSchema = z
  .object({
    rpcUrl: z.string().min(1),
    rpcUser: z.string().min(1, "TRANSMISSION_RPC_USER is required"),
    rpcPassword: z.string().min(1, "TRANSMISSION_RPC_PASSWORD is required"),
    allowedDownloadDirs: z
      .string()
      .min(1, "TRANSMISSION_ALLOWED_DOWNLOAD_DIRS is required")
      .superRefine((s, ctx) => {
        const parts = s
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
        if (parts.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "TRANSMISSION_ALLOWED_DOWNLOAD_DIRS must list at least one path",
          });
        }
      })
      .transform((s) => {
        const parts = s
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
        const uniq = new Set<string>();
        const normalized: string[] = [];
        for (const p of parts) {
          const n = normalizeDownloadPath(p);
          if (!uniq.has(n)) {
            uniq.add(n);
            normalized.push(n);
          }
        }
        return normalized;
      }),
    defaultDownloadDirRaw: z.string().optional(),
  })
  .transform((v) => {
    const trimmedDefault =
      v.defaultDownloadDirRaw === undefined || v.defaultDownloadDirRaw.trim() === ""
        ? undefined
        : v.defaultDownloadDirRaw.trim();
    if (trimmedDefault !== undefined && !path.isAbsolute(trimmedDefault)) {
      throw new Error(
        "TRANSMISSION_DEFAULT_DOWNLOAD_DIR must be an absolute path when set",
      );
    }
    const defaultDownloadDir =
      trimmedDefault === undefined ? undefined : normalizeDownloadPath(trimmedDefault);

    if (
      defaultDownloadDir !== undefined &&
      !v.allowedDownloadDirs.includes(defaultDownloadDir)
    ) {
      throw new Error(
        "TRANSMISSION_DEFAULT_DOWNLOAD_DIR must be listed in TRANSMISSION_ALLOWED_DOWNLOAD_DIRS",
      );
    }

    return {
      rpcUrl: v.rpcUrl,
      rpcUser: v.rpcUser,
      rpcPassword: v.rpcPassword,
      allowedDownloadDirs: v.allowedDownloadDirs,
      defaultDownloadDir,
    };
  });

export type AppConfig = {
  rpcUrl: string;
  rpcUser: string;
  rpcPassword: string;
  allowedDownloadDirs: string[];
  defaultDownloadDir: string | undefined;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rpcUrl = normalizeTransmissionRpcUrl(
    env["TRANSMISSION_RPC_URL"] ?? "http://127.0.0.1:9091/transmission/rpc",
  );

  return configSchema.parse({
    rpcUrl,
    rpcUser: env["TRANSMISSION_RPC_USER"] ?? "",
    rpcPassword: env["TRANSMISSION_RPC_PASSWORD"] ?? "",
    allowedDownloadDirs: env["TRANSMISSION_ALLOWED_DOWNLOAD_DIRS"] ?? "",
    defaultDownloadDirRaw: env["TRANSMISSION_DEFAULT_DOWNLOAD_DIR"],
  });
}
