// ---------------------------------------------------------------------------
// PULSE — SearchBar hover animation tests
//
// The shared search pill (feed / explore / conversations headers) grew a
// coherent hover/focus animation. These tests pin the contract:
//   - the collapsed stub hands PressableScale the shared scales
//     (SEARCH_BAR_SCALE_HOVER / SEARCH_BAR_SCALE_PRESS),
//   - web pointer hover AND keyboard focus ("lit") drive the same motion:
//     lifted surface, primary halo (opacity-100), glyph nudge
//     (SEARCH_BAR_GLYPH_NUDGE over SEARCH_BAR_TRANSITION_MS, native driver),
//     and the expanded bar's inline scale to SEARCH_BAR_SCALE_HOVER,
//   - a filled query keeps the lifted surface (persistent `engaged`) without
//     staying lit — halo / scale release on blur (transient `lit`),
//   - the halo is web-only and paints from the active primary token,
//   - under reduced motion the transition classes drop but the state still
//     changes: surface lifts, halo lights, glyph snaps instead of animating,
//     and the scale stays at rest (SearchBar's own reduced-motion rule).
// ---------------------------------------------------------------------------

import React from "react";
import { Animated, Platform } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import {
  SEARCH_BAR_GLYPH_NUDGE,
  SEARCH_BAR_SCALE_HOVER,
  SEARCH_BAR_SCALE_PRESS,
  SEARCH_BAR_TRANSITION_MS,
  SearchBar,
} from "@/components/shared/SearchBar";

let mockReducedMotion = false;

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockReducedMotion,
}));

// Lucide renders null under the global test mock (jest.setup.js), so the real
// <Icon> leaves no host node. Substituting it lets us assert the glyph tint.
jest.mock("@/components/ui/Icon", () => {
  const { View } = jest.requireActual("react-native");
  return {
    Icon: (props: Record<string, unknown>) => <View {...props} testID="icon-glyph" />,
  };
});

let lastPressableScaleProps: Record<string, unknown> | null = null;

// Pass the mock's props through to a real Pressable so hover/focus still
// fire, while recording exactly what the stub was handed.
jest.mock("@/components/ui/PressableScale", () => {
  const { Pressable } = jest.requireActual("react-native");
  return {
    PressableScale: (props: Record<string, unknown>) => {
      lastPressableScaleProps = props;
      const { children, ...rest } = props;
      return <Pressable {...rest}>{children as never}</Pressable>;
    },
  };
});

const classNameOf = (node: { props: { className?: string } }) => node.props.className ?? "";

interface ClassNode {
  props: { className?: string; style?: unknown };
  parent: ClassNode | null;
}

/**
 * Walks up from a child to the pill itself (identified by its shared h-11 box
 * model) — css-interop wrapper layers can sit between the glow / input and
 * the pill. Throws when the pill is missing so a regression fails loudly.
 */
function pillOf(start: unknown): ClassNode {
  let current = start as ClassNode | null;
  while (current) {
    const className = typeof current.props.className === "string" ? current.props.className : "";
    if (className.split(/\s+/).includes("h-11")) return current;
    current = current.parent;
  }
  throw new Error("no search pill ancestor with the shared h-11 box model");
}

const scaleOf = (pill: ClassNode): number => {
  const style = pill.props.style as { transform?: { scale?: number }[] } | undefined;
  return style?.transform?.[0]?.scale ?? 1;
};

const REST_SURFACE = "bg-neutral-100 dark:bg-neutral-800";
const LIFTED_SURFACE = "bg-neutral-200 dark:bg-neutral-700";

