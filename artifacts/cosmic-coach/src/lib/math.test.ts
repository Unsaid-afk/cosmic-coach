import { describe, it, expect } from "vitest";

describe("Math Utils", () => {
  it("should calculate percentages correctly", () => {
    const value = 5;
    const total = 10;
    expect((value / total) * 100).toBe(50);
  });
});
