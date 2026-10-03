// ---------------------------------------------------------------------------
// PULSE — IconButton tests
//
// <IconButton> is the canonical icon-only control, so these tests pin the
// contract that keeps every settings / delete / edit / share / "new club event"
// button animating identically:
//   - the surface LIFTS to the same colour as its pressed state, faded over the
//     shared transition duration (hover and press read as one gesture),
//   - hover (web pointer) and focus/blur (keyboard, cross-platform) both drive
//     the lift, so the affordance is never mouse-only,
//   - the lift is suppressed while disabled and released if the button becomes
//     disabled mid-hover,
//   - scale springs come from PressableScale (1.06 hover / 0.9 press),
//   - accessibility: required role/label, disabled + selected state, and a 44px
//     minimum hit area on the small size.
// ---------------------------------------------------------------------------

import React from "react";
import { Platform } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import {
  ICON_BUTTON_SCALE_HOVER,
  ICON_BUTTON_SCALE_PRESS,
  ICON_BUTTON_TRANSITION_MS,
  IconButton,
} from "@/components/ui/IconButton";

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

// Lucide renders null under the global test mock (jest.setup.js), so the real
// <Icon> leaves no host node. Substituting it lets us assert the glyph props.
jest.mock("@/components/ui/Icon", () => {
  const { View } = jest.requireActual("react-native");
  return {
    Icon: (props: Record<string, unknown>) => <View {...props} testID="icon-glyph" />,
  };
});

let lastPressableScaleProps: Record<string, unknown> | null = null;

// <PressableScale> is a thin animation wrapper; pass its props through to a
// real Pressable so hover/focus still work, while recording what it was given.
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

