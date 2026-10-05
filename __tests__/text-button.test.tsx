// ---------------------------------------------------------------------------
// PULSE — TextButton tests (+ the label-motion contract it shares with Button)
//
// <TextButton> is the label-only counterpart of <Button>, so these tests pin
// the contract that keeps every worded action ("Annuler", "Enregistrer",
// "Supprimer", a menu option, the FR/EN chip…) animating identically:
//   - the token set is literally shared with <Button> (one gesture family,
//     same as ICON_BUTTON_* is for the round controls),
//   - hover (web pointer) and focus/blur (keyboard, cross-platform) both lift,
//   - the lift reaches the colour the button already has when pressed, faded
//     over the shared 150ms transition,
//   - the lift is suppressed while disabled and released if the button becomes
//     disabled mid-hover,
//   - every state still applies under prefers-reduced-motion, it just snaps,
//   - accessibility: button role, visible label as the accessible name,
//     disabled + selected state.
// ---------------------------------------------------------------------------

import React from "react";
import { Platform } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import {
  TEXT_BUTTON_NUDGE_PX,
  TEXT_BUTTON_SCALE_HOVER,
  TEXT_BUTTON_SCALE_POP,
  TEXT_BUTTON_SCALE_PRESS,
  TEXT_BUTTON_TOGGLE_SETTLE_MS,
  TEXT_BUTTON_TRANSITION_MS,
  TEXT_BUTTON_UNDERLINE_IN_MS,
  TEXT_BUTTON_UNDERLINE_OUT_MS,
  TEXT_BUTTON_UNDERLINE_PX,
  TextButton,
} from "@/components/ui/TextButton";
import { BUTTON_SCALE_HOVER, Button } from "@/components/ui/Button";

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
      const { children, ...rest } = props;
      return <Pressable {...rest}>{children as never}</Pressable>;
    },
  };
});

const classNameOf = (node: { props: { className?: string } }) =>
  node.props.className ?? "";

