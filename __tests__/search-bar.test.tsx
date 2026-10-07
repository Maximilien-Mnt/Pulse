// ---------------------------------------------------------------------------
// PULSE — SearchBar hover animation tests
//
// The shared search pill used to fake its hover grow with a `scaleY` on the
// wrapper, which painted over neighbouring header items (hamburger,
// breadcrumb, right cluster) at every scale > 1. These tests pin the
// bounds-safe contract of its replacement:
//   - NO scale anywhere: hover growth is a layout swap (h-11 → h-12) with a
//     `top` pin so the bottom edge stays put — the pill grows up, never out.
//   - The only transform in the system is PressableScale's press squash,
//     held under SEARCH_BAR_SQUASH_Y_PRESS (≈ 0.985), passed straight
//     through and never animated on hover.
//   - Hover writes layout + surface colour only (150ms, exactly the
//     height / top / background-color properties), so `top` composes with
//     the press spring instead of fighting it.
//   - `lit` (pointer or focus) is the replayable motion channel: the glyph
//     re-nudges on every hover-in via hoverCount; `engaged` (lit or query)
//     is the persistent state that keeps the pill grown + lifted.
//   - Under reduced motion the pill does NOT grow (SearchBar keeps its own
//     rest height and pin) and the press squash pins to 1, but every state
//     — surface, halo, tint — still changes.
// ---------------------------------------------------------------------------

import React from "react";
import { Animated, Platform } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
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

interface ClassNode {
  props: { className?: string; style?: unknown };
  parent: ClassNode | null;
}

/**
 * Walks up from a child to the pill itself (identified by its shared height
 * box — h-11 at rest, h-12 when grown) — css-interop wrapper layers can sit
 * between the glow / input and the pill. Throws when the pill is missing so
 * a regression fails loudly.
 */
function pillOf(start: unknown): ClassNode {
  let current = start as ClassNode | null;
  while (current) {
    const className = typeof current.props.className === "string" ? current.props.className : "";
    const tokens = className.split(/\s+/);
    if (tokens.includes(SEARCH_BAR_HEIGHT_REST) || tokens.includes(SEARCH_BAR_HEIGHT_GROWN)) {
      return current;
    }
    current = current.parent;
  }
  throw new Error("no search pill ancestor with the shared rest/grown height box");
}

/** The pill's box contract: height class + the bottom-pinning `top` offset. */
const boxOf = (pill: ClassNode): { height: string; top: number } => {
  const tokens = classNameOf(pill).split(/\s+/);
  let height = "missing-height-class";
  if (tokens.includes(SEARCH_BAR_HEIGHT_GROWN)) height = SEARCH_BAR_HEIGHT_GROWN;
  else if (tokens.includes(SEARCH_BAR_HEIGHT_REST)) height = SEARCH_BAR_HEIGHT_REST;

  // Host style can be an object or a style array (Pressable wraps) — flatten
  // one level to read the pin the same way the browser would compute it.
  const raw = pill.props.style as unknown;
  const entries = Array.isArray(raw) ? raw : [raw];
  const flat: Record<string, unknown> = {};
  for (const entry of entries) {
    if (entry && typeof entry === "object") Object.assign(flat, entry);
  }
  return { height, top: typeof flat.top === "number" ? flat.top : 0 };
};

const REST_SURFACE = "bg-neutral-100 dark:bg-neutral-800";
const LIFTED_SURFACE = "bg-neutral-200 dark:bg-neutral-700";
/** Grown box: h-12 lifted by SEARCH_BAR_GROW_LIFT so the bottom edge pins. */
const GROWN_BOX = { height: SEARCH_BAR_HEIGHT_GROWN, top: -SEARCH_BAR_GROW_LIFT };
const REST_BOX = { height: SEARCH_BAR_HEIGHT_REST, top: 0 };

