import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { FastMCP } from "fastmcp";
import { UserError } from "fastmcp";
import type { AppConfig } from "../src/config.js";
import { addTransmissionTools } from "../src/mcp/tools.js";
import type { TransmissionRpcClient } from "../src/transmission/rpcClient.js";
import { TransmissionRpcError } from "../src/transmission/rpcClient.js";

type ToolDef = {
  name: string;
  execute: (args: Record<string, unknown>, ctx?: unknown) => Promise<unknown>;
};

describe("addTransmissionTools", () => {
  const config: AppConfig = {
    rpcUrl: "http://127.0.0.1:9091/transmission/rpc",
    rpcUser: "u",
    rpcPassword: "p",
    allowedDownloadDirs: ["/downloads"],
    defaultDownloadDir: "/downloads",
    rpcTimeoutMs: 60_000,
  };

  const captured: ToolDef[] = [];

  beforeEach(() => {
    captured.length = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function stubServer(): FastMCP {
    return {
      addTool: vi.fn((def: ToolDef) => {
        captured.push(def);
      }),
    } as unknown as FastMCP;
  }

  function getTool(name: string): ToolDef {
    const t = captured.find((c) => c.name === name);
    if (t === undefined) {
      throw new Error(`missing tool ${name}`);
    }
    return t;
  }

  function register(callMock: ReturnType<typeof vi.fn>): TransmissionRpcClient {
    const client = { call: callMock } as unknown as TransmissionRpcClient;
    addTransmissionTools(stubServer(), client, config);
    return client;
  }

  it("registers six tools", () => {
    register(vi.fn());
    expect(captured.map((c) => c.name)).toEqual([
      "transmission_list_torrents",
      "transmission_add_torrent",
      "transmission_start_torrent",
      "transmission_stop_torrent",
      "transmission_remove_torrent",
      "transmission_get_session",
    ]);
  });

  it("lists torrents and returns formatted JSON text", async () => {
    const callMock = vi.fn().mockResolvedValue({ torrents: [{ id: 1 }] });
    register(callMock);

    const raw = await getTool("transmission_list_torrents").execute({});
    expect(typeof raw).toBe("string");
    expect(JSON.parse(raw as string)).toEqual({
      torrents: [{ id: 1 }],
    });
    expect(callMock).toHaveBeenCalledWith("torrent-get", expect.any(Object));
  });

  it("maps TransmissionRpcError to UserError for list torrents (with rpcMessage)", async () => {
    register(vi.fn().mockRejectedValue(new TransmissionRpcError("down", 503, "busy")));

    await expect(getTool("transmission_list_torrents").execute({})).rejects.toThrow(UserError);
    await expect(getTool("transmission_list_torrents").execute({})).rejects.toThrow(/busy/);
  });

  it("rethrows unexpected errors from list torrents", async () => {
    const boom = new Error("unexpected");
    register(vi.fn().mockRejectedValue(boom));

    await expect(getTool("transmission_list_torrents").execute({})).rejects.toThrow(boom);
  });

  it("adds a magnet and returns parsed RPC arguments", async () => {
    const rpc = {
      "torrent-added": { id: 3, name: "x" },
    };
    const callMock = vi.fn().mockResolvedValue(rpc);
    register(callMock);

    const raw = await getTool("transmission_add_torrent").execute({
      url: "magnet:?xt=urn:btih:1234567890123456789012345678901234567890",
    });
    expect(callMock).toHaveBeenCalledWith("torrent-add", {
      filename: "magnet:?xt=urn:btih:1234567890123456789012345678901234567890",
      "download-dir": "/downloads",
    });
    expect(JSON.parse(raw as string)).toEqual(rpc);
  });

  it("throws UserError when torrent-add response cannot be parsed", async () => {
    register(vi.fn().mockResolvedValue(null));

    await expect(
      getTool("transmission_add_torrent").execute({ url: "https://example.com/a.torrent" }),
    ).rejects.toThrow(UserError);
  });

  it("wraps validator failures for add torrent in UserError", async () => {
    const callMock = vi.fn();
    register(callMock);

    await expect(
      getTool("transmission_add_torrent").execute({ url: "file:///evil.torrent" }),
    ).rejects.toThrow(UserError);
    expect(callMock).not.toHaveBeenCalled();
  });

  it("starts and stops torrents", async () => {
    const callMock = vi.fn().mockResolvedValue({});
    register(callMock);

    await getTool("transmission_start_torrent").execute({ id: 1 });
    expect(callMock).toHaveBeenCalledWith("torrent-start", { ids: [1] });
    await getTool("transmission_stop_torrent").execute({ id: 1 });
    expect(callMock).toHaveBeenCalledWith("torrent-stop", { ids: [1] });
  });

  it("throws UserError when start fails", async () => {
    register(vi.fn().mockRejectedValue(new Error("start nope")));

    await expect(getTool("transmission_start_torrent").execute({ id: 1 })).rejects.toThrow(UserError);
  });

  it("throws UserError when stop fails", async () => {
    register(vi.fn().mockRejectedValue(new Error("nope")));

    await expect(getTool("transmission_stop_torrent").execute({ id: 1 })).rejects.toThrow(UserError);
  });

  it("requires confirmation before delete_local_data", async () => {
    const callMock = vi.fn();
    register(callMock);

    await expect(
      getTool("transmission_remove_torrent").execute({
        id: 1,
        delete_local_data: true,
        confirm_delete_local_data: false,
      }),
    ).rejects.toThrow(UserError);
    expect(callMock).not.toHaveBeenCalled();
  });

  it("throws UserError when remove RPC fails after validation", async () => {
    register(vi.fn().mockRejectedValue(new Error("remove failed")));

    await expect(getTool("transmission_remove_torrent").execute({ id: 9 })).rejects.toThrow(UserError);
  });

  it("removes torrent when delete is confirmed", async () => {
    const callMock = vi.fn().mockResolvedValue({});
    register(callMock);

    const raw = await getTool("transmission_remove_torrent").execute({
      id: 2,
      delete_local_data: true,
      confirm_delete_local_data: true,
    });
    expect(callMock).toHaveBeenCalledWith("torrent-remove", {
      ids: [2],
      "delete-local-data": true,
    });
    expect(JSON.parse(raw as string)).toEqual({
      ok: true,
      id: 2,
      delete_local_data: true,
    });
  });

  it("returns session JSON", async () => {
    const session = { "download-dir": "/downloads", version: "4" };
    register(vi.fn().mockResolvedValue(session));

    const raw = await getTool("transmission_get_session").execute({});
    expect(JSON.parse(raw as string)).toEqual(session);
  });

  it("maps TransmissionRpcError to UserError for get session", async () => {
    register(vi.fn().mockRejectedValue(new TransmissionRpcError("auth", 401)));

    await expect(getTool("transmission_get_session").execute({})).rejects.toThrow(UserError);
  });

  it("rethrows non-RPC errors from get session", async () => {
    const err = new Error("weird");
    register(vi.fn().mockRejectedValue(err));

    await expect(getTool("transmission_get_session").execute({})).rejects.toThrow(err);
  });

  it("handles torrent-duplicate responses from RPC", async () => {
    const callMock = vi.fn().mockResolvedValue({
      "torrent-duplicate": { id: 1 },
    });
    register(callMock);

    const raw = await getTool("transmission_add_torrent").execute({
      url: "magnet:?xt=urn:btih:abcdefabcdefabcdefabcdefabcdefabcdefabcd",
    });
    expect(JSON.parse(raw as string)).toEqual({
      "torrent-duplicate": { id: 1 },
    });
  });
});
