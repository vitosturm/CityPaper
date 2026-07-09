import { describe, it, expect } from "vitest";
import { validateInput } from "./input.guardrail.js";

describe("validateInput", () => {
  it("accepts a valid city name", () => {
    const result = validateInput({ city: "Berlin" });
    expect(result.valid).toBe(true);
  });

  it("accepts a valid city with coordinates", () => {
    const result = validateInput({ city: "Berlin", lat: 52.5, lng: 13.4 });
    expect(result.valid).toBe(true);
  });

  it("rejects a single character city", () => {
    const result = validateInput({ city: "B" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/too short/i);
  });

  it("rejects script injection", () => {
    const result = validateInput({ city: "<script>alert(1)</script>" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/invalid/i);
  });

  it("rejects SQL injection", () => {
    const result = validateInput({ city: "'; DROP TABLE cities;--" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/invalid/i);
  });

  it("rejects out-of-range latitude", () => {
    const result = validateInput({ city: "Berlin", lat: 999, lng: 13.4 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/coordinates/i);
  });

  it("rejects out-of-range longitude", () => {
    const result = validateInput({ city: "Berlin", lat: 52.5, lng: 999 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/coordinates/i);
  });
});
