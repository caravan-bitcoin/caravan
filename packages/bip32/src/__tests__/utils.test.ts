import { describe, expect, it } from 'vitest';

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
