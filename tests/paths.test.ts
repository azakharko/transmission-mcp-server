import { describe, expect, it } from "vitest";
import {
  assertAllowedDownloadDir,
  resolveEffectiveDownloadDir,
} from "../src/validators/paths.js";

describe("paths", () => {
  const allow = ["/var/lib/transmission/Downloads"] as const;

  it("resolves single allowlist default", () => {
    expect(
      resolveEffectiveDownloadDir({
        requested: undefined,
        allowlist: allow,
        defaultDir: undefined,
      }),
    ).toBe("/var/lib/transmission/Downloads");
  });

  it("requires download_dir when multiple dirs and no default", () => {
    expect(() =>
      resolveEffectiveDownloadDir({
        requested: undefined,
        allowlist: ["/d1", "/d2"],
        defaultDir: undefined,
      }),
    ).toThrow(/download_dir is required/);
  });

  it("uses default when multiple dirs configured", () => {
    expect(
      resolveEffectiveDownloadDir({
        requested: undefined,
        allowlist: ["/d1", "/d2"],
        defaultDir: "/d2",
      }),
    ).toBe("/d2");
  });

  it("rejects paths outside allowlist", () => {
    expect(() => assertAllowedDownloadDir("/tmp/nope", allow)).toThrow(/not in/);
  });
});
