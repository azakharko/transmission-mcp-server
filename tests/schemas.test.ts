import { describe, expect, it } from "vitest";
import {
  getTorrentIdFromAddResult,
  parseAddTorrentArguments,
} from "../src/transmission/schemas.js";

describe("parseAddTorrentArguments", () => {
  it("accepts torrent-added with id", () => {
    const raw = { "torrent-added": { id: 7, name: "x" } };
    const r = parseAddTorrentArguments(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(getTorrentIdFromAddResult(r.value)).toBe(7);
    }
  });

  it("rejects invalid id type", () => {
    const r = parseAddTorrentArguments({
      "torrent-added": { id: "nope" },
    });
    expect(r.ok).toBe(false);
  });

  it("accepts empty success shape", () => {
    const r = parseAddTorrentArguments({});
    expect(r.ok).toBe(true);
  });
});