describe("SearchBar hover animation", () => {
  const realPlatform = Platform.OS;

  beforeEach(() => {
    mockReducedMotion = false;
    lastPressableScaleProps = null;
  });

  afterEach(() => {
    jest.replaceProperty(Platform, "OS", realPlatform);
    jest.restoreAllMocks();
  });

  describe("collapsed stub", () => {
    it("hands PressableScale the shared hover and press scales", () => {
      render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );

      expect(lastPressableScaleProps).toMatchObject({
        scaleOnHover: SEARCH_BAR_SCALE_HOVER,
        scaleOnPress: SEARCH_BAR_SCALE_PRESS,
      });
    });

    it("lifts the surface, lights the halo and nudges the glyph on web hover", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const timing = jest.spyOn(Animated, "timing");

      const { getByLabelText, getByTestId, getAllByTestId } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );

      // At rest: neutral surface, unlit halo, untinted glyph parked at 0.
      const glyph = () =>
        getAllByTestId("icon-glyph").find((node) => node.props.name === "Search");
      expect(classNameOf(getByLabelText("Search"))).toContain(REST_SURFACE);
      expect(classNameOf(getByLabelText("Search"))).toContain("transition-colors duration-150");
      expect(classNameOf(getByTestId("search-bar-glow"))).toContain("opacity-0");
      expect(glyph()?.props.color).toBe("text-tertiary");
      expect(timing.mock.calls.map((call) => call[1]?.toValue)).toEqual([0]);

      fireEvent(getByLabelText("Search"), "hoverIn");

      expect(classNameOf(getByLabelText("Search"))).toContain(LIFTED_SURFACE);
      expect(classNameOf(getByTestId("search-bar-glow"))).toContain("opacity-100");
      expect(glyph()?.props.color).toBe("primary");
      expect(timing).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: SEARCH_BAR_GLYPH_NUDGE,
          duration: SEARCH_BAR_TRANSITION_MS,
          useNativeDriver: true,
        })
      );

      fireEvent(getByLabelText("Search"), "hoverOut");

      expect(classNameOf(getByLabelText("Search"))).toContain(REST_SURFACE);
      expect(classNameOf(getByTestId("search-bar-glow"))).toContain("opacity-0");
      expect(glyph()?.props.color).toBe("text-tertiary");
      expect(timing).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ toValue: 0 })
      );
    });

    it("gives keyboard focus the same lift and releases it on blur", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByLabelText, getByTestId } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );

      fireEvent(getByLabelText("Search"), "focus");
      expect(classNameOf(getByLabelText("Search"))).toContain(LIFTED_SURFACE);
      expect(classNameOf(getByTestId("search-bar-glow"))).toContain("opacity-100");

      fireEvent(getByLabelText("Search"), "blur");
      expect(classNameOf(getByLabelText("Search"))).toContain(REST_SURFACE);
      expect(classNameOf(getByTestId("search-bar-glow"))).toContain("opacity-0");
    });

    it("animates the colour swap but not a CSS transform (spring owns scale)", () => {
      const { getByLabelText } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );

      // `transition-colors` fades the surface; scale rides PressableScale's
      // spring instead, so no `transition-all` on the stub.
      const cls = classNameOf(getByLabelText("Search"));
      expect(cls).toContain("transition-colors duration-150");
      expect(cls).not.toContain("transition-all");
    });
  });

  describe("expanded bar", () => {
    const renderExpanded = (value = "") =>
      render(
        <SearchBar
          value={value}
          onChangeText={jest.fn()}
          placeholder="Search"
          autoFocus={false}
        />
      );

    it("scales and glows while focused, releasing on blur", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByPlaceholderText, getByTestId } = renderExpanded();

      const pill = () => pillOf(getByTestId("search-bar-glow"));
      expect(scaleOf(pill())).toBe(1);
      expect(classNameOf(pill())).toContain("transition-all duration-150");
      expect(classNameOf(getByTestId("search-bar-glow"))).toContain("opacity-0");

      fireEvent(getByPlaceholderText("Search"), "focus");

      expect(scaleOf(pill())).toBe(SEARCH_BAR_SCALE_HOVER);
      expect(classNameOf(pill())).toContain(LIFTED_SURFACE);
      expect(classNameOf(getByTestId("search-bar-glow"))).toContain("opacity-100");

      fireEvent(getByPlaceholderText("Search"), "blur");

      expect(scaleOf(pill())).toBe(1);
      expect(classNameOf(pill())).toContain(REST_SURFACE);
      expect(classNameOf(getByTestId("search-bar-glow"))).toContain("opacity-0");
    });

    it("lifts on pointer hover too", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId } = renderExpanded();

      const pill = () => pillOf(getByTestId("search-bar-glow"));
      fireEvent(pill() as never, "hoverIn");
      expect(scaleOf(pill())).toBe(SEARCH_BAR_SCALE_HOVER);
      expect(classNameOf(getByTestId("search-bar-glow"))).toContain("opacity-100");

      fireEvent(pill() as never, "hoverOut");
      expect(scaleOf(pill())).toBe(1);
      expect(classNameOf(getByTestId("search-bar-glow"))).toContain("opacity-0");
    });

    it("keeps a filled query lifted but not lit after blur", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId, getAllByTestId } = renderExpanded("pulse");

      // Persistent: the typed query keeps the readable surface + primary tint…
      expect(classNameOf(pillOf(getByTestId("search-bar-glow")))).toContain(LIFTED_SURFACE);
      const glyph = getAllByTestId("icon-glyph").find((node) => node.props.name === "Search");
      expect(glyph?.props.color).toBe("primary");

      // …but the transient motion released: no halo, no scale.
      expect(classNameOf(getByTestId("search-bar-glow"))).toContain("opacity-0");
      expect(scaleOf(pillOf(getByTestId("search-bar-glow")))).toBe(1);
    });

    it("paints the halo from the active primary token", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId } = renderExpanded();

      const style = getByTestId("search-bar-glow").props.style as { boxShadow: string };
      // Light-mode primary is blue[500] #3358FF at SEARCH_BAR_GLOW_ALPHA.
      expect(style.boxShadow).toContain("rgba(51,88,255,0.45)");
    });

    it("renders the halo on web only", () => {
      jest.replaceProperty(Platform, "OS", "ios");
      const { queryByTestId } = renderExpanded();

      expect(queryByTestId("search-bar-glow")).toBeNull();
    });
  });

  describe("reduced motion", () => {
    it("drops the transition classes but still changes every state", () => {
      mockReducedMotion = true;
      jest.replaceProperty(Platform, "OS", "web");
      const timing = jest.spyOn(Animated, "timing");
      const setValue = jest.spyOn(Animated.Value.prototype, "setValue");

      const { getByPlaceholderText, getByTestId } = render(
        <SearchBar value="" onChangeText={jest.fn()} placeholder="Search" autoFocus={false} />
      );

      // No fades — the swap snaps instead.
      expect(classNameOf(pillOf(getByTestId("search-bar-glow")))).not.toContain("transition-all");
      expect(classNameOf(getByTestId("search-bar-glow"))).not.toContain("transition-opacity");

      fireEvent(getByPlaceholderText("Search"), "focus");

      // The state still changes: surface lifts, halo lights…
      expect(classNameOf(pillOf(getByTestId("search-bar-glow")))).toContain(LIFTED_SURFACE);
      expect(classNameOf(getByTestId("search-bar-glow"))).toContain("opacity-100");
      // …the scale stays at rest (SearchBar's reduced-motion rule)…
      expect(scaleOf(pillOf(getByTestId("search-bar-glow")))).toBe(1);
      // …and the glyph snaps without animating.
      expect(timing).not.toHaveBeenCalled();
      expect(setValue.mock.calls.some((call) => call[0] === SEARCH_BAR_GLYPH_NUDGE)).toBe(true);
    });

    it("pins the collapsed stub's spring scales to 1", () => {
      mockReducedMotion = true;
      render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );

      expect(lastPressableScaleProps).toMatchObject({
        scaleOnHover: 1,
        scaleOnPress: 1,
      });
    });
  });
});
