// ---------------------------------------------------------------------------
// PULSE — SearchBar hover / click animation tests
//
// The shared search pill separates two INDEPENDENT state channels and these
// tests pin that contract:
//   - HOVER (pointer, web) = a little, simple animation only: the surface
//     lifts and the glyph tints + nudges. It NEVER grows the box and never
//     paints the border, and it releases the moment hoverOut fires — even
//     while the bar is clicked.
//   - CLICK (`active`) = a flat primary border (never a glow — the old
//     boxShadow halo is gone) + the taller h-11 → h-12 box, driven through
//     layout with a `top` pin (never a scale, so neighbours re-flow instead
//     of being painted over). Armed by focus / press-in, disarmed by a
//     pointerdown outside the pill or by blur.
//   - The two COMPOSE: clicked + hovered shows the hover visuals on top of
//     the border + taller box; pulling the pointer away drops only the hover
//     half until the mouse returns.
//   - Press keeps the only transform in the system
//     (SEARCH_BAR_SQUASH_Y_PRESS ≈ 0.985) and never receives a hover scale.
//   - Under reduced motion the pill does NOT grow or transition, but every
//     state — surface, border — still changes, and the glyph snaps.
// ---------------------------------------------------------------------------

import React from "react";
import { Animated, Platform } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import {
  SEARCH_BAR_GLYPH_NUDGE,
  SEARCH_BAR_GROW_LIFT,
  SEARCH_BAR_HEIGHT_GROWN,
  SEARCH_BAR_HEIGHT_REST,
  SEARCH_BAR_SQUASH_Y_PRESS,
  SEARCH_BAR_TRANSITION_MS,
  SearchBar,
} from "@/components/shared/SearchBar";

let mockReducedMotion = false;

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockReducedMotion,
}));

// Sibling suites translate through the key-identity translator so labels can
// be asserted as raw strings; SearchBar also calls `t` for its default
// placeholder, which these tests override explicitly anyway.
jest.mock("@/hooks/useTranslation", () => ({
  t: (key: string) => key,
  useTranslation: () => ({
    t: (key: string) => key,
    tp: (key: string) => key,
    language: "fr",
  }),
}));

// Lucide renders null under the global mock (jest.setup.js), so the real
// <Icon> leaves no host node to inspect. Substitute it to read exactly what
// SearchGlyph hands the glyph — name and colour token — and to find it among
// the multiple glyphs a rendered bar hosts.
jest.mock("@/components/ui/Icon", () => {
  const { View } = jest.requireActual("react-native");
  return {
    Icon: (props: Record<string, unknown>) => <View {...props} testID="icon-glyph" />,
  };
});

// Record what SearchBar hands the press spring, then delegate to a plain
// Pressable so hover/focus/press events still land on a real host node.
let mockLastPressableScaleProps: Record<string, unknown> | null = null;

jest.mock("@/components/ui/PressableScale", () => {
  const { Pressable } = jest.requireActual("react-native");
  return {
    PressableScale: (props: Record<string, unknown>) => {
      mockLastPressableScaleProps = props;
      const { children, ...rest } = props;
      return <Pressable {...rest}>{children as never}</Pressable>;
    },
  };
});

const classNameOf = (node: { props: { className?: string } }) => node.props.className ?? "";

interface PillNode {
  props: { className?: string; style?: unknown };
}

/** Token-exact class check (`border-primary` must not match `…-dark` twins). */
const hasClass = (node: PillNode, token: string) =>
  classNameOf(node).split(/\s+/).includes(token);

const flatten = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...flatten(s) }), {});
  }
  return (style ?? {}) as Record<string, unknown>;
};

/**
 * The box state lives in the pill's LAYOUT classes (h-11 / h-12 — growth is
 * a layout swap, never a style transform); only the `top` pin rides style.
 */
const boxOf = (node: PillNode) => {
  const tokens = classNameOf(node).split(/\s+/);
  const height = tokens.includes(SEARCH_BAR_HEIGHT_GROWN)
    ? SEARCH_BAR_HEIGHT_GROWN
    : tokens.includes(SEARCH_BAR_HEIGHT_REST)
      ? SEARCH_BAR_HEIGHT_REST
      : undefined;
  return { height, top: flatten(node.props.style).top };
};

// Layout contract: rest ↔ grown, with the `top` pin on the grown box only.
const REST_BOX = { height: SEARCH_BAR_HEIGHT_REST, top: 0 };
const GROWN_BOX = { height: SEARCH_BAR_HEIGHT_GROWN, top: -SEARCH_BAR_GROW_LIFT };

