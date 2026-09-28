// ---------------------------------------------------------------------------
// PULSE — Shared Arrow tests
//
// Every arrow control in the app (profile link cards, back buttons, settings
// rows, carousel overlays, form disclosures) renders through
// components/ui/Arrow.tsx. These tests pin the contract that keeps them
// identical:
//   - the direction map is the single source of truth for which icons nudge
//     and along which axis, so no screen can hand-roll its own offset,
//   - hover (web pointer) and focus/blur (keyboard, cross-platform) drive the
//     nudge, and it releases when the owning pressable becomes disabled,
//   - <Arrow> renders the design-system <Icon> glyph and travels exactly
//     ARROW_NUDGE px along the icon's axis, snapping without animation when
//     the user prefers reduced motion.
// ---------------------------------------------------------------------------

import React from "react";
import { Animated, Platform, Pressable, Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import {
  ARROW_NUDGE,
  ARROW_NUDGE_DURATION,
  Arrow,
  arrowNudgeVector,
  isArrowIcon,
  useArrowNudge,
  type ArrowNudgeHandlers,
} from "@/components/ui/Arrow";

let mockReducedMotion = false;

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockReducedMotion,
}));

// Lucide renders `null` under the global test mock (jest.setup.js), so the real
// <Icon> leaves no host node to inspect. Substituting it lets us assert exactly
// what <Arrow> hands the design-system glyph — name, size and color token.
jest.mock("@/components/ui/Icon", () => {
  const { View } = jest.requireActual("react-native");
  return {
    Icon: (props: Record<string, unknown>) => <View {...props} testID="arrow-icon" />,
  };
});

/** Minimal owner of the hook, mirroring how screens wire it to a pressable. */
let lastHandlers: ArrowNudgeHandlers | null = null;

function NudgeHarness({ disabled = false }: { disabled?: boolean }) {
  const handlers = useArrowNudge({ disabled });
  lastHandlers = handlers;
  const { active, ...nudge } = handlers;
  return (
    <Pressable {...nudge} testID="nudge-target">
      <Text>{active ? "active" : "idle"}</Text>
    </Pressable>
  );
}

describe("arrowNudgeVector", () => {
  it.each([
    ["ChevronLeft", { x: -1, y: 0 }],
    ["ArrowLeft", { x: -1, y: 0 }],
    ["ChevronRight", { x: 1, y: 0 }],
    ["ArrowRight", { x: 1, y: 0 }],
    ["ChevronDown", { x: 0, y: 1 }],
    ["ChevronUp", { x: 0, y: -1 }],
  ] as const)("points %s along its axis", (name, vector) => {
    expect(arrowNudgeVector(name)).toEqual(vector);
  });

  it("leaves non-directional icons still", () => {
    expect(arrowNudgeVector("Heart")).toEqual({ x: 0, y: 0 });
    expect(arrowNudgeVector("Search")).toEqual({ x: 0, y: 0 });
    // The sort-direction glyph is not an affordance, so it never moves.
    expect(arrowNudgeVector("ArrowUpDown")).toEqual({ x: 0, y: 0 });
  });
});

describe("isArrowIcon", () => {
  it("recognises every directional arrow", () => {
    for (const name of [
      "ChevronLeft",
      "ChevronRight",
      "ChevronUp",
      "ChevronDown",
      "ArrowLeft",
      "ArrowRight",
    ] as const) {
      expect(isArrowIcon(name)).toBe(true);
    }
  });

  it("rejects non-directional icons", () => {
    expect(isArrowIcon("Heart")).toBe(false);
    expect(isArrowIcon("ArrowUpDown")).toBe(false);
  });
});


