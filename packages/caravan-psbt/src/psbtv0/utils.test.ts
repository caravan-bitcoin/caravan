import { autoLoadPSBT } from "./utils";

describe("autoLoadPSBT", () => {
  it("should fail if you don't send a String", () => {
    expect(autoLoadPSBT([])).toBeNull();
    expect(autoLoadPSBT({})).toBeNull();
    expect(autoLoadPSBT(Buffer.from("foobar", "hex"))).toBeNull();
  });
});