describe("TextButton", () => {
  const realPlatform = Platform.OS;

  beforeEach(() => {
    lastPressableScaleProps = null;
    mockReducedMotion = false;
  });

  afterEach(() => {
    jest.replaceProperty(Platform, "OS", realPlatform);
    jest.restoreAllMocks();
  });

  describe("shared motion contract", () => {
    it("lifts by exactly the amount <Button> lifts", () => {
      expect(TEXT_BUTTON_SCALE_HOVER).toBe(BUTTON_SCALE_HOVER);
      expect(TEXT_BUTTON_SCALE_HOVER).toBeGreaterThan(1);
    });

    it("fades colours over the shared 150ms", () => {
      expect(TEXT_BUTTON_TRANSITION_MS).toBe(150);
    });

    it("springs to the shared press squash, and pops harder when toggling", () => {
      render(<TextButton>Annuler</TextButton>);
      expect(lastPressableScaleProps).toMatchObject({
        scaleOnHover: TEXT_BUTTON_SCALE_HOVER,
        scaleOnPress: TEXT_BUTTON_SCALE_PRESS,
      });

      render(<TextButton tone="toggle">Suivi</TextButton>);
      expect(lastPressableScaleProps).toMatchObject({
        scaleOnPress: TEXT_BUTTON_SCALE_POP,
      });
      expect(TEXT_BUTTON_SCALE_POP).toBeLessThan(TEXT_BUTTON_SCALE_PRESS);
    });
  });

  describe("labels and actions", () => {
    it("exposes the visible label as the accessible name and calls onPress", () => {
      const onPress = jest.fn();
      const { getByLabelText } = render(
        <TextButton onPress={onPress}>S&apos;inscrire</TextButton>
      );

      const button = getByLabelText("S'inscrire");
      expect(button.props.accessibilityRole).toBe("button");

      fireEvent.press(button);
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("lets a caller override the accessible name", () => {
      const { getByLabelText } = render(
        <TextButton accessibilityLabel="Suivre ce membre">Suivre</TextButton>
      );
      expect(getByLabelText("Suivre ce membre")).toBeTruthy();
    });
  });

  describe("tones", () => {
    it("link: brand label at rest, primary chip + deepened label on hover", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByLabelText, getByText } = render(
        <TextButton tone="link">Confirmer</TextButton>
      );
      const button = getByLabelText("Confirmer");
      const label = getByText("Confirmer");

      expect(label.props.className).toContain("text-primary dark:text-primary-dark");
      expect(label.props.className).toContain("transition-colors");
      expect(label.props.className).toContain("duration-150");
      expect(classNameOf(button)).toContain("active:bg-primary/10");

      fireEvent(button, "hoverIn");
      expect(classNameOf(button)).toContain("bg-primary/10 dark:bg-primary-dark/15");
      expect(label.props.className).toContain(
        "text-primary-hover dark:text-primary-hover-dark"
      );

      fireEvent(button, "hoverOut");
      expect(classNameOf(button)).not.toContain("bg-primary/10 dark:bg-primary-dark/15");
      expect(getByText("Confirmer").props.className).toContain(
        "text-primary dark:text-primary-dark"
      );
    });

    it("neutral: ink label at rest, neutral chip once lifted", () => {
      const { getByLabelText } = render(<TextButton tone="neutral">Annuler</TextButton>);
      const button = getByLabelText("Annuler");

      expect(classNameOf(button)).not.toContain("bg-neutral-100 dark:bg-neutral-800");

      fireEvent(button, "focus");
      expect(classNameOf(button)).toContain("bg-neutral-100 dark:bg-neutral-800");

      fireEvent(button, "blur");
      expect(classNameOf(button)).not.toContain("bg-neutral-100 dark:bg-neutral-800");
    });

    it("danger: error label, error tint, and the sweeping underline", () => {
      const { getByLabelText, getByText, getByTestId } = render(
        <TextButton tone="danger" testID="danger-action">
          Supprimer
        </TextButton>
      );

      expect(getByText("Supprimer").props.className).toContain("text-error-600");
      expect(getByTestId("danger-action-underline")).toBeTruthy();

      fireEvent(getByLabelText("Supprimer"), "focus");
      expect(getByLabelText("Supprimer").props.className).toContain(
        "bg-error-500/10 dark:bg-error-dark/15"
      );
    });

    it("danger is the only intent with an underline", () => {
      const { queryByTestId } = render(
        <TextButton testID="plain-action">Message</TextButton>
      );
      expect(queryByTestId("plain-action-underline")).toBeNull();
    });

    it("toggle: lifted pill at rest and marked selected while active", () => {
      const { getByLabelText } = render(
        <TextButton tone="toggle" active>
          Suivi
        </TextButton>
      );
      const button = getByLabelText("Suivi");

      expect(button.props.accessibilityState).toMatchObject({
        selected: true,
        disabled: false,
      });
      expect(classNameOf(button)).toContain("bg-primary/10 dark:bg-primary-dark/15");

      fireEvent(button, "focus");
      expect(classNameOf(button)).toContain("bg-primary/20 dark:bg-primary-dark/25");
    });
  });

  describe("engagement", () => {
    it("wires pointer hover on web only, keyboard focus on every platform", () => {
      const { getByLabelText, rerender } = render(<TextButton>Suivre</TextButton>);
      const button = getByLabelText("Suivre");

      // Native: no pointer handler at all, but focus still lifts.
      expect(lastPressableScaleProps?.onHoverIn).toBeUndefined();
      fireEvent(button, "focus");
      expect(classNameOf(button)).toContain("bg-neutral-100 dark:bg-neutral-800");
      fireEvent(button, "blur");
      expect(classNameOf(button)).not.toContain("bg-neutral-100 dark:bg-neutral-800");

      // Web: the pointer handler exists and drives the same lift.
      jest.replaceProperty(Platform, "OS", "web");
      rerender(<TextButton>Suivre</TextButton>);
      expect(typeof lastPressableScaleProps?.onHoverIn).toBe("function");

      const webButton = getByLabelText("Suivre");
      fireEvent(webButton, "hoverIn");
      expect(classNameOf(webButton)).toContain("bg-neutral-100 dark:bg-neutral-800");
    });

    it("never lifts while disabled and exposes the state to AT", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByLabelText } = render(<TextButton disabled>Annuler</TextButton>);
      const button = getByLabelText("Annuler");

      expect(button.props.accessibilityState).toMatchObject({ disabled: true });
      fireEvent(button, "hoverIn");
      expect(classNameOf(button)).not.toContain("bg-neutral-100 dark:bg-neutral-800");
      expect(classNameOf(button)).toContain("opacity-50");
    });

    it("releases the lift when it becomes disabled mid-hover", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByLabelText, rerender } = render(<TextButton>Annuler</TextButton>);

      fireEvent(getByLabelText("Annuler"), "hoverIn");
      expect(classNameOf(getByLabelText("Annuler"))).toContain(
        "bg-neutral-100 dark:bg-neutral-800"
      );

      rerender(<TextButton disabled>Annuler</TextButton>);
      expect(classNameOf(getByLabelText("Annuler"))).not.toContain(
        "bg-neutral-100 dark:bg-neutral-800"
      );
    });

    it("keeps every state under reduced motion but drops the fade", () => {
      mockReducedMotion = true;
      const { getByText } = render(<TextButton tone="link">Confirmer</TextButton>);
      const button = getByText("Confirmer").parent as never as {
        props: { className?: string };
      };

      expect(classNameOf(button)).not.toContain("transition-colors");
      expect(getByText("Confirmer").props.className).not.toContain("transition-colors");

      fireEvent(button, "focus");
      expect(getByText("Confirmer").props.className).toContain(
        "text-primary-hover dark:text-primary-hover-dark"
      );
    });
  });

  describe("motion system (shared base + signature moves)", () => {
    it("pins the timing tokens: 150ms fade, 150/120ms underline, 180ms settle", () => {
      expect(TEXT_BUTTON_TRANSITION_MS).toBe(150);
      expect(TEXT_BUTTON_UNDERLINE_IN_MS).toBe(150);
      expect(TEXT_BUTTON_UNDERLINE_OUT_MS).toBeLessThan(TEXT_BUTTON_UNDERLINE_IN_MS);
      expect(TEXT_BUTTON_TOGGLE_SETTLE_MS).toBe(180);
      expect(TEXT_BUTTON_NUDGE_PX).toBe(4);
      expect(TEXT_BUTTON_UNDERLINE_PX).toBe(2);
    });

    it("a link with no directional glyph falls back to the shared lift", () => {
      const { queryByTestId } = render(
        <TextButton tone="link" testID="plain-link">
          Confirmer
        </TextButton>
      );
      expect(queryByTestId("plain-link-underline")).toBeNull();
    });

    it("a link with a directional glyph gets the nudge, not the underline", () => {
      const { queryByTestId } = render(
        <TextButton tone="link" iconRight="ArrowRight" testID="nudge-link">
          Suivant
        </TextButton>
      );
      expect(queryByTestId("nudge-link-underline")).toBeNull();
    });

    it("an explicit motion overrides the tone default", () => {
      const { queryByTestId } = render(
        <TextButton tone="neutral" motion="underline" testID="custom">
          Signaler
        </TextButton>
      );
      expect(queryByTestId("custom-underline")).toBeTruthy();
    });

    it("deepens the label while pressed so touch gets feedback without hover", () => {
      const { getByLabelText, getByText } = render(
        <TextButton tone="link">Confirmer</TextButton>
      );
      const button = getByLabelText("Confirmer");

      expect(getByText("Confirmer").props.className).not.toContain(
        "text-primary-hover dark:text-primary-hover-dark"
      );
      fireEvent(button, "pressIn");
      expect(getByText("Confirmer").props.className).toContain(
        "text-primary-hover dark:text-primary-hover-dark"
      );
      fireEvent(button, "pressOut");
      expect(getByText("Confirmer").props.className).not.toContain(
        "text-primary-hover dark:text-primary-hover-dark"
      );
    });
  });

  describe("sizes, targets, and roles", () => {
    it("sm compacts the row for inline contexts", () => {
      const { getByLabelText } = render(
        <TextButton size="sm">Voir plus</TextButton>
      );
      expect(classNameOf(getByLabelText("Voir plus"))).toContain("gap-1 rounded-md");
    });

    it("expands short labels to the 44px target by default via hitSlop", () => {
      render(<TextButton>OK</TextButton>);
      expect(lastPressableScaleProps).toMatchObject({
        hitSlop: { top: 10, bottom: 10, left: 8, right: 8 },
      });
    });

    it("lets callers widen the hit area", () => {
      render(
        <TextButton hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
          OK
        </TextButton>
      );
      expect(lastPressableScaleProps).toMatchObject({
        hitSlop: { top: 16, bottom: 16, left: 16, right: 16 },
      });
    });

    it("announces external rows as links when asked", () => {
      const { getByLabelText } = render(
        <TextButton role="link">Voir l'original</TextButton>
      );
      expect(getByLabelText("Voir l'original").props.accessibilityRole).toBe("link");
    });

    it("shows a non-colour focus ring for keyboard users on web only", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByLabelText } = render(<TextButton>Suivre</TextButton>);
      const button = getByLabelText("Suivre");

      // Pointer hover: chip tint, no outline.
      fireEvent(button, "hoverIn");
      expect(classNameOf(button)).toContain("bg-neutral-100 dark:bg-neutral-800");
      expect(classNameOf(button)).not.toContain("outline-primary");

      // Keyboard focus: same tint PLUS the outline.
      fireEvent(button, "focus");
      expect(classNameOf(button)).toContain("outline outline-2 outline-primary");

      fireEvent(button, "blur");
      expect(classNameOf(button)).not.toContain("outline outline-2 outline-primary");
    });

    it("never rings a disabled control", () => {
      jest.replaceProperty(Platform, "OS", "web");
      const { getByLabelText } = render(<TextButton disabled>Suivre</TextButton>);
      const button = getByLabelText("Suivre");

      fireEvent(button, "focus");
      expect(classNameOf(button)).not.toContain("outline-primary");
    });
  });
});

