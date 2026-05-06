import { describe, expect, it } from "vitest";
import {
  assertValidTorrentSource,
  parseMagnetXtBtih,
} from "../src/validators/torrentSource.js";

describe("torrentSource", () => {
  it("accepts https torrent URLs", () => {
    expect(assertValidTorrentSource("https://example.com/file.torrent")).toContain("example.com");
  });

  it("rejects non-http schemes", () => {
    expect(() => assertValidTorrentSource("ftp://x/y")).toThrow(/scheme/);
  });

  it("accepts magnet with 40-char hex btih", () => {
    const m =
      "magnet:?xt=urn:btih:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&dn=test";
    expect(assertValidTorrentSource(m)).toBe(m);
  });

  it("accepts magnet with 32-char base32 btih", () => {
    const m = "magnet:?xt=urn:btih:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&dn=test";
    expect(assertValidTorrentSource(m)).toBe(m);
  });

  it("rejects magnet without valid xt", () => {
    expect(() => assertValidTorrentSource("magnet:?dn=nope")).toThrow(/xt=urn:btih/);
  });

  it("parses multiple xt parameters", () => {
    const m = `magnet:?xt=urn:btih:badbadbadbadbadbadbadbadbadbadbadbad&xt=urn:btih:${"ab".repeat(20)}`;
    const hashes = parseMagnetXtBtih(m);
    expect(hashes).toContain("badbadbadbadbadbadbadbadbadbadbadbad");
    expect(hashes.some((h) => /^[0-9a-f]{40}$/i.test(h))).toBe(true);
  });
});
