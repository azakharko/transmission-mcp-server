const BTIH_HEX = /^[0-9a-f]{40}$/i;
const BTIH_BASE32 = /^[a-z2-7]{32}$/i;

function hasValidBtihSegment(hash: string): boolean {
  const h = hash.trim();
  return BTIH_HEX.test(h) || BTIH_BASE32.test(h);
}

/** Extracts btih values from magnet query string (after '?'). */
export function parseMagnetXtBtih(magnet: string): string[] {
  const qIndex = magnet.indexOf("?");
  if (qIndex < 0) {
    return [];
  }
  const query = magnet.slice(qIndex + 1);
  const hashes: string[] = [];
  for (const part of query.split("&")) {
    const [rawKey, rawValue = ""] = part.split("=");
    const key = decodeURIComponent(rawKey);
    if (key !== "xt") {
      continue;
    }
    const value = decodeURIComponent(rawValue);
    const prefix = "urn:btih:";
    if (value.toLowerCase().startsWith(prefix)) {
      hashes.push(value.slice(prefix.length));
    }
  }
  return hashes;
}

/**
 * Returns the validated torrent source string (trimmed URL or magnet).
 * Throws with a short message on invalid input.
 */
export function assertValidTorrentSource(source: string): string {
  const s = source.trim();
  if (s.length === 0) {
    throw new Error("torrent source is empty");
  }

  if (s.startsWith("magnet:?")) {
    const hashes = parseMagnetXtBtih(s);
    const ok = hashes.some(hasValidBtihSegment);
    if (!ok) {
      throw new Error("magnet link must include xt=urn:btih: with a valid v1/v2 hash");
    }
    return s;
  }

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    throw new Error("torrent source must be an http(s) URL or a magnet link");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`unsupported URL scheme: ${url.protocol}`);
  }
  if (url.hostname.length === 0) {
    throw new Error("torrent URL must include a host");
  }

  return s;
}
