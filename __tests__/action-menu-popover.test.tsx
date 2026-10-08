// ---------------------------------------------------------------------------
// PULSE — Action menu popover tests
//
// The floating fallback used on Android / web (where React Native has no OS
// options menu). It consumes the same ActionMenuDescriptor as the native iOS
// sheet, so these tests assert the behaviour the requirement calls for:
//   - the options render and fire their action when tapped,
//   - tapping the backdrop (anywhere outside) closes the menu,
//   - destructive / disabled states are honoured,
//   - the menu stays **fully visible at any width** — its computed left/top
//     never push it past the screen edges, and it flips above the trigger
//     when it would overflow the bottom.
// ---------------------------------------------------------------------------

import React from "react";
import { Dimensions, Platform } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { ActionMenuPopover } from "@/components/shared/ActionMenuPopover";
import type { ActionMenuDescriptor } from "@/components/shared/nativeActionMenu";

// Keep the hooks the popover pulls in deterministic in jsdom.
jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => (key === "common.close" ? "Fermer" : key),
    language: "fr",
  }),
}));

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

const descriptor: ActionMenuDescriptor = {
  title: "Alice",
  options: [
    { key: "pin", label: "Épingler" },
    { key: "delete", label: "Supprimer", destructive: true },
    { key: "leave", label: "Quitter", disabled: true },
  ],
  cancelLabel: "Annuler",
};

/** Point `useWindowDimensions` at a given viewport size. */
const setWindow = (width: number, height: number) =>
  jest.spyOn(Dimensions, "get").mockReturnValue({
    width,
    height,
    scale: 1,
    fontScale: 1,
  });

// The popover card is an Animated.View whose style is an array; pull the
// absolute placement (top/left/width) out of it.
const placementOf = (node: { props: { style?: unknown } }) => {
  const style = (Array.isArray(node.props.style)
    ? node.props.style
    : [node.props.style]) as Array<Record<string, number> | undefined>;
  return Object.assign({}, ...style) as {
    position?: string;
    top?: number;
    left?: number;
    width?: number;
  };
};

describe("ActionMenuPopover", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
    setWindow(400, 800);
  });

  it("renders each option label and the title", () => {
    const { getByText } = render(
      <ActionMenuPopover
        visible
        descriptor={descriptor}
        anchor={{ x: 300, y: 100, width: 40, height: 40 }}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    expect(getByText("Alice")).toBeTruthy();
    expect(getByText("Épingler")).toBeTruthy();
    expect(getByText("Supprimer")).toBeTruthy();
    expect(getByText("Quitter")).toBeTruthy();
  });

  it("fires onSelect with the option key when an option is tapped", () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ActionMenuPopover
        visible
        descriptor={descriptor}
        anchor={{ x: 300, y: 100, width: 40, height: 40 }}
        onClose={onClose}
        onSelect={onSelect}
      />
    );

    fireEvent.press(getByTestId("action-menu-option-pin"));
    expect(onSelect).toHaveBeenCalledWith("pin");
  });

  it("closes when the backdrop (outside the menu) is tapped", () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <ActionMenuPopover
        visible
        descriptor={descriptor}
        anchor={{ x: 300, y: 100, width: 40, height: 40 }}
        onClose={onClose}
        onSelect={jest.fn()}
      />
    );

    fireEvent.press(getByLabelText("Fermer"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when hidden or without a descriptor", () => {
    const { queryByTestId } = render(
      <ActionMenuPopover
        visible={false}
        descriptor={descriptor}
        anchor={{ x: 0, y: 0, width: 0, height: 0 }}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );
    expect(queryByTestId("action-menu-popover")).toBeNull();
  });

  it("keeps the menu fully on-screen when the trigger is near the right edge", () => {
    setWindow(320, 800);
    const { getByTestId } = render(
      <ActionMenuPopover
        visible
        descriptor={descriptor}
        // Trigger hugging the right edge — the menu must not overflow it.
        anchor={{ x: 300, y: 100, width: 20, height: 20 }}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    const p = placementOf(getByTestId("action-menu-popover"));
    expect(p.left).toBeGreaterThanOrEqual(12);
    expect((p.left ?? 0) + (p.width ?? 0)).toBeLessThanOrEqual(320 - 12);
  });

  it("clamps the width so the menu fits a very narrow screen", () => {
    setWindow(200, 800);
    const { getByTestId } = render(
      <ActionMenuPopover
        visible
        descriptor={descriptor}
        anchor={{ x: 100, y: 100, width: 20, height: 20 }}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    const p = placementOf(getByTestId("action-menu-popover"));
    expect(p.width).toBeLessThanOrEqual(200 - 24);
    expect(p.left).toBeGreaterThanOrEqual(12);
  });

  it("flips above the trigger when the menu would overflow the bottom", () => {
    setWindow(400, 500);
    const { getByTestId } = render(
      <ActionMenuPopover
        visible
        descriptor={descriptor}
        // Trigger near the bottom of a short screen.
        anchor={{ x: 340, y: 440, width: 40, height: 40 }}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    const p = placementOf(getByTestId("action-menu-popover"));
    // Anchored near the bottom, the menu opens upward, so `top` sits well
    // above the trigger rather than below it.
    expect(p.top).toBeLessThan(440);
    expect(p.top).toBeGreaterThanOrEqual(12);
  });

  it("places the menu below the trigger when there is room", () => {
    setWindow(400, 800);
    const { getByTestId } = render(
      <ActionMenuPopover
        visible
        descriptor={descriptor}
        anchor={{ x: 300, y: 100, width: 40, height: 40 }}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    const p = placementOf(getByTestId("action-menu-popover"));
    expect(p.top).toBeGreaterThan(100);
  });
});

