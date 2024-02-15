import { BCUREncoder, BCURDecoder } from "./bcur";

import * as vendorEncodeUR from "./vendor/bcur/encodeUR";
import * as vendorDecodeUR from "./vendor/bcur/decodeUR";

describe("BCUREncoder", () => {
  describe("parts", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("it returns encoded UR parts", () => {
      const parts = ["a", "b"];
      const encodeMock = jest
        .spyOn(vendorEncodeUR, "encodeUR")
        .mockReturnValue(parts);
      const encoder = new BCUREncoder("deadbeef", 250);
      expect(encoder.parts()).toEqual(parts);
      expect(encodeMock).toHaveBeenCalledWith("deadbeef", 250);
    });
  });
});

describe("BCURDecoder", () => {
  let decodeMock, decoder;

  beforeEach(() => {
    decoder = new BCURDecoder();
  });

  describe("reset", () => {
    it("resets the summary when in a success state", () => {
      decoder.summary.success = true;
      decoder.summary.current = 5;
      decoder.summary.length = 5;
      decoder.summary.workloads = ["a", "b", "c", "d", "e"];
      decoder.summary.result = "deadbeef";
      decoder.reset();
      expect(decoder.summary.success).toEqual(false);
      expect(decoder.summary.current).toEqual(0);
      expect(decoder.summary.length).toEqual(0);
      expect(decoder.summary.workloads).toEqual([]);
      expect(decoder.summary.result).toEqual("");
      expect(decoder.error).toBeNull();
    });

    it("resets the summary when in an error state", () => {
      decoder.error = { message: "some message" };
      decoder.reset();
      expect(decoder.summary.success).toEqual(false);
      expect(decoder.summary.current).toEqual(0);
      expect(decoder.summary.length).toEqual(0);
      expect(decoder.summary.workloads).toEqual([]);
      expect(decoder.summary.result).toEqual("");
      expect(decoder.error).toBeNull();
    });
  });

  describe("receivePart", () => {
    beforeEach(() => {
      decodeMock = jest.spyOn(vendorDecodeUR, "smartDecodeUR");
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it("delegates to smartDecodeUR", () => {
      decoder.summary.workloads = ["a", "b"];
      const part = "c";
      const summary = "summary";
      decodeMock.mockReturnValue(summary);
      decoder.receivePart(part);
      expect(decodeMock).toHaveBeenCalledWith(["a", "b", "c"]);
      expect(decoder.summary).toEqual(summary);
    });

    it("handles errors when decoding", () => {
      decoder.summary.workloads = ["a", "b"];
      const part = "c";
      const error = new Error("some message");
      decodeMock.mockImplementation(() => {
        throw error;
      });
      decoder.receivePart(part);
      expect(decodeMock).toHaveBeenCalledWith(["a", "b", "c"]);
      expect(decoder.error).toEqual(error);
      expect(decoder.isComplete()).toEqual(true);
      expect(decoder.isSuccess()).toEqual(false);
      expect(decoder.errorMessage()).toEqual("some message");
    });
  });

  describe("progress", () => {
    it("returns the current progress", () => {
      decoder.summary.length = 5;
      decoder.summary.current = 3;
      expect(decoder.progress()).toEqual({
        totalParts: 5,
        partsReceived: 3,
      });
    });
  });

  describe("isComplete", () => {
    it("is false if the  summary is not successful and there is no error", () => {
      expect(decoder.isComplete()).toEqual(false);
    });

    it("is true if the summary is successful", () => {
      decoder.summary.success = true;
      expect(decoder.isComplete()).toEqual(true);
    });

    it("is true if there is an error", () => {
      decoder.error = { message: "some message" };
      expect(decoder.isComplete()).toEqual(true);
    });
  });

  describe("isSuccess", () => {
    it("is false if the  summary is not successful", () => {
      expect(decoder.isSuccess()).toEqual(false);
    });

    it("is true if the  summary is successful", () => {
      decoder.summary.success = true;
      expect(decoder.isSuccess()).toEqual(true);
    });
  });

  describe("data", () => {
    it("returns null if not successful", () => {
      expect(decoder.data()).toBeNull();
    });

    it("returns the summary result if successful", () => {
      decoder.summary.success = true;
      decoder.summary.result = "deadbeef";
      expect(decoder.data()).toEqual("deadbeef");
    });
  });

  describe("errorMessage", () => {
    it("returns null if no error", () => {
      expect(decoder.errorMessage()).toBeNull();
    });

    it("returns the error message if there is an error", () => {
      decoder.error = { message: "some message" };
      expect(decoder.errorMessage()).toEqual("some message");
    });
  });
});
