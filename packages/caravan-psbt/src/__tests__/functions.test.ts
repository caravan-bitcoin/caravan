import { bufferize } from "../functions";

describe("bufferize", () => {
  it("should return a buffer when given a hex string", () => {
    const hexString = "0123456789abcdef";
    const result = bufferize(hexString);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString("hex")).toEqual(hexString);
  });

  it("should return a buffer when given a base64 string", () => {
    const base64String = "SGVsbG8gd29ybGQ=";
    const result = bufferize(base64String);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString("base64")).toEqual(base64String);
  });

  it("should return the same buffer when given a buffer", () => {
    const buffer = Buffer.from("Hello world");
    const result = bufferize(buffer);
    expect(result).toBe(buffer);
  });

  it("should fail when given an invalid input", () => {
    // @ts-expect-error invalid input
    expect(() => bufferize(123)).toThrowError("Input cannot be bufferized.");
  });
});
