import path from "node:path";

/** Normalizes absolute download paths for allowlist checks (Ubuntu-friendly). */
export function normalizeDownloadPath(dir: string): string {
  const trimmed = dir.trim();
  if (trimmed.length === 0) {
    throw new Error("download path is empty");
  }
  return path.normalize(path.resolve(trimmed));
}

export function assertAllowedDownloadDir(dir: string, allowlist: readonly string[]): string {
  const normalized = normalizeDownloadPath(dir);
  if (!allowlist.includes(normalized)) {
    throw new Error(
      `download_dir is not in TRANSMISSION_ALLOWED_DOWNLOAD_DIRS: ${normalized}`,
    );
  }
  return normalized;
}

export function resolveEffectiveDownloadDir(options: {
  requested: string | undefined;
  allowlist: readonly string[];
  defaultDir: string | undefined;
}): string {
  if (options.requested !== undefined && options.requested.length > 0) {
    return assertAllowedDownloadDir(options.requested, options.allowlist);
  }
  if (options.defaultDir !== undefined) {
    return assertAllowedDownloadDir(options.defaultDir, options.allowlist);
  }
  if (options.allowlist.length === 1) {
    const [only] = options.allowlist;
    return only;
  }
  throw new Error(
    "download_dir is required when multiple directories are allowlisted and TRANSMISSION_DEFAULT_DOWNLOAD_DIR is unset",
  );
}
