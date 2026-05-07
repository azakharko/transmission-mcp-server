import { describe, expect, it, vi } from "vitest";
import { logMutation } from "../src/log/mutationLog.js";

describe("logMutation", () => {
  it("writes a structured JSON line to stderr", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logMutation("start", { ok: true, torrent_id: 42 });
    expect(spy).toHaveBeenCalledOnce();
    const line = spy.mock.calls[0][0] as string;
    const obj = JSON.parse(line);
    expect(obj).toMatchObject({
      type: "transmission_mcp_mutation",
      action: "start",
      ok: true,
      torrent_id: 42,
    });
    expect(typeof obj.ts).toBe("string");
    spy.mockRestore();
  });
});
