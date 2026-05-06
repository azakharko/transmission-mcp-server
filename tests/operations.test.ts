import { describe, expect, it, vi } from "vitest";
import {
  listTorrents,
} from "../src/transmission/operations.js";
import type { TransmissionRpcClient } from "../src/transmission/rpcClient.js";

describe("listTorrents", () => {
  it("caps results when limit is set", async () => {
    const torrents = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
    const client = {
      call: vi.fn().mockResolvedValue({ torrents }),
    } as unknown as TransmissionRpcClient;

    const r = await listTorrents(client, { limit: 2 });
    expect(r.torrents).toHaveLength(2);
    expect(r).toMatchObject({ truncated: true, total_count: 5 });
  });

  it("passes ids to torrent-get", async () => {
    const callMock = vi.fn().mockResolvedValue({ torrents: [{ id: 1 }] });
    const client = {
      call: callMock,
    } as unknown as TransmissionRpcClient;

    await listTorrents(client, { ids: [1, 2] });
    expect(callMock).toHaveBeenCalledWith(
      "torrent-get",
      expect.objectContaining({ ids: [1, 2] }),
    );
  });
});
