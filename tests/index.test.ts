import { describe, expect, it, vi, beforeEach } from "vitest";

const startMock = vi.fn().mockResolvedValue(undefined);
const addToolMock = vi.fn();
const rpcCallMock = vi.fn();

vi.mock("fastmcp", () => ({
  FastMCP: vi.fn().mockImplementation(() => ({
    addTool: addToolMock,
    start: startMock,
  })),
  UserError: class UserError extends Error {
    readonly name = "UserError";
  },
}));

vi.mock("../src/config.js", () => ({
  loadConfig: vi.fn(() => ({
    rpcUrl: "http://127.0.0.1:9091/transmission/rpc",
    rpcUser: "u",
    rpcPassword: "p",
    allowedDownloadDirs: ["/allowed"],
    defaultDownloadDir: "/allowed",
    rpcTimeoutMs: 60_000,
  })),
}));

vi.mock("../src/transmission/rpcClient.js", () => ({
  TransmissionRpcClient: vi.fn().mockImplementation(() => ({
    call: rpcCallMock,
  })),
}));

import { loadConfig } from "../src/config.js";
import { main, reportMainFailure } from "../src/index.js";

describe("reportMainFailure", () => {
  it("prints the message and sets exit code", () => {
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    const prev = process.exitCode;
    process.exitCode = 0;

    reportMainFailure(new Error("boom"));

    expect(stderr).toHaveBeenCalledWith("boom");
    expect(process.exitCode).toBe(1);

    stderr.mockRestore();
    process.exitCode = prev;
  });

  it("stringifies non-Error values", () => {
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    const prev = process.exitCode;
    process.exitCode = 0;

    reportMainFailure(404);

    expect(stderr).toHaveBeenCalledWith("404");

    stderr.mockRestore();
    process.exitCode = prev;
  });
});

describe("main", () => {
  beforeEach(() => {
    rpcCallMock.mockReset();
    addToolMock.mockReset();
    startMock.mockReset();
    startMock.mockResolvedValue(undefined);
    vi.mocked(loadConfig).mockImplementation(() => ({
      rpcUrl: "http://127.0.0.1:9091/transmission/rpc",
      rpcUser: "u",
      rpcPassword: "p",
      allowedDownloadDirs: ["/allowed"],
      defaultDownloadDir: "/allowed",
      rpcTimeoutMs: 60_000,
    }));
  });

  it("starts the MCP server after wiring tools", async () => {
    rpcCallMock.mockResolvedValue({ "download-dir": "/allowed" });

    await main();

    expect(addToolMock.mock.calls.length).toBe(6);
    expect(startMock).toHaveBeenCalledWith({ transportType: "stdio" });
  });

  it("logs when Transmission download-dir is not allowlisted", async () => {
    rpcCallMock.mockResolvedValue({ "download-dir": "/not-allowed" });
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});

    await main();

    const warningLine = stderr.mock.calls
      .map((c) => c[0] as string)
      .find((s) => typeof s === "string" && s.includes("transmission_mcp_warning"));
    expect(warningLine).toBeDefined();
    if (warningLine === undefined) {
      throw new Error("expected warning line");
    }
    expect(JSON.parse(warningLine).message).toContain("allowlist");

    stderr.mockRestore();
  });

  it("does not warn when session download-dir is non-string", async () => {
    rpcCallMock.mockResolvedValue({ "download-dir": null });
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});

    await main();

    const warnings = stderr.mock.calls
      .map((c) => c[0] as string)
      .filter((s) => typeof s === "string" && s.includes("transmission_mcp_warning"));
    expect(warnings).toHaveLength(0);

    stderr.mockRestore();
  });

  it("warns when session lookup fails", async () => {
    rpcCallMock.mockRejectedValue(new Error("network"));
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});

    await main();

    const warningLine = stderr.mock.calls
      .map((c) => c[0] as string)
      .find((s) => typeof s === "string" && s.includes("Could not read Transmission session"));
    expect(warningLine).toBeDefined();

    stderr.mockRestore();
  });
});
