import { describe, expect, it } from "vitest";
import { loadConfig, normalizeTransmissionRpcUrl } from "../src/config.js";

describe("normalizeTransmissionRpcUrl", () => {
  it("normalizes host:port to /transmission/rpc", () => {
    expect(normalizeTransmissionRpcUrl("http://127.0.0.1:9091")).toBe(
      "http://127.0.0.1:9091/transmission/rpc",
    );
  });

  it("accepts ::1", () => {
    expect(normalizeTransmissionRpcUrl("http://[::1]:9091/transmission/rpc")).toContain(
      "::1",
    );
  });

  it("rejects non-loopback hosts", () => {
    expect(() => normalizeTransmissionRpcUrl("http://192.168.1.1:9091")).toThrow(
      /loopback/,
    );
  });
});

describe("loadConfig", () => {
  it("requires auth and allowlist", () => {
    expect(() =>
      loadConfig({
        TRANSMISSION_RPC_USER: "",
        TRANSMISSION_RPC_PASSWORD: "",
        TRANSMISSION_ALLOWED_DOWNLOAD_DIRS: "",
      }),
    ).toThrow();
  });

  it("dedupes allowlist paths", () => {
    const dir = "/var/torrents";
    const cfg = loadConfig({
      TRANSMISSION_RPC_USER: "u",
      TRANSMISSION_RPC_PASSWORD: "p",
      TRANSMISSION_ALLOWED_DOWNLOAD_DIRS: `${dir}, ${dir}/`,
    });
    expect(cfg.allowedDownloadDirs).toEqual([dir]);
  });

  it("defaults RPC timeout to 60000ms", () => {
    const cfg = loadConfig({
      TRANSMISSION_RPC_USER: "u",
      TRANSMISSION_RPC_PASSWORD: "p",
      TRANSMISSION_ALLOWED_DOWNLOAD_DIRS: "/d",
    });
    expect(cfg.rpcTimeoutMs).toBe(60_000);
  });

  it("disables RPC timeout when set to 0", () => {
    const cfg = loadConfig({
      TRANSMISSION_RPC_USER: "u",
      TRANSMISSION_RPC_PASSWORD: "p",
      TRANSMISSION_ALLOWED_DOWNLOAD_DIRS: "/d",
      TRANSMISSION_RPC_TIMEOUT_MS: "0",
    });
    expect(cfg.rpcTimeoutMs).toBeUndefined();
  });

  it("parses custom RPC timeout", () => {
    const cfg = loadConfig({
      TRANSMISSION_RPC_USER: "u",
      TRANSMISSION_RPC_PASSWORD: "p",
      TRANSMISSION_ALLOWED_DOWNLOAD_DIRS: "/d",
      TRANSMISSION_RPC_TIMEOUT_MS: "120000",
    });
    expect(cfg.rpcTimeoutMs).toBe(120_000);
  });

  it("rejects RPC timeout below 1000ms when not 0", () => {
    expect(() =>
      loadConfig({
        TRANSMISSION_RPC_USER: "u",
        TRANSMISSION_RPC_PASSWORD: "p",
        TRANSMISSION_ALLOWED_DOWNLOAD_DIRS: "/d",
        TRANSMISSION_RPC_TIMEOUT_MS: "500",
      }),
    ).toThrow(/at least 1000/);
  });
});
