// ---------------------------------------------------------------------------
// PULSE — TabBar (horizontal navbar) tests
//
// Covers the bottom bar's active treatment:
//   - all four tabs render and expose an accessible name,
//   - the tab matching the pathname is marked selected,
//   - the active background is ONE sliding capsule, not a per-tab tint — this
//     is the behaviour that was missing before (the bar painted a static pill
//     behind each tab's own icon, so nothing slid on selection),
//   - under prefers-reduced-motion the capsule is dropped and the active tab
//     falls back to a static tint so the selection stays visible,
//   - the Create button is not a tab: it must not be reported as selected.
// ---------------------------------------------------------------------------

import React from "react";
import { Platform, StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { TabBar } from "@/components/shared/TabBar";
import { ICON_BUTTON_SCALE_HOVER } from "@/components/ui/IconButton";
import { t } from "@/hooks/useTranslation";
import { useLanguageStore } from "@/stores/languageStore";
import {
  NAV_TAB_ICON_SIZE,
  TAB_BAR_INDICATOR_HEIGHT,
} from "@/components/shared/NavTabMotion";
import { spacing } from "@/src/design-tokens/primitive/spacing";

let mockReducedMotion = false;

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockReducedMotion,
}));

let mockPathname = "/feed";
const mockNavigate = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  usePathname: () => mockPathname,
}));

jest.mock("@/components/shared/CreateBottomSheet", () => ({
  CreateBottomSheet: () => null,
}));

// The bottom bar is hidden in favour of the SideRail once the viewport is wide
// enough; keep the suite on the narrow side unless a test says otherwise.
jest.mock("@/components/shared/SideRail", () => ({
  useIsWebWide: () => false,
}));

// `useSafeAreaInsets` throws outside a <SafeAreaProvider>, which the app root
// supplies in production but the renderer here does not.
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

/** Minimal `BottomTabBarProps` — TabBar only reads `navigation.navigate`. */
const barProps = (): BottomTabBarProps =>
  ({
    navigation: { navigate: mockNavigate },
    state: { routes: [], index: 0 },
  }) as unknown as BottomTabBarProps;