describe("IconButton", () => {
  const realPlatform = Platform.OS;

  afterEach(() => {
    jest.replaceProperty(Platform, "OS", realPlatform);
    jest.restoreAllMocks();
  });

  it("renders the glyph through the design-system Icon with an accessible label", () => {
    const { getByLabelText, getByTestId } = render(
      <IconButton icon="Settings" label="Paramètres" onPress={jest.fn()} />
    );

    expect(getByLabelText("Paramètres")).toBeTruthy();
    expect(getByTestId("icon-glyph").props.name).toBe("Settings");
  });

  it("calls onPress", () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <IconButton icon="Trash2" label="Supprimer" tone="danger" onPress={onPress} />
    );

    fireEvent.press(getByLabelText("Supprimer"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("always animates the colour swap over the shared duration", () => {
    const { getByLabelText } = render(<IconButton icon="Settings" label="Paramètres" />);
    const cls = classNameOf(getByLabelText("Paramètres"));

    expect(cls).toContain("transition-colors");
    expect(cls).toContain(`duration-${ICON_BUTTON_TRANSITION_MS}`);
  });

  it("drives the springs through PressableScale with the shared scales", () => {
    // The springs themselves live in <PressableScale> (whose reduced-motion
    // behaviour is covered by arrow/primitive tests), so what <IconButton>
    // owns — and what we pin here — is that it delegates with the canonical
    // values, so no screen can reintroduce its own scale.
    const { getByLabelText } = render(<IconButton icon="Settings" label="Paramètres" />);

    expect(lastPressableScaleProps?.scaleOnHover).toBe(ICON_BUTTON_SCALE_HOVER);
    expect(lastPressableScaleProps?.scaleOnPress).toBe(ICON_BUTTON_SCALE_PRESS);
    expect(getByLabelText("Paramètres")).toBeTruthy();
  });

  describe("surface lift (web hover)", () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, "OS", "web");
    });

    it("lifts to the same colour as the pressed state on hover, then restores", () => {
      const { getByLabelText } = render(<IconButton icon="Funnel" label="Filtrer" />);
      const button = getByLabelText("Filtrer");

      expect(classNameOf(button)).toContain("bg-primary/10");

      fireEvent(button, "hoverIn");
      expect(classNameOf(button)).toContain("bg-primary/20");

      fireEvent(button, "hoverOut");
      expect(classNameOf(button)).toContain("bg-primary/10");
      expect(classNameOf(button)).not.toContain("bg-primary/20");
    });

    it("lifts the neutral tone too", () => {
      const { getByLabelText } = render(
        <IconButton icon="Bell" label="Notifications" tone="neutral" />
      );
      const button = getByLabelText("Notifications");

      expect(classNameOf(button)).toContain("bg-neutral-100");
      fireEvent(button, "hoverIn");
      expect(classNameOf(button)).toContain("bg-neutral-200");
    });

    it("keeps the pointer affordance off native (hover is web-only)", () => {
      jest.replaceProperty(Platform, "OS", "ios");
      const { getByLabelText } = render(<IconButton icon="Funnel" label="Filtrer" />);
      const button = getByLabelText("Filtrer");

      expect(button.props.onHoverIn).toBeUndefined();
      expect(classNameOf(button)).toContain("bg-primary/10");
    });
describe("keyboard focus parity", () => {
    it("lifts on focus and restores on blur (not web-gated)", () => {
      jest.replaceProperty(Platform, "OS", "ios");
      const { getByLabelText } = render(<IconButton icon="Funnel" label="Filtrer" />);
      const button = getByLabelText("Filtrer");

      fireEvent(button, "focus");
      expect(classNameOf(button)).toContain("bg-primary/20");

      fireEvent(button, "blur");
      expect(classNameOf(button)).toContain("bg-primary/10");
    });
  });

  describe("disabled", () => {
    it("never lifts and exposes the state to AT", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const onPress = jest.fn();
      const { getByLabelText } = render(
        <IconButton icon="CheckCircle2" label="Accepter" disabled onPress={onPress} />
      );
      const button = getByLabelText("Accepter");

      expect(button.props.accessibilityState).toMatchObject({ disabled: true });

      fireEvent(button, "hoverIn");
      expect(classNameOf(button)).toContain("bg-primary/10");
      expect(classNameOf(button)).not.toContain("bg-primary/20");
      expect(classNameOf(button)).toContain("opacity-50");
    });

    it("releases the lift when it becomes disabled mid-hover", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByLabelText, rerender } = render(
        <IconButton icon="Funnel" label="Filtrer" />
      );

      fireEvent(getByLabelText("Filtrer"), "hoverIn");
      expect(classNameOf(getByLabelText("Filtrer"))).toContain("bg-primary/20");

      rerender(<IconButton icon="Funnel" label="Filtrer" disabled />);
      expect(classNameOf(getByLabelText("Filtrer"))).toContain("bg-primary/10");
    });
  });

  describe("selected / toggle state", () => {
    it("renders the lifted surface and marks itself selected", () => {
      const { getByLabelText } = render(
        <IconButton icon="Heart" label="Favoris" active filled />
      );
      const button = getByLabelText("Favoris");

      expect(button.props.accessibilityState).toMatchObject({ selected: true });
      expect(classNameOf(button)).toContain("bg-primary/20");
    });
  });

  describe("sizes and hit area", () => {
    it.each([
      ["sm", "w-9 h-9"],
      ["md", "w-11 h-11"],
      ["lg", "w-12 h-12"],
    ] as const)("renders %s at %s", (size, box) => {
      const { getByLabelText } = render(
        <IconButton icon="Settings" label="Paramètres" size={size} />
      );
      expect(classNameOf(getByLabelText("Paramètres"))).toContain(box);
    });

    it("expands the small size to the 44px minimum target", () => {
      const { getByLabelText } = render(<IconButton icon="Plus" label="Ajouter" size="sm" />);
      // 36px box needs 4px of slop on each edge to reach 44.
      expect(getByLabelText("Ajouter").props.hitSlop).toEqual({
        top: 4,
        right: 4,
        bottom: 4,
        left: 4,
      });
    });

    it("leaves an already-44px target untouched", () => {
      const { getByLabelText } = render(
        <IconButton icon="Settings" label="Paramètres" size="md" />
      );
      expect(getByLabelText("Paramètres").props.hitSlop).toBeUndefined();
    });
  });

  it("lets a caller override the box without losing the motion", () => {
    const { getByLabelText } = render(
      <IconButton
        icon="Plus"
        label="Ajouter"
        className="absolute -top-1 -right-1 w-5 h-5"
      />
    );
    const cls = classNameOf(getByLabelText("Ajouter"));

    expect(cls).toContain("w-5 h-5");
    expect(cls).toContain("transition-colors");
  });
});
  });