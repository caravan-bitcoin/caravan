import { autoLoadPSBT } from "./utils";
import { describe, expect, it } from "vitest";

describe("autoLoadPSBT", () => {
  it("should fail if you don't send a String", () => {
    expect(autoLoadPSBT([])).toBeNull();
    expect(autoLoadPSBT({})).toBeNull();
    expect(autoLoadPSBT(Buffer.from("foobar", "hex"))).toBeNull();
  });
});
