import { describe, it, expect } from "vitest";
import { midKey, between, increment, decrement } from "../../src/lib/order";

describe("order", () => {
  describe("midKey", () => {
    it("returns a stable default key", () => {
      expect(midKey()).toBe("n0");
    });
  });

  describe("between", () => {
    it("returns midKey when both boundaries are null", () => {
      expect(between(null, null)).toBe("n0");
    });

    it("generates a key less than the upper bound", () => {
      const result = between(null, "n0");
      expect(result < "n0").toBe(true);
    });

    it("generates a key greater than the lower bound", () => {
      const result = between("n0", null);
      expect(result > "n0").toBe(true);
    });

    it("generates a key between two bounds", () => {
      const result = between("a", "z");
      expect(result > "a").toBe(true);
      expect(result < "z").toBe(true);
    });

    it("handles adjacent characters by extending depth", () => {
      const result = between("a", "b");
      expect(result > "a").toBe(true);
      expect(result < "b").toBe(true);
    });

    it("produces ordered keys across multiple inserts", () => {
      const keys: string[] = [];
      let prev: string | null = null;
      for (let i = 0; i < 10; i++) {
        const key = between(prev, null);
        if (prev) expect(key > prev).toBe(true);
        keys.push(key);
        prev = key;
      }
      // Verify the full list is sorted
      const sorted = [...keys].sort();
      expect(keys).toEqual(sorted);
    });
  });

  describe("increment / decrement", () => {
    it("increment produces a larger key", () => {
      expect(increment("n0") > "n0").toBe(true);
    });

    it("decrement produces a smaller key", () => {
      expect(decrement("n0") < "n0").toBe(true);
    });
  });
});