// ---------------------------------------------------------------------------
// <Button> drives the very same tokens, so every *filled* label action
// ("S'inscrire", "Se déconnecter", "Supprimer mon compte", "Enregistrer"…)
// shares the TextButton / IconButton gesture language.
// ---------------------------------------------------------------------------
describe("Button (shared label motion)", () => {
  const realPlatform = Platform.OS;

  beforeEach(() => {
    mockReducedMotion = false;
  });

  afterEach(() => {
    jest.replaceProperty(Platform, "OS", realPlatform);
    jest.restoreAllMocks();
  });

  it("lifts its surface to the colour it already has when pressed", () => {
    jest.replaceProperty(Platform, "OS", "web");
    const { getByLabelText } = render(<Button title="Se déconnecter" />);
    const button = getByLabelText("Se déconnecter");

    expect(classNameOf(button)).toContain("bg-primary dark:bg-primary-dark");
    expect(classNameOf(button)).toContain("active:bg-primary-hover");
    expect(classNameOf(button)).toContain("transition-colors");
    expect(classNameOf(button)).toContain("duration-150");

    fireEvent(button, "hoverIn");
    expect(classNameOf(button)).toContain("bg-primary-hover dark:bg-primary-hover-dark");

    fireEvent(button, "hoverOut");
    expect(classNameOf(button)).not.toContain(
      "bg-primary-hover dark:bg-primary-hover-dark"
    );
  });

  it("tints the transparent variants so the gesture still reads on hover", () => {
    jest.replaceProperty(Platform, "OS", "web");
    const { getByLabelText, getByText } = render(
      <Button title="Bloquer" variant="ghost" />
    );
    const button = getByLabelText("Bloquer");

    fireEvent(button, "hoverIn");
    expect(classNameOf(button)).toContain("bg-primary/10 dark:bg-primary-dark/15");
    expect(getByText("Bloquer").props.className).toContain(
      "text-primary-hover dark:text-primary-hover-dark"
    );
  });

  it("lifts on keyboard focus with no pointer involved", () => {
    const { getByLabelText } = render(<Button title="Message" variant="secondary" />);
    const button = getByLabelText("Message");

    fireEvent(button, "focus");
    expect(classNameOf(button)).toContain("bg-primary/10 dark:bg-primary-dark/15");

    fireEvent(button, "blur");
    expect(classNameOf(button)).not.toContain("bg-primary/10 dark:bg-primary-dark/15");
  });

  it("never lifts while disabled", () => {
    jest.replaceProperty(Platform, "OS", "web");
    const { getByLabelText } = render(<Button title="Valider" disabled />);
    const button = getByLabelText("Valider");

    fireEvent(button, "hoverIn");
    expect(classNameOf(button)).toContain("bg-disabled-bg");
    expect(classNameOf(button)).not.toContain("bg-primary-hover");
  });

  it("offers the compact size for inline action rows", () => {
    const { getByLabelText } = render(<Button title="Enregistrer" size="sm" />);
    expect(classNameOf(getByLabelText("Enregistrer"))).toContain("h-9 px-4");
  });
});
