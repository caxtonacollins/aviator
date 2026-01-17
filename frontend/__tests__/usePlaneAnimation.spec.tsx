import { describe, it, expect } from "vitest";
import { calculatePlanePosition } from "@/hooks/usePlaneAnimation";

describe("calculatePlanePosition", () => {
  it("produces consistent positions and monotonic x", () => {
    const p0 = calculatePlanePosition(0);
    const pMid = calculatePlanePosition(5000);
    const pEnd = calculatePlanePosition(15000);

    expect(p0.x).toBeGreaterThanOrEqual(10);
    expect(pMid.x).toBeGreaterThan(p0.x);
    expect(pEnd.x).toBeGreaterThanOrEqual(80);

    expect(p0.y).toBeGreaterThanOrEqual(0);
    expect(pMid.y).toBeGreaterThanOrEqual(0);
    expect(pEnd.y).toBeGreaterThanOrEqual(0);
  });
});
