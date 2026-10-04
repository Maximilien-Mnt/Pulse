// ---------------------------------------------------------------------------
// PULSE — SideRail render tests
//
// Regression cover for a shipped crash: `SIDE_TABS.findIndex(isActive)` passed
// the TabItem *object* where `isActive` expects a route string, so the very
// first `routePath.split("/")` threw
//
//     TypeError: routePath.split is not a function
//         at isActive
//         at Array.findIndex
//         at SideRail
//
// Because <SideRail> is the ancestor of every tab screen on web ≥768px
// (app/(tabs)/_layout.tsx), that single call blanked the whole desktop layout.
// `tsc` knew about it but could not report it: a syntax error in an unrelated
// test file made the compiler skip semantic checking repo-wide.
//
// nav-tab-motion.test.tsx covers <NavTab> in isolation, which is exactly why
// the findIndex wiring went unnoticed — these tests mount the real <SideRail>.
// ---------------------------------------------------------------------------

import React from "react";
import { Dimensions, Platform, Text, View } from "react-native";
import { render } from "@testing-library/react-native";

import { SideRail, useIsWebWide } from "@/components/shared/SideRail";

let mockPathname = "/feed";
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  usePathname: () => mockPathname,
}));

// The create sheet is an overlay (only mounted once `createOpen` flips), but
// mocking it keeps this suite from pulling the whole create flow in.
jest.mock("@/components/shared/CreateBottomSheet", () => ({
  CreateBottomSheet: () => null,
}));

/** Point `useWindowDimensions` at a given viewport width. */
const setWidth = (width: number) =>
  jest.spyOn(Dimensions, "get").mockReturnValue({
    width,
    height: 800,
    scale: 1,
    fontScale: 1,
  });

const selectedOf = (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
  node.props.accessibilityState?.selected;

beforeEach(() => {
  mockPathname = "/feed";
  mockPush.mockClear();
  mockReplace.mockClear();
  setWidth(1280);
  // The rail only exists on web; the jest-expo preset defaults to native.
  Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
  jest.restoreAllMocks();
  setWidth(1280);
});

// ---------------------------------------------------------------------------
// SideRail
// ---------------------------------------------------------------------------

describe("SideRail", () => {
  it("renders every tab without throwing", () => {
    const { getByLabelText } = render(<SideRail />);

    expect(getByLabelText("Feed")).toBeTruthy();
    expect(getByLabelText("Explorer")).toBeTruthy();
    expect(getByLabelText("Messages")).toBeTruthy();
    expect(getByLabelText("Profil")).toBeTruthy();
  });

  it("marks the tab matching the current pathname as selected", () => {
    mockPathname = "/conversations";

    const { getByLabelText } = render(<SideRail />);

    expect(selectedOf(getByLabelText("Messages"))).toBe(true);
    expect(selectedOf(getByLabelText("Feed"))).toBe(false);
    expect(selectedOf(getByLabelText("Explorer"))).toBe(false);
    expect(selectedOf(getByLabelText("Profil"))).toBe(false);
  });

  it("keeps a tab selected on a nested route", () => {
    mockPathname = "/feed/abc-123/comments";

    const { getByLabelText } = render(<SideRail />);

    expect(selectedOf(getByLabelText("Feed"))).toBe(true);
    expect(selectedOf(getByLabelText("Explorer"))).toBe(false);
  });

  it("selects nothing on an unknown route", () => {
    mockPathname = "/settings";

    const { getByLabelText } = render(<SideRail />);

    expect(selectedOf(getByLabelText("Feed"))).toBe(false);
    expect(selectedOf(getByLabelText("Messages"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useIsWebWide
// ---------------------------------------------------------------------------

const Probe = () => {
  const isWebWide = useIsWebWide();
  return (
    <View testID="probe">
      <Text>{isWebWide ? "wide" : "narrow"}</Text>
    </View>
  );
};

describe("useIsWebWide", () => {
  it("is true on web at or above the 768px breakpoint", () => {
    setWidth(1280);
    const { getByText } = render(<Probe />);
    expect(getByText("wide")).toBeTruthy();
  });

  it("is false on web below the 768px breakpoint", () => {
    setWidth(500);
    const { getByText } = render(<Probe />);
    expect(getByText("narrow")).toBeTruthy();
  });

  it("is false on native regardless of width", () => {
    Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
    setWidth(1280);
    const { getByText } = render(<Probe />);
    expect(getByText("narrow")).toBeTruthy();
  });
});