const selectedOf = (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
  node.props.accessibilityState?.selected;

/** Renders the bar and returns its queries. */
const renderBar = () => render(<TabBar {...barProps()} />);

beforeEach(() => {
  mockReducedMotion = false;
  mockPathname = "/feed";
  mockNavigate.mockClear();
  mockReplace.mockClear();
  // The app defaults to French; pin English so the label assertions below are
  // stable against the default locale.
  useLanguageStore.setState({ language: "en" });
  Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// TabBar
// ---------------------------------------------------------------------------

describe("TabBar", () => {
  it("renders every tab with an accessible name", () => {
    const { getByLabelText } = renderBar();

    // Labels come from the tabs.* translation keys (en in the test env).
    expect(getByLabelText("Feed")).toBeTruthy();
    expect(getByLabelText("Explore")).toBeTruthy();
    expect(getByLabelText("Messages")).toBeTruthy();
    expect(getByLabelText("Profile")).toBeTruthy();
  });

  it("marks the tab matching the current pathname as selected", () => {
    mockPathname = "/conversations";

    const { getByLabelText } = renderBar();

    expect(selectedOf(getByLabelText("Messages"))).toBe(true);
    expect(selectedOf(getByLabelText("Feed"))).toBe(false);
  });

  it("keeps a tab selected on a nested route", () => {
    mockPathname = "/feed/abc-123/comments";

    const { getByLabelText } = renderBar();

    expect(selectedOf(getByLabelText("Feed"))).toBe(true);
  });

  it("does not render a sliding capsule on an unknown route", () => {
    mockPathname = "/settings";

    const { queryByTestId } = renderBar();

    // With nothing selected there is nowhere to slide to, so no capsule at all.
    expect(queryByTestId("active-capsule")).toBeNull();
  });

  it("paints a blue capsule behind the active tab, centred in the bar", () => {
    const { getByTestId } = renderBar();

    const capsule = getByTestId("active-capsule");
    const style = StyleSheet.flatten(capsule.props.style) ?? {};

    expect(style.backgroundColor).toBeTruthy();
    // The whole point of the redesign: a capsule behind the entire tab, well
    // taller than the 24px icon it used to hug.
    expect(style.height).toBe(TAB_BAR_INDICATOR_HEIGHT);
    expect(style.height).toBeGreaterThan(24);
    // Travels horizontally on `left`/`width`; `top` is the fixed vertical
    // centring inside the 64px bar, not an animated axis.
    expect(style).toHaveProperty("left");
    expect(style).toHaveProperty("width");
    expect(style.top).toBe((64 - TAB_BAR_INDICATOR_HEIGHT) / 2);
    // Never intercepts taps meant for the tabs behind it.
    expect(capsule.props.pointerEvents).toBe("none");
  });

  it("sizes tab rows to the capsule so grey hover and blue active match", () => {
    const { getByTestId, getByLabelText } = renderBar();

    const rowClass = getByLabelText("Feed").props.className ?? "";
    // py-3 (12px) around the 24px icon = 48px — exactly the capsule's height.
    // `h-full` used to stretch rows to the full 64px bar, so hovering painted
    // a grey surface 16px taller than the blue capsule behind the same icon.
    expect(rowClass).toContain("py-3");
    expect(rowClass).not.toContain("h-full");

    // Row and capsule are the same box, derived from the same tokens:
    // icon + py-3 both sides === capsule height.
    const rowHeight = NAV_TAB_ICON_SIZE + 2 * spacing[3];
    expect(rowHeight).toBe(TAB_BAR_INDICATOR_HEIGHT);

    const capsuleStyle =
      StyleSheet.flatten(getByTestId("active-capsule").props.style) ?? {};
    expect(capsuleStyle.height).toBe(rowHeight);
    // Centred in the bar — the same vertical position the rows sit at.
    expect(capsuleStyle.top).toBe((64 - rowHeight) / 2);
    // No transform: the hovered surface never scales, so the grey hover
    // rectangle IS the resting row box — the blue capsule must stay exactly
    // at those box metrics (height/top asserted above), bottom padding included.
    expect(capsuleStyle.transform).toBeUndefined();
  });

  it("paints no per-tab tint while motion is allowed", () => {
    mockPathname = "/feed";

    const { getByLabelText } = renderBar();

    // The static pill is the old behaviour; the capsule replaces it, so an
    // animated-capable session must not double up with a per-tab tint.
    expect(getByLabelText("Feed").props.className ?? "").not.toContain(
      "bg-primary-tint"
    );
  });

  it("falls back to a static per-tab tint under reduced motion", () => {
    mockReducedMotion = true;
    mockPathname = "/feed";

    const { getByLabelText, queryByTestId } = renderBar();

    // No capsule to animate, so the selection must come from the tab itself.
    expect(queryByTestId("active-capsule")).toBeNull();
    expect(getByLabelText("Feed").props.className ?? "").toContain("bg-primary-tint");
  });

  it("lifts the Create FAB on hover, on top of its lift above the bar", () => {
    const { getByLabelText } = renderBar();
    const transformOf = () =>
      StyleSheet.flatten(getByLabelText(t("common.create")).props.style)
        ?.transform;
    const classNameOfCreate = () =>
      getByLabelText(t("common.create")).props.className ?? "";

    // Web raises the FAB 8px above the bar; the shared lift owns `scale`.
    expect(transformOf()).toEqual([{ translateY: -8 }, { scale: 1 }]);
    expect(classNameOfCreate()).toContain("transition-transform");
    expect(classNameOfCreate()).toContain("duration-150");

    fireEvent(getByLabelText(t("common.create")), "hoverIn");
    expect(transformOf()).toEqual([
      { translateY: -8 },
      { scale: ICON_BUTTON_SCALE_HOVER },
    ]);

    fireEvent(getByLabelText(t("common.create")), "hoverOut");
    expect(transformOf()).toEqual([{ translateY: -8 }, { scale: 1 }]);
  });

  it("snaps the Create lift under reduced motion", () => {
    mockReducedMotion = true;

    const { getByLabelText } = renderBar();

    fireEvent(getByLabelText(t("common.create")), "hoverIn");

    // The state still changes — the surface is lifted…
    expect(
      StyleSheet.flatten(getByLabelText(t("common.create")).props.style)?.transform
    ).toEqual([{ translateY: -8 }, { scale: ICON_BUTTON_SCALE_HOVER }]);
    // …but the fade is dropped, so it snaps instead of animating.
    expect(getByLabelText(t("common.create")).props.className ?? "").not.toContain(
      "transition-transform"
    );
  });
});
