import { describe, expect, it } from "vitest";
import { assertDeleteLocalDataConfirmed } from "../src/validators/removeTorrent.js";

describe("assertDeleteLocalDataConfirmed", () => {
  it("allows remove without delete data", () => {
    expect(() => {
      assertDeleteLocalDataConfirmed(false, false);
    }).not.toThrow();
  });

  it("requires explicit confirm when deleting local data", () => {
    expect(() => {
      assertDeleteLocalDataConfirmed(true, false);
    }).toThrow(/confirm_delete_local_data/);
  });

  it("passes when confirmed", () => {
    expect(() => {
      assertDeleteLocalDataConfirmed(true, true);
    }).not.toThrow();
  });
});
