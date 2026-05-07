import { describe, expect, it, vi } from "vitest";
import {
  addTorrent,
  getSession,
  listTorrents,
  removeTorrent,
  startTorrent,
  stopTorrent,
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

  it("omits ids when an empty ids array is passed", async () => {
    const callMock = vi.fn().mockResolvedValue({ torrents: [] });
    const client = {
      call: callMock,
    } as unknown as TransmissionRpcClient;

    await listTorrents(client, { ids: [] });
    expect(callMock).toHaveBeenCalledWith("torrent-get", expect.any(Object));
    const [, args] = callMock.mock.calls[0];
    expect(args).not.toHaveProperty("ids");
  });
});

describe("RPC helper methods", () => {
  it("delegates torrent-add", async () => {
    const callMock = vi.fn().mockResolvedValue({});
    const client = { call: callMock } as unknown as TransmissionRpcClient;

    await addTorrent(client, "magnet:?xt=urn:btih:abc", "/tmp/dl");

    expect(callMock).toHaveBeenCalledWith("torrent-add", {
      filename: "magnet:?xt=urn:btih:abc",
      "download-dir": "/tmp/dl",
    });
  });

  it("delegates torrent-start and torrent-stop", async () => {
    const callMock = vi.fn().mockResolvedValue({});
    const client = { call: callMock } as unknown as TransmissionRpcClient;

    await startTorrent(client, 9);
    expect(callMock).toHaveBeenNthCalledWith(1, "torrent-start", { ids: [9] });

    await stopTorrent(client, 9);
    expect(callMock).toHaveBeenNthCalledWith(2, "torrent-stop", { ids: [9] });
  });

  it("delegates torrent-remove with delete-local-data flag", async () => {
    const callMock = vi.fn().mockResolvedValue({});
    const client = { call: callMock } as unknown as TransmissionRpcClient;

    await removeTorrent(client, 7, true);

    expect(callMock).toHaveBeenCalledWith("torrent-remove", {
      ids: [7],
      "delete-local-data": true,
    });
  });

  it("delegates session-get", async () => {
    const callMock = vi.fn().mockResolvedValue({ version: "3" });
    const client = { call: callMock } as unknown as TransmissionRpcClient;

    const session = await getSession(client);
    expect(session).toEqual({ version: "3" });
    expect(callMock).toHaveBeenCalledWith("session-get", {});
  });
});
