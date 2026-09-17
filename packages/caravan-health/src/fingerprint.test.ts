import { Network } from "@caravan/bitcoin";
import { amountFingerprints, scriptTypeFingerprints } from "./fingerprint";

describe("Fingerprint", () => {
  it("can match by hrp", () => {
    const result = scriptTypeFingerprints(
      "P2WSH",
      [
        "bc1qzcwk6mnfmdt6rx0qp0dwfll4gj8540yamdka7r",
        "3EutoNctCnVBpVz8xcAvHBSNxSbmgWxZmV",
      ],
      Network.MAINNET,
    );
    expect(result).toEqual([true, false]);
  });

  it("can measure amount entropy", () => {
    const result = amountFingerprints(["40.8199902", "1.18000000"]);
    expect(result).toEqual([true, false]);
  });
});
