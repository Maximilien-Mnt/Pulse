// ---------------------------------------------------------------------------
// PULSE — Nav tab motion tests
//
// Covers the shared navigation micro-interaction used by both bars
// (SideRail — vertical, TabBar — bottom):
//   - hover (web) and focus/blur (keyboard, cross-platform) both LIFT an
//     inactive tab to the shared hover surface, faded over the shared duration,
//   - the SELECTED tab never lifts, so the sliding active tint stays the one
//     thing the user reads as "current",
//   - scale springs come from PressableScale (shared hover/press constants),
//   - the sliding indicator springs between measured rows and SNAPS (no spring)
//     on its very first placement,
//   - under prefers-reduced-motion the indicator snaps and paints no tint,
//     so the active tab falls back to a static per-row tint instead.
// ---------------------------------------------------------------------------

import React from "react";
import { Animated, Platform, Text, View } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import {
  NavTab,
  useSlidingIndicator,
  NAV_INDICATOR_SPRING,
} from "@/components/shared/NavTabMotion";
import {
  ICON_BUTTON_SCALE_HOVER,
  ICON_BUTTON_SCALE_PRESS,
  ICON_BUTTON_TRANSITION_MS,
} from "@/components/ui/IconButton";

let mockReducedMotion = false;

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockReducedMotion,
}));

let lastPressableScaleProps: Record<string, unknown> | null = null;

// <PressableScale> is a thin animation wrapper; pass its props through to a
// real Pressable so hover/focus still work, while recording what it was given.
jest.mock("@/components/ui/PressableScale", () => {
  const { Pressable } = jest.requireActual("react-native");
  return {
    PressableScale: (props: Record<string, unknown>) => {
      lastPressableScaleProps = props;
      return <Pressable {...props} />;
    },
  };
});

const LIFT_CLASS = "bg-neutral-100 dark:bg-neutral-800";

const classNameOf = (node: { props: { className?: string } }) => node.props.className ?? "";

