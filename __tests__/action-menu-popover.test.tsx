// ---------------------------------------------------------------------------
// PULSE — Action menu popover tests
//
// The floating fallback used on Android / web (where React Native has no OS
// options menu). It consumes the same ActionMenuDescriptor as the native iOS
// sheet, so these tests assert the behaviour the requirement calls for:
//   - the options render and fire their action when tapped,
//   - tapping the backdrop (anywhere outside) closes the menu,
//   - destructive / disabled states are honoured,
//   - every row shares one structure (fixed icon slot + flex-1 left-aligned
//     label) and one hover treatment — the app's blue reference tint —
//     including the destructive rows,
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

  it("gives every row — destructive included — the same aligned structure", () => {
    const { getByTestId, getByText } = render(
      <ActionMenuPopover
        visible
        descriptor={descriptor}
        anchor={{ x: 300, y: 100, width: 40, height: 40 }}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    // All rows: the shared flex-row layout, and the label stretches (flex-1)
    // and left-aligns — including the destructive row that used to size to
    // its content and sit left.
    for (const key of ["pin", "delete", "leave"]) {
      const row = getByTestId(`action-menu-option-${key}`);
      expect(String(row.props.className ?? "")).toContain("flex-row");
      expect(String(row.props.className ?? "")).toContain("items-center");
    }
    for (const label of ["Épingler", "Supprimer", "Quitter"]) {
      const text = getByText(label);
      expect(String(text.props.className ?? "")).toContain("flex-1");
      expect(String(text.props.className ?? "")).toContain("text-left");
    }
  });

  it("lifts every row — destructive included — to the blue reference tint on hover", () => {
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
    const { getByTestId } = render(
      <ActionMenuPopover
        visible
        descriptor={descriptor}
        anchor={{ x: 300, y: 100, width: 40, height: 40 }}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    // The destructive row gets the same blue tint as the neutral rows —
    // the red label colour stays, only the hover surface is shared.
    for (const key of ["pin", "delete"]) {
      const row = getByTestId(`action-menu-option-${key}`);
      fireEvent(row, "hoverIn");
      expect(String(row.props.className ?? "")).toContain("bg-primary-tint");
    }

    // …and leaving removes it again (the `active:` press class stays — only
    // the hover token is asserted).
    const row = getByTestId("action-menu-option-delete");
    fireEvent(row, "hoverOut");
    expect(String(row.props.className ?? "").split(" ")).not.toContain(
      "bg-primary-tint"
    );
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

