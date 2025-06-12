import { secureRandomInt } from "../utils";

describe("secureRandomInt", () => {
  it("returns a number within the specified range", () => {
    const min = 10;
    const max = 20;
    for (let i = 0; i < 100; i++) {
      const result = secureRandomInt(min, max);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
    }
  });

  it("should return min when min equals max", () => {
    /* This test verifies the edge case where the random range is a single number.
    Here, (max - min + 1) is 1 so the modulo operation (randomValue % 1)
    will always result in 0, so this will always return out min value */
    const result = secureRandomInt(42, 42);
    expect(result).toBe(42);
  });

  it("should handle maximum integer bounds", () => {
    const DEFAULT_MAX = 2 ** 31 - 1;
    const result = secureRandomInt(DEFAULT_MAX - 10, DEFAULT_MAX);
    expect(result).toBeGreaterThanOrEqual(DEFAULT_MAX - 10);
    expect(result).toBeLessThanOrEqual(DEFAULT_MAX);
  });

  it("returns a number within the default range when no arguments are provided", () => {
    const DEFAULT_MAX = 2 ** 31 - 1;
    for (let i = 0; i < 100; i++) {
      const result = secureRandomInt();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(DEFAULT_MAX);
    }
  });

  it("throws a RangeError when min is greater than max", () => {
    expect(() => secureRandomInt(20, 10)).toThrow(RangeError);
  });
});
