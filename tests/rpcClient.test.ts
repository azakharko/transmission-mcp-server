import { describe, expect, it, vi } from "vitest";
import {
  TransmissionRpcClient,
  TransmissionRpcError,
} from "../src/transmission/rpcClient.js";

describe("TransmissionRpcClient", () => {
  it("retries once on 409 with session id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ arguments: {}, result: "success" }), {
          status: 409,
          headers: { "X-Transmission-Session-Id": "abc123" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ arguments: { ok: true }, result: "success" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    const client = new TransmissionRpcClient(
      {
        rpcUrl: "http://127.0.0.1:1/transmission/rpc",
        rpcUser: "u",
        rpcPassword: "p",
      },
      fetchMock as typeof fetch,
    );

    const args = await client.call<{ ok: boolean }>("x-test", {});
    expect(args.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCall = fetchMock.mock.calls[1];
    expect(secondCall).toBeDefined();
    if (secondCall === undefined) {
      throw new Error("expected a second fetch invocation");
    }
    const init = secondCall[1];
    if (typeof init !== "object" || init === null || !("headers" in init)) {
      throw new Error("expected RequestInit with headers");
    }
    const headers = init.headers;
    if (headers instanceof Headers) {
      expect(headers.get("X-Transmission-Session-Id")).toBe("abc123");
    }
  });

  it("throws TransmissionRpcError on RPC result error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: "error", arguments: "nope" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const client = new TransmissionRpcClient(
      {
        rpcUrl: "http://127.0.0.1:1/transmission/rpc",
        rpcUser: "u",
        rpcPassword: "p",
      },
      fetchMock as typeof fetch,
    );

    await expect(client.call("any", {})).rejects.toBeInstanceOf(TransmissionRpcError);
  });

  it("sends torrent-add with download-dir", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          arguments: { "torrent-added": { id: 1, name: "x" } },
          result: "success",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const client = new TransmissionRpcClient(
      {
        rpcUrl: "http://127.0.0.1:1/transmission/rpc",
        rpcUser: "u",
        rpcPassword: "p",
      },
      fetchMock as typeof fetch,
    );

    await client.call("torrent-add", {
      filename: `magnet:?xt=urn:btih:${"a".repeat(40)}&dn=test`,
      "download-dir": "/d",
    });

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    if (firstCall === undefined) {
      throw new Error("expected fetch to be called");
    }
    const init = firstCall[1];
    if (typeof init !== "object" || init === null || !("body" in init)) {
      throw new Error("expected RequestInit with body");
    }
    const bodyRaw = init.body;
    expect(typeof bodyRaw === "string").toBe(true);
    const body = JSON.parse(bodyRaw as string) as {
      method: string;
      arguments: Record<string, unknown>;
    };
    expect(body.method).toBe("torrent-add");
    expect(body.arguments["download-dir"]).toBe("/d");
  });
});