const REST_SURFACE = "bg-neutral-100 dark:bg-neutral-800";
const LIFTED_SURFACE = "bg-primary-tint dark:bg-primary-tint-dark";
const REST_BORDER = "border-transparent";
const STUB_TRANSITION = "transition-[height,top,background-color,border-color]";

/**
 * A pointerdown landing OUTSIDE the pill: dispatch a real DOM event on the
 * body so SearchBar's capture-phase document listener sees it. (This is the
 * browser behaviour a click anywhere else in the page produces.)
 */
const clickOutside = () => {
  act(() => {
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
  });
};

describe("SearchBar hover / click animation (two-channel contract)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockReducedMotion = false;
    mockLastPressableScaleProps = null;
  });

  // ------------------------------------------------------------------------
  // Collapsed stub — hover never grows; click arms on press-in.
  // ------------------------------------------------------------------------
  describe("collapsed stub", () => {
    it("hands PressableScale the press squash and never a hover scale", () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={onPress} placeholder="Search" />
      );

      expect(SEARCH_BAR_SQUASH_Y_PRESS).toBeCloseTo(0.985);
      expect(mockLastPressableScaleProps).toMatchObject({
        onPress,
        scaleOnPress: SEARCH_BAR_SQUASH_Y_PRESS,
      });
      expect(
        (mockLastPressableScaleProps as Record<string, unknown> | null)?.scaleOnHover
      ).toBeUndefined();

      // The pin is a `top` offset, not a transform: the pill's single
      // transform channel stays the press spring, never a state animation.
      const pill = getByTestId("search-bar");
      expect(flatten(pill.props.style).transform).toBeUndefined();
    });

    it("lifts the surface and nudges the glyph on hover without growing", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId, getAllByTestId } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );
      const pill = getByTestId("search-bar");
      const glyph = () =>
        getAllByTestId("icon-glyph").find((node) => node.props.name === "Search");

      // Rest: rest box, rest surface, transparent border, tertiary glyph.
      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(classNameOf(pill)).toContain(REST_SURFACE);
      expect(hasClass(pill, "border-2")).toBe(true);
      expect(hasClass(pill, REST_BORDER)).toBe(true);
      expect(hasClass(pill, "border-primary")).toBe(false);
      expect(classNameOf(pill)).toContain(STUB_TRANSITION);
      expect(classNameOf(pill)).toContain(`duration-${SEARCH_BAR_TRANSITION_MS}`);
      expect(classNameOf(pill)).not.toContain("transition-all");
      expect(glyph()?.props.color).toBe("text-tertiary");

      fireEvent(pill, "hoverIn");

      // Hover = the little animation only: NO growth, NO border.
      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(classNameOf(pill)).not.toContain(SEARCH_BAR_HEIGHT_GROWN);
      expect(classNameOf(pill)).toContain(LIFTED_SURFACE);
      expect(hasClass(pill, "border-primary")).toBe(false);
      expect(glyph()?.props.color).toBe("primary");

      fireEvent(pill, "hoverOut");

      // …and it disappears the moment the pointer leaves.
      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(classNameOf(pill)).toContain(REST_SURFACE);
      expect(glyph()?.props.color).toBe("text-tertiary");
    });

    it("adds the blue border + taller box on click, keeping the channels distinct", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId, getAllByTestId } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );
      const pill = getByTestId("search-bar");
      const glyph = () =>
        getAllByTestId("icon-glyph").find((node) => node.props.name === "Search");

      fireEvent(pill, "pressIn");

      // Click = flat blue border + taller box through layout. Surface and
      // glyph stay at rest — that's hover's half, not click's.
      expect(boxOf(pill)).toEqual(GROWN_BOX);
      expect(hasClass(pill, "border-2")).toBe(true);
      expect(hasClass(pill, "border-primary")).toBe(true);
      expect(hasClass(pill, "dark:border-primary-dark")).toBe(true);
      expect(hasClass(pill, REST_BORDER)).toBe(false);
      expect(classNameOf(pill)).toContain(REST_SURFACE);
      expect(glyph()?.props.color).toBe("text-tertiary");
      expect(flatten(pill.props.style).transform).toBeUndefined();

      // Pointer over the clicked bar: the hover half renders ON TOP of it.
      fireEvent(pill, "hoverIn");
      expect(boxOf(pill)).toEqual(GROWN_BOX);
      expect(classNameOf(pill)).toContain(LIFTED_SURFACE);
      expect(glyph()?.props.color).toBe("primary");

      // Pointer leaves: the hover animation disappears, the click half stays.
      fireEvent(pill, "hoverOut");
      expect(boxOf(pill)).toEqual(GROWN_BOX);
      expect(hasClass(pill, "border-primary")).toBe(true);
      expect(classNameOf(pill)).toContain(REST_SURFACE);
      expect(glyph()?.props.color).toBe("text-tertiary");

      // A click landing anywhere outside: the click animation disappears too.
      clickOutside();
      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(hasClass(pill, REST_BORDER)).toBe(true);
      expect(hasClass(pill, "border-primary")).toBe(false);
    });

    it("arms the click state from keyboard focus and releases it on blur", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );
      const pill = getByTestId("search-bar");

      fireEvent(pill, "focus");
      expect(boxOf(pill)).toEqual(GROWN_BOX);
      expect(hasClass(pill, "border-primary")).toBe(true);

      fireEvent(pill, "blur");
      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(hasClass(pill, "border-primary")).toBe(false);
    });

    it("replays the glyph nudge on every hover-in", () => {
      jest.replaceProperty(Platform, "OS", "web");
      // Re-entry must restart the slide from wherever it currently sits.
      jest
        .spyOn(Animated.Value.prototype, "stopAnimation")
        .mockImplementation(function (this: Animated.Value, cb?: (value: number) => void) {
          cb?.(0);
        });
      const timing = jest.spyOn(Animated, "timing");
      const { getByTestId } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );
      const pill = getByTestId("search-bar");

      fireEvent(pill, "hoverIn");
      fireEvent(pill, "hoverOut");
      fireEvent(pill, "hoverIn");

      expect(timing.mock.calls.map((call) => call[1]?.toValue)).toEqual([
        0, // mount settles at rest
        SEARCH_BAR_GLYPH_NUDGE, // hover-in
        0, // hover-out
        SEARCH_BAR_GLYPH_NUDGE, // hover-in again — replays via hoverCount
      ]);
      timing.mock.calls.forEach(([, config]) => {
        expect(config).toMatchObject({
          duration: SEARCH_BAR_TRANSITION_MS,
          useNativeDriver: true,
        });
      });
    });
  });

  // ------------------------------------------------------------------------
  // Expanded (focusable field) — focus IS the click; hover stays separate.
  // ------------------------------------------------------------------------
  describe("expanded field", () => {
    const renderBar = (value = "") =>
      render(
        <SearchBar
          value={value}
          onChangeText={jest.fn()}
          placeholder="Search"
          autoFocus={false}
        />
      );

    it("grows and paints the blue border while focused, releasing on blur", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId, getByPlaceholderText } = renderBar();
      const pill = getByTestId("search-bar");

      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(classNameOf(pill)).toContain("transition-all");
      expect(classNameOf(pill)).toContain(`duration-${SEARCH_BAR_TRANSITION_MS}`);
      expect(hasClass(pill, REST_BORDER)).toBe(true);

      fireEvent(getByPlaceholderText("Search"), "focus");

      // Click (focus) = border + taller box. The surface stays at rest —
      // focus is not hover, and the glyph stays untouched too.
      expect(boxOf(pill)).toEqual(GROWN_BOX);
      expect(hasClass(pill, "border-primary")).toBe(true);
      expect(classNameOf(pill)).toContain(REST_SURFACE);

      fireEvent(getByPlaceholderText("Search"), "blur");

      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(hasClass(pill, REST_BORDER)).toBe(true);
      expect(hasClass(pill, "border-primary")).toBe(false);
    });

    it("never applies a scale transform — growth is layout, not paint", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId } = renderBar();
      const pill = getByTestId("search-bar");
      const style = flatten(pill.props.style);

      expect(style.transform).toBeUndefined();
      expect(style.top).toBe(0);
      expect(style.height).toBeUndefined();
      expect(classNameOf(pill)).toContain(SEARCH_BAR_HEIGHT_REST);
      expect(hasClass(pill, REST_BORDER)).toBe(true);
    });

    it("lifts the surface and nudges the glyph on hover without growing", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId, getAllByTestId } = renderBar();
      const pill = getByTestId("search-bar");
      const glyph = () =>
        getAllByTestId("icon-glyph").find((node) => node.props.name === "Search");

      fireEvent(pill, "hoverIn");

      // Hover's little animation only — no growth, no border.
      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(classNameOf(pill)).toContain(LIFTED_SURFACE);
      expect(hasClass(pill, "border-primary")).toBe(false);
      expect(glyph()?.props.color).toBe("primary");

      fireEvent(pill, "hoverOut");

      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(classNameOf(pill)).toContain(REST_SURFACE);
      expect(glyph()?.props.color).toBe("text-tertiary");
    });

    it("composes: mouse away drops only the hover half, outside click drops the rest", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId, getByPlaceholderText } = renderBar("pulse");
      const pill = getByTestId("search-bar");
      const input = getByPlaceholderText("Search");

      fireEvent(input, "focus"); // clicked…
      fireEvent(pill, "hoverIn"); // …and the pointer is over it

      expect(boxOf(pill)).toEqual(GROWN_BOX);
      expect(classNameOf(pill)).toContain(LIFTED_SURFACE);
      expect(hasClass(pill, "border-primary")).toBe(true);

      fireEvent(pill, "hoverOut"); // pointer leaves

      expect(boxOf(pill)).toEqual(GROWN_BOX);
      expect(classNameOf(pill)).toContain(REST_SURFACE);
      expect(hasClass(pill, "border-primary")).toBe(true);

      // A click outside: everything releases — a filled query holds nothing.
      clickOutside();
      fireEvent(input, "blur");
      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(classNameOf(pill)).toContain(REST_SURFACE);
      expect(hasClass(pill, REST_BORDER)).toBe(true);
      expect(hasClass(pill, "border-primary")).toBe(false);
    });

    it("releases everything on an outside click even with a filled query", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId, getByPlaceholderText } = renderBar("pulse");
      const pill = getByTestId("search-bar");

      fireEvent(getByPlaceholderText("Search"), "focus");
      expect(boxOf(pill)).toEqual(GROWN_BOX);
      expect(hasClass(pill, "border-primary")).toBe(true);

      clickOutside();

      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(hasClass(pill, REST_BORDER)).toBe(true);
      expect(classNameOf(pill)).toContain(REST_SURFACE);
    });

    it("never renders a glow — the click affordance is a flat border", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { queryByTestId, getByTestId, getByPlaceholderText } = renderBar();

      expect(queryByTestId("search-bar-glow")).toBeNull();

      fireEvent(getByPlaceholderText("Search"), "focus");
      const style = flatten(getByTestId("search-bar").props.style);
      expect(style.boxShadow).toBeUndefined();
    });
  });

  // ------------------------------------------------------------------------
  // Reduced motion — no growth animation, but every state still changes.
  // ------------------------------------------------------------------------
  describe("reduced motion", () => {
    it("snaps the glyph, changes state, but never grows or transitions", () => {
      mockReducedMotion = true;
      jest.replaceProperty(Platform, "OS", "web");
      const timing = jest.spyOn(Animated, "timing");
      const setValue = jest.spyOn(Animated.Value.prototype, "setValue");
      const { getByTestId, getByPlaceholderText } = render(
        <SearchBar value="" onChangeText={jest.fn()} placeholder="Search" autoFocus={false} />
      );
      const pill = getByTestId("search-bar");

      // The bar does NOT grow: SearchBar keeps its own rest height and pin
      // rather than handing control back to the Pressable wrapper.
      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(classNameOf(pill)).not.toContain(SEARCH_BAR_HEIGHT_GROWN);
      expect(classNameOf(pill)).not.toContain("transition-all");

      fireEvent(getByPlaceholderText("Search"), "focus");

      // Motion is off — every visible state still changes.
      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(hasClass(pill, "border-primary")).toBe(true);
      expect(timing).not.toHaveBeenCalled();

      fireEvent(getByPlaceholderText("Search"), "blur");
      fireEvent(pill, "hoverIn");

      // Hover lifts the surface without growing; the nudge still lands —
      // it snaps instead of animating.
      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(classNameOf(pill)).toContain(LIFTED_SURFACE);
      expect(classNameOf(pill)).not.toContain("transition-all");
      expect(setValue.mock.calls.some((call) => call[0] === SEARCH_BAR_GLYPH_NUDGE)).toBe(
        true
      );
      expect(timing).not.toHaveBeenCalled();
    });

    it("pins the collapsed stub's press squash to 1 and never grows the box", () => {
      mockReducedMotion = true;
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );

      expect(mockLastPressableScaleProps).toMatchObject({
        scaleOnPress: 1,
      });
      expect(
        (mockLastPressableScaleProps as Record<string, unknown> | null)?.scaleOnHover
      ).toBeUndefined();

      const pill = getByTestId("search-bar");
      expect(boxOf(pill)).toEqual(REST_BOX);
      fireEvent(pill, "pressIn");

      // No growth without motion — but the click state still shows as colour.
      expect(boxOf(pill)).toEqual(REST_BOX);
      expect(classNameOf(pill)).not.toContain(SEARCH_BAR_HEIGHT_GROWN);
      expect(hasClass(pill, "border-primary")).toBe(true);
    });
  });
});
