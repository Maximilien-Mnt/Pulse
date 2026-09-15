// ---------------------------------------------------------------------------
// PULSE — Accessibility contract primitives
//
// Unit tests for src/accessibility.ts / src/accessibility-contract.ts:
// 44x44 hit-area helpers must guarantee a touch target of at least 44pt for
// small icons and return undefined when the visual size is already large
// enough (so oversized callers pay no extra hit area).
// ---------------------------------------------------------------------------

import {
  MIN_HIT_AREA,
  iconHitSlop44,
  hitSlopForIcon,
  CLOSE_LABEL,
  BACK_LABEL,
  CANCEL_LABEL,
  SAVE_LABEL,
  DELETE_LABEL,
  MODAL_ANNOUNCEMENT_PROPS,
} from "@/src/accessibility";
import {
  hitSlopForIconSize,
  hitSlop44,
} from "@/src/accessibility-contract";

function totalSize(size: number, slop: { top: number; left: number }) {
  return size + slop.top + slop.left;
}

describe("44x44 hit-area helpers", () => {
  it("exposes the platform-recommended minimum touch target", () => {
    expect(MIN_HIT_AREA).toBe(44);
  });

  it("brings a small icon up to at least 44pt with hitSlopForIcon", () => {
    for (const size of [16, 20, 24, 32, 40, 43]) {
      const slop = hitSlopForIcon(size);
      expect(slop).toBeDefined();
      expect(totalSize(size, slop!)).toBeGreaterThanOrEqual(MIN_HIT_AREA);
    }
  });

  it("uses the documented inset for a 20px icon (12pt each side)", () => {
    expect(hitSlopForIcon(20)).toEqual({ top: 12, right: 12, bottom: 12, left: 12 });
    expect(totalSize(20, iconHitSlop44)).toBe(MIN_HIT_AREA);
  });

  it("returns undefined when the visual size already covers the hit area", () => {
    expect(hitSlopForIcon(44)).toBeUndefined();
    expect(hitSlopForIcon(48)).toBeUndefined();
    expect(hitSlopForIconSize(44)).toBeUndefined();
  });

  it("rounds the slack up so odd sizes still reach 44pt", () => {
    const slop = hitSlopForIcon(21);
    expect(slop).toEqual({ top: 12, right: 12, bottom: 12, left: 12 });
    expect(totalSize(21, slop!)).toBeGreaterThanOrEqual(MIN_HIT_AREA);
  });

  it("honours the optional extra inset from the contract helper", () => {
    // `extra` is added to the per-side slack: ceil((44-20)/2) + 4 = 16,
    // so the effective target grows beyond the 44pt minimum.
    const slop = hitSlopForIconSize(20, { extra: 4 });
    expect(slop).toEqual({ top: 16, right: 16, bottom: 16, left: 16 });
    expect(totalSize(20, slop!)).toBe(52);
  });

  it("compact alias behaves like hitSlopForIconSize without extra", () => {
    expect(hitSlop44(24)).toEqual(hitSlopForIconSize(24));
  });
});

describe("shared accessibility constants", () => {
  it("exports the common action labels", () => {
    expect(typeof CLOSE_LABEL).toBe("string");
    expect(typeof BACK_LABEL).toBe("string");
    expect(typeof CANCEL_LABEL).toBe("string");
    expect(typeof SAVE_LABEL).toBe("string");
    expect(typeof DELETE_LABEL).toBe("string");
  });

  it("marks modal content for screen readers", () => {
    expect(MODAL_ANNOUNCEMENT_PROPS).toEqual({ accessibilityViewIsModal: true });
  });
});