describe("useArrowNudge", () => {
  beforeEach(() => {
    mockReducedMotion = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("is idle until focus and releases on blur", () => {
    const { getByTestId, getByText } = render(<NudgeHarness />);
    expect(getByText("idle")).toBeTruthy();

    fireEvent(getByTestId("nudge-target"), "focus");
    expect(getByText("active")).toBeTruthy();

    fireEvent(getByTestId("nudge-target"), "blur");
    expect(getByText("idle")).toBeTruthy();
  });

  it("exposes hover handlers on web only", () => {
    jest.replaceProperty(Platform, "OS", "web");
    const web = render(<NudgeHarness />);
    expect(typeof lastHandlers?.onHoverIn).toBe("function");
    expect(typeof lastHandlers?.onHoverOut).toBe("function");
    web.unmount();

    jest.replaceProperty(Platform, "OS", "ios");
    render(<NudgeHarness />);
    expect(lastHandlers?.onHoverIn).toBeUndefined();
    expect(lastHandlers?.onHoverOut).toBeUndefined();
    // Keyboard focus stays available off web — it is the same affordance.
    expect(typeof lastHandlers?.onFocus).toBe("function");
    expect(typeof lastHandlers?.onBlur).toBe("function");
  });

  it("follows pointer hover on web", () => {
    jest.replaceProperty(Platform, "OS", "web");
    const { getByTestId, getByText } = render(<NudgeHarness />);

    fireEvent(getByTestId("nudge-target"), "hoverIn");
    expect(getByText("active")).toBeTruthy();

    fireEvent(getByTestId("nudge-target"), "hoverOut");
    expect(getByText("idle")).toBeTruthy();
  });

  it("never activates while the pressable is disabled", () => {
    const { getByTestId, getByText } = render(<NudgeHarness disabled />);

    fireEvent(getByTestId("nudge-target"), "focus");
    expect(getByText("idle")).toBeTruthy();
  });

  it("releases the nudge when the pressable becomes disabled", () => {
    const { getByTestId, getByText, rerender } = render(<NudgeHarness />);

    fireEvent(getByTestId("nudge-target"), "focus");
    expect(getByText("active")).toBeTruthy();

    rerender(<NudgeHarness disabled />);
    expect(getByText("idle")).toBeTruthy();
  });
});

describe("Arrow", () => {
  beforeEach(() => {
    mockReducedMotion = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the glyph through the design-system Icon", () => {
    const { getByTestId } = render(
      <Arrow name="ChevronRight" size={20} color="text-tertiary" />
    );

    const icon = getByTestId("arrow-icon");
    expect(icon.props.name).toBe("ChevronRight");
    expect(icon.props.size).toBe(20);
    expect(icon.props.color).toBe("text-tertiary");
  });

  it.each([
    ["ChevronRight", ARROW_NUDGE, 0],
    ["ChevronLeft", -ARROW_NUDGE, 0],
    ["ChevronDown", 0, ARROW_NUDGE],
    ["ChevronUp", 0, -ARROW_NUDGE],
  ] as const)("nudges %s along its axis while active", (name, x, y) => {
    const timing = jest.spyOn(Animated, "timing");

    render(<Arrow name={name} active />);

    // The X axis is animated first, then the Y axis (see Arrow's effect).
    expect(timing.mock.calls.map((call) => call[1]?.toValue)).toEqual([x, y]);
    for (const call of timing.mock.calls) {
      expect(call[1]?.duration).toBe(ARROW_NUDGE_DURATION);
      expect(call[1]?.useNativeDriver).toBe(true);
    }
  });

  it("stays at rest while inactive", () => {
    const timing = jest.spyOn(Animated, "timing");

    render(<Arrow name="ChevronRight" />);

    expect(timing.mock.calls.map((call) => call[1]?.toValue)).toEqual([0, 0]);
  });

  it("snaps to the offset instead of animating under reduced motion", () => {
    mockReducedMotion = true;
    const timing = jest.spyOn(Animated, "timing");
    const setValue = jest.spyOn(Animated.Value.prototype, "setValue");

    render(<Arrow name="ChevronRight" active />);

    expect(timing).not.toHaveBeenCalled();
    expect(setValue.mock.calls.some((call) => call[0] === ARROW_NUDGE)).toBe(true);
  });
});