describe("SearchBar hover animation (bounds-safe contract)", () => {
  beforeEach(() => {
    mockReducedMotion = false;
    mockLastPressableScaleProps = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Collapsed stub — the pressable pill shown in packed headers.
  // -------------------------------------------------------------------------
  describe("collapsed stub", () => {
    it("hands PressableScale the press squash and never a hover scale", () => {
      const onPress = jest.fn();
      render(<SearchBar value="" onChangeText={jest.fn()} onPress={onPress} />);

      expect(SEARCH_BAR_SQUASH_Y_PRESS).toBeCloseTo(0.985);
      expect(mockLastPressableScaleProps).toMatchObject({
        onPress,
        scaleOnPress: SEARCH_BAR_SQUASH_Y_PRESS,
      });
      // Hover must never hand the spring a competing target.
      expect(
        (mockLastPressableScaleProps as Record<string, unknown> | null)?.scaleOnHover
      ).toBeUndefined();
      // The pin is a `top` offset, not a transform: the pill's single
      // transform channel stays the press spring's.
      expect((mockLastPressableScaleProps?.style as { transform?: unknown }).transform).toBeUndefined();
    });

    it("grows the layout box, lifts the surface, lights the halo and nudges the glyph on hover", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByLabelText, getByTestId, getAllByTestId } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );
      const pill = getByLabelText("Search");
      const glow = () => getByTestId("search-bar-glow");
      const glyph = () =>
        getAllByTestId("icon-glyph").find((node) => node.props.name === "Search");

      // At rest: rest box (bottom pinned at the row line), rest surface,
      // halo off, tertiary glyph.
      expect(boxOf(pill as never)).toEqual(REST_BOX);
      expect(classNameOf(pill)).toContain(REST_SURFACE);
      expect(classNameOf(glow())).toContain("opacity-0");
      expect(glyph()?.props.color).toBe("text-tertiary");
      // Exactly the hover-driven properties — `transition-all` would also
      // tween the transform the press spring writes every frame.
      expect(classNameOf(pill)).toContain("transition-[height,top,background-color]");
      expect(classNameOf(pill)).toContain(`duration-${SEARCH_BAR_TRANSITION_MS}`);

      fireEvent(pill, "hoverIn");

      // Grown via layout (h-11 → h-12) with the `top` pin — taller, never
      // wider, bottom edge still on the row line.
      expect(boxOf(pill as never)).toEqual(GROWN_BOX);
      expect(classNameOf(pill)).toContain(LIFTED_SURFACE);
      expect(classNameOf(glow())).toContain("opacity-100");
      expect(glyph()?.props.color).toBe("primary");

      fireEvent(pill, "hoverOut");

      expect(boxOf(pill as never)).toEqual(REST_BOX);
      expect(classNameOf(pill)).toContain(REST_SURFACE);
      expect(classNameOf(glow())).toContain("opacity-0");
      expect(glyph()?.props.color).toBe("text-tertiary");
    });

    it("gives keyboard focus the same grow, lift and halo, releasing on blur", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByLabelText, getByTestId, getAllByTestId } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );
      const pill = getByLabelText("Search");
      const glow = () => getByTestId("search-bar-glow");
      const glyph = () =>
        getAllByTestId("icon-glyph").find((node) => node.props.name === "Search");

      // Focus is the same `lit` affordance as hover — identical box.
      fireEvent(pill, "focus");
      expect(boxOf(pill as never)).toEqual(GROWN_BOX);
      expect(classNameOf(pill)).toContain(LIFTED_SURFACE);
      expect(classNameOf(glow())).toContain("opacity-100");
      expect(glyph()?.props.color).toBe("primary");

      fireEvent(pill, "blur");
      expect(boxOf(pill as never)).toEqual(REST_BOX);
      expect(classNameOf(pill)).toContain(REST_SURFACE);
      expect(classNameOf(glow())).toContain("opacity-0");
      expect(glyph()?.props.color).toBe("text-tertiary");
    });

    it("replays the glyph nudge when hover arrives after focus", () => {
      jest.replaceProperty(Platform, "OS", "web");
      // The jest native-driver mock never answers NativeAnimatedAPI.getValue,
      // so once the glyph's Animated.Value goes native (first timing with
      // useNativeDriver) every later stopAnimation callback is dropped and
      // the replay never reaches Animated.timing. Restore the JS-driver
      // contract — the synchronous one react-native-web runs in the browser —
      // so SearchGlyph's own effect logic is what these assertions observe.
      jest
        .spyOn(Animated.Value.prototype, "stopAnimation")
        .mockImplementation((callback?: ((value: number) => void) | null) => {
          callback?.(0);
        });
      const timing = jest.spyOn(Animated, "timing");
      const { getByLabelText } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );
      const pill = getByLabelText("Search");

      // Mount settles at rest, focus plays the nudge…
      fireEvent(pill, "focus");
      // …and hover-in replays it even though `lit` held the same value —
      // hoverCount bumps the replay key instead of the flag staying flat.
      fireEvent(pill, "hoverIn");

      expect(timing.mock.calls.map((call) => call[1]?.toValue)).toEqual([
        0,
        SEARCH_BAR_GLYPH_NUDGE,
        SEARCH_BAR_GLYPH_NUDGE,
      ]);
      for (const call of timing.mock.calls) {
        expect(call[1]?.duration).toBe(SEARCH_BAR_TRANSITION_MS);
        expect(call[1]?.useNativeDriver).toBe(true);
      }
    });

    it("names exactly the hover-driven transition properties on the stub", () => {
      const { getByLabelText } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );
      const cls = classNameOf(getByLabelText("Search"));

      expect(cls).toContain("transition-[height,top,background-color]");
      expect(cls).toContain(`duration-${SEARCH_BAR_TRANSITION_MS}`);
      // transition-all would also tween `transform`, fighting the press
      // spring; transition-colors would tween the pin away from `top`.
      expect(cls).not.toContain("transition-all");
      expect(cls).not.toContain("transition-colors");
    });
  });

  // -------------------------------------------------------------------------
  // Expanded bar — the full inline input (no onPress / expanded).
  // -------------------------------------------------------------------------
  describe("expanded bar", () => {
    const renderBar = (value = "", props: { autoFocus?: boolean } = {}) =>
      render(
        <SearchBar
          value={value}
          onChangeText={jest.fn()}
          placeholder="Search"
          autoFocus={props.autoFocus ?? false}
        />
      );

    it("grows and glows while focused, releasing on blur", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByPlaceholderText, getByTestId } = renderBar();
      const pill = () => pillOf(getByTestId("search-bar-glow"));
      const glow = () => getByTestId("search-bar-glow");

      expect(boxOf(pill())).toEqual(REST_BOX);
      expect(classNameOf(pill())).toContain(REST_SURFACE);

      fireEvent(getByPlaceholderText("Search"), "focus");
      expect(boxOf(pill())).toEqual(GROWN_BOX);
      expect(classNameOf(pill())).toContain(LIFTED_SURFACE);
      expect(classNameOf(glow())).toContain("opacity-100");

      fireEvent(getByPlaceholderText("Search"), "blur");
      expect(boxOf(pill())).toEqual(REST_BOX);
      expect(classNameOf(pill())).toContain(REST_SURFACE);
      expect(classNameOf(glow())).toContain("opacity-0");
    });

    it("never applies a scale transform — growth is layout, not paint", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId } = renderBar();
      const style = (pillOf(getByTestId("search-bar-glow")) as never as {
        props: { style?: unknown };
      }).props.style;

      // The pin rides `top` in style; there is no transform channel at all.
      expect(style).toBeDefined();
      expect(
        (style as { transform?: unknown } | undefined)?.transform
      ).toBeUndefined();
    });

    it("grows and lights on pointer hover too", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId, getAllByTestId } = renderBar();
      const glow = () => getByTestId("search-bar-glow");
      const pill = () => pillOf(glow());
      const glyph = () =>
        getAllByTestId("icon-glyph").find((node) => node.props.name === "Search");

      expect(boxOf(pill())).toEqual(REST_BOX);

      fireEvent(pill(), "hoverIn");
      expect(boxOf(pill())).toEqual(GROWN_BOX);
      expect(classNameOf(pill())).toContain(LIFTED_SURFACE);
      expect(classNameOf(glow())).toContain("opacity-100");
      expect(glyph()?.props.color).toBe("primary");

      fireEvent(pill(), "hoverOut");
      expect(boxOf(pill())).toEqual(REST_BOX);
      expect(classNameOf(glow())).toContain("opacity-0");
      expect(glyph()?.props.color).toBe("text-tertiary");
    });

    it("keeps a filled query grown and lifted after blur, but releases the halo", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByPlaceholderText, getByTestId, getAllByTestId } = renderBar("pulse");
      const pill = () => pillOf(getByTestId("search-bar-glow"));
      const glow = () => getByTestId("search-bar-glow");
      const glyph = () =>
        getAllByTestId("icon-glyph").find((node) => node.props.name === "Search");

      fireEvent(getByPlaceholderText("Search"), "focus");
      fireEvent(getByPlaceholderText("Search"), "blur");

      // `engaged` = lit || query: the query keeps the box, surface and tint…
      expect(boxOf(pill())).toEqual(GROWN_BOX);
      expect(classNameOf(pill())).toContain(LIFTED_SURFACE);
      expect(glyph()?.props.color).toBe("primary");
      // …but `lit` is what drives the transient halo, so it releases.
      expect(classNameOf(glow())).toContain("opacity-0");
    });

    it("paints the halo from the active primary token at GLOW alpha", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByTestId } = renderBar();
      const style = getByTestId("search-bar-glow").props.style as { boxShadow?: string };

      // Derived rgba(r,g,b,SEARCH_BAR_GLOW_ALPHA) — follows the theme's
      // primary token rather than a hardcoded brand hue.
      expect(style.boxShadow).toMatch(/rgba\(\d{1,3},\d{1,3},\d{1,3},0\.45\)/);
    });

    it("renders the halo on web only", () => {
      jest.replaceProperty(Platform, "OS", "ios");
      const { queryByTestId } = renderBar();
      expect(queryByTestId("search-bar-glow")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Reduced motion — no growth animation, but every state still changes.
  // -------------------------------------------------------------------------
  describe("reduced motion", () => {
    it("snaps the glyph, changes state, but never grows or transitions", () => {
      mockReducedMotion = true;
      jest.replaceProperty(Platform, "OS", "web");
      const timing = jest.spyOn(Animated, "timing");
      const setValue = jest.spyOn(Animated.Value.prototype, "setValue");
      const { getByPlaceholderText, getByTestId } = render(
        <SearchBar
          value=""
          onChangeText={jest.fn()}
          placeholder="Search"
          autoFocus={false}
        />
      );
      const pill = () => pillOf(getByTestId("search-bar-glow"));
      const glow = () => getByTestId("search-bar-glow");

      // The bar does NOT grow: SearchBar keeps its own rest height and pin
      // rather than handing control back to the Pressable wrapper.
      expect(boxOf(pill())).toEqual(REST_BOX);
      expect(classNameOf(pill())).not.toContain(SEARCH_BAR_HEIGHT_GROWN);
      expect(classNameOf(pill())).not.toContain("transition-all");
      expect(classNameOf(glow())).not.toContain("transition-opacity");

      fireEvent(getByPlaceholderText("Search"), "focus");

      // Motion is off — every visible state still changes.
      expect(boxOf(pill())).toEqual(REST_BOX);
      expect(classNameOf(pill())).toContain(LIFTED_SURFACE);
      expect(classNameOf(glow())).toContain("opacity-100");
      expect(timing).not.toHaveBeenCalled();
      // The nudge still lands — it snaps instead of animating.
      expect(setValue.mock.calls.some((call) => call[0] === SEARCH_BAR_GLYPH_NUDGE)).toBe(
        true
      );
    });

    it("pins the collapsed stub's press squash to 1 and never grows the box", () => {
      mockReducedMotion = true;
      jest.replaceProperty(Platform, "OS", "web");
      const { getByLabelText } = render(
        <SearchBar value="" onChangeText={jest.fn()} onPress={jest.fn()} placeholder="Search" />
      );

      expect(mockLastPressableScaleProps).toMatchObject({
        scaleOnPress: 1,
      });
      expect(
        (mockLastPressableScaleProps as Record<string, unknown> | null)?.scaleOnHover
      ).toBeUndefined();

      const pill = getByLabelText("Search");
      expect(boxOf(pill as never)).toEqual(REST_BOX);
      fireEvent(pill, "focus");
      expect(boxOf(pill as never)).toEqual(REST_BOX);
      expect(classNameOf(pill)).not.toContain(SEARCH_BAR_HEIGHT_GROWN);
    });
  });
});