beforeEach(() => {
  mockReducedMotion = false;
  lastPressableScaleProps = null;
  // Hover is a web-pointer affordance and NavTab (like PressableScale) only
  // wires onHoverIn there. The jest-expo preset defaults to a native platform,
  // so force web to exercise the hover path.
  Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// NavTab
// ---------------------------------------------------------------------------

describe("NavTab", () => {
  it("lifts an inactive tab on hover", () => {
    const { getByTestId } = render(
      <NavTab active={false} testID="tab">
        <Text>Feed</Text>
      </NavTab>
    );
    expect(classNameOf(getByTestId("tab"))).not.toContain(LIFT_CLASS);

    fireEvent(getByTestId("tab"), "hoverIn");

    expect(classNameOf(getByTestId("tab"))).toContain(LIFT_CLASS);
  });

  it("drops the lift on hover out", () => {
    const { getByTestId } = render(
      <NavTab active={false} testID="tab">
        <Text>Feed</Text>
      </NavTab>
    );
    fireEvent(getByTestId("tab"), "hoverIn");
    fireEvent(getByTestId("tab"), "hoverOut");

    expect(classNameOf(getByTestId("tab"))).not.toContain(LIFT_CLASS);
  });

  it("fades the lift over the shared transition duration", () => {
    const { getByTestId } = render(
      <NavTab active={false} testID="tab">
        <Text>Feed</Text>
      </NavTab>
    );

    const cls = classNameOf(getByTestId("tab"));
    expect(cls).toContain("transition-colors");
    expect(cls).toContain(`duration-${ICON_BUTTON_TRANSITION_MS}`);
  });

  it("drives the lift from keyboard focus too, so it is never mouse-only", () => {
    const { getByTestId } = render(
      <NavTab active={false} testID="tab">
        <Text>Feed</Text>
      </NavTab>
    );

    fireEvent(getByTestId("tab"), "focus");
    expect(classNameOf(getByTestId("tab"))).toContain(LIFT_CLASS);

    fireEvent(getByTestId("tab"), "blur");
    expect(classNameOf(getByTestId("tab"))).not.toContain(LIFT_CLASS);
  });

  it("never lifts the selected tab — the sliding tint owns that state", () => {
    const { getByTestId } = render(
      <NavTab active testID="tab">
        <Text>Feed</Text>
      </NavTab>
    );

    fireEvent(getByTestId("tab"), "hoverIn");
    fireEvent(getByTestId("tab"), "focus");

    expect(classNameOf(getByTestId("tab"))).not.toContain(LIFT_CLASS);
  });

  it("uses the shared hover and press scale springs", () => {
    render(
      <NavTab active={false} testID="tab">
        <Text>Feed</Text>
      </NavTab>
    );

    expect(lastPressableScaleProps?.scaleOnHover).toBe(ICON_BUTTON_SCALE_HOVER);
    expect(lastPressableScaleProps?.scaleOnPress).toBe(ICON_BUTTON_SCALE_PRESS);
  });

  it("keeps consumers' own classes alongside the motion classes", () => {
    const { getByTestId } = render(
      <NavTab active={false} testID="tab" className="flex-1 items-center h-full">
        <Text>Feed</Text>
      </NavTab>
    );

    const cls = classNameOf(getByTestId("tab"));
    expect(cls).toContain("flex-1");
    expect(cls).toContain("items-center");
    expect(cls).toContain("h-full");
  });

  it("still renders content when laid out as an underlay", () => {
    const { getByTestId } = render(
      <NavTab active={false} underlay testID="tab">
        <Text testID="content">Feed</Text>
      </NavTab>
    );

    expect(getByTestId("content")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// useSlidingIndicator
// ---------------------------------------------------------------------------

/** Minimal harness exposing the hook's controls to the test. */
function IndicatorHarness({ rows }: { rows: number }) {
  const { recordRow, syncTo, invalidate, indicatorStyle } = useSlidingIndicator(rows);

  return (
    <View testID="harness">
      <Animated.View testID="indicator" style={indicatorStyle} />
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          testID={`row-${i}`}
          onLayout={() => recordRow(i, i * 50, 44)}
        />
      ))}
      <View testID="sync-0" onLayout={() => syncTo(0)} />
      <View testID="sync-2" onLayout={() => syncTo(2)} />
      <View testID="invalidate" onLayout={invalidate} />
    </View>
  );
}

/** Fires a synthetic layout on every row so measurements are populated. */
const measureRows = (getByTestId: (id: string) => { props: object }, n: number) => {
  for (let i = 0; i < n; i += 1) {
    fireEvent(getByTestId(`row-${i}`), "layout");
  }
};

describe("useSlidingIndicator", () => {
  it("snaps to the first row instead of springing on mount", () => {
    const spring = jest.spyOn(Animated, "spring");
    const { getByTestId } = render(<IndicatorHarness rows={3} />);

    measureRows(getByTestId, 3);
    fireEvent(getByTestId("sync-0"), "layout");

    expect(spring).not.toHaveBeenCalled();
  });

  it("springs between rows once it has been placed", () => {
    const spring = jest.spyOn(Animated, "spring");
    const { getByTestId } = render(<IndicatorHarness rows={3} />);

    measureRows(getByTestId, 3);
    fireEvent(getByTestId("sync-0"), "layout"); // first placement → snap
    fireEvent(getByTestId("sync-2"), "layout"); // move → spring

    expect(spring).toHaveBeenCalled();
    // Row 2 sits at y = 100 in the harness.
    expect(spring.mock.calls.map((call) => call[1]?.toValue)).toContain(100);
    for (const call of spring.mock.calls) {
      expect(call[1]?.friction).toBe(NAV_INDICATOR_SPRING.friction);
      expect(call[1]?.tension).toBe(NAV_INDICATOR_SPRING.tension);
      // `top` is not a native-driver property.
      expect(call[1]?.useNativeDriver).toBe(false);
    }
  });

  it("does not animate until a row has been measured", () => {
    const spring = jest.spyOn(Animated, "spring");
    const { getByTestId } = render(<IndicatorHarness rows={3} />);

    // No row measurements yet.
    fireEvent(getByTestId("sync-2"), "layout");

    expect(spring).not.toHaveBeenCalled();
  });

  it("re-places without animating after the geometry is invalidated", () => {
    const spring = jest.spyOn(Animated, "spring");
    const { getByTestId } = render(<IndicatorHarness rows={3} />);

    measureRows(getByTestId, 3);
    fireEvent(getByTestId("sync-0"), "layout"); // first placement → snap
    fireEvent(getByTestId("invalidate"), "layout"); // breakpoint switch
    fireEvent(getByTestId("sync-2"), "layout"); // first placement again → snap

    expect(spring).not.toHaveBeenCalled();
  });

  it("paints no animated indicator under reduced motion", () => {
    mockReducedMotion = true;
    const spring = jest.spyOn(Animated, "spring");
    const { getByTestId } = render(<IndicatorHarness rows={3} />);

    measureRows(getByTestId, 3);
    fireEvent(getByTestId("sync-0"), "layout");

    expect(spring).not.toHaveBeenCalled();
    // indicatorStyle is null (no `top`/`height` to drive), so the consumer
    // falls back to a static per-row tint on the active tab itself.
    expect(getByTestId("indicator").props.style ?? null).toBeNull();
  });

  it("ignores out-of-range indices", () => {
    const spring = jest.spyOn(Animated, "spring");
    const setValue = jest.spyOn(Animated.Value.prototype, "setValue");
    const { getByTestId } = render(<IndicatorHarness rows={2} />);

    measureRows(getByTestId, 2);
    fireEvent(getByTestId("sync-2"), "layout"); // index 2 does not exist

    expect(spring).not.toHaveBeenCalled();
    expect(setValue).not.toHaveBeenCalled();
  });
});

