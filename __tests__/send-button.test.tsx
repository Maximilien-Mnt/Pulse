// ---------------------------------------------------------------------------
// PULSE — SendButton tests
//
// <SendButton> is the single canonical send control, so these tests pin the
// contract shared with <IconButton>: filled paper-plane glyph, primary
// surface lifting to primary-hover over the shared duration, hover (web) +
// focus/blur (keyboard) driving the lift, lift released when disabled or
// loading, white spinner while loading, press squash springs from
// PressableScale, 44px target.
// ---------------------------------------------------------------------------

import React from "react";
import { ActivityIndicator, Platform } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import {
  ICON_BUTTON_SCALE_HOVER,
  ICON_BUTTON_SCALE_PRESS,
  ICON_BUTTON_TRANSITION_MS,
} from "@/components/ui/IconButton";
import { SendButton } from "@/components/ui/SendButton";

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

jest.mock("@/components/ui/Icon", () => {
  const { View } = jest.requireActual("react-native");
  return {
    Icon: (props: Record<string, unknown>) => <View {...props} testID="icon-glyph" />,
  };
});

let lastPressableScaleProps: Record<string, unknown> | null = null;

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

describe("SendButton", () => {
  const realPlatform = Platform.OS;

  afterEach(() => {
    jest.replaceProperty(Platform, "OS", realPlatform);
    jest.restoreAllMocks();
  });

  it("renders a filled white paper-plane with an accessible label", () => {
    const { getByLabelText, getByTestId } = render(
      <SendButton label="Envoyer le message" onPress={jest.fn()} />
    );

    expect(getByLabelText("Envoyer le message")).toBeTruthy();
    expect(getByTestId("icon-glyph").props).toMatchObject({
      name: "Send",
      color: "white",
      filled: true,
    });
  });

  it("uses the icon-button motion language and target", () => {
    const { getByLabelText } = render(<SendButton label="Envoyer" onPress={jest.fn()} />);
    expect(lastPressableScaleProps).toMatchObject({
      scaleOnHover: ICON_BUTTON_SCALE_HOVER,
      scaleOnPress: ICON_BUTTON_SCALE_PRESS,
    });
    expect(classNameOf(getByLabelText("Envoyer"))).toContain("w-11 h-11");
  });

  it("lifts to primary-hover over the shared duration on hover and focus", () => {
    jest.replaceProperty(Platform, "OS", "web");
    const { getByLabelText } = render(<SendButton label="Envoyer" onPress={jest.fn()} />);
    const button = getByLabelText("Envoyer");

    fireEvent(button, "hoverIn");
    expect(classNameOf(button)).toContain(" bg-primary-hover");
    expect(classNameOf(button)).toContain("transition-colors");
    expect(classNameOf(button)).toContain(`duration-${ICON_BUTTON_TRANSITION_MS}`);

    fireEvent(button, "hoverOut");
    expect(classNameOf(button)).toContain("bg-primary");
    expect(classNameOf(button)).not.toContain(" bg-primary-hover");

    fireEvent(button, "focus");
    expect(classNameOf(button)).toContain(" bg-primary-hover");

    fireEvent(button, "blur");
    expect(classNameOf(button)).not.toContain(" bg-primary-hover");
  });

  it("never lifts while disabled and exposes the state to AT", () => {
    jest.replaceProperty(Platform, "OS", "web");
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <SendButton label="Envoyer" disabled onPress={onPress} />
    );
    const button = getByLabelText("Envoyer");

    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent(button, "hoverIn");
    expect(classNameOf(button)).not.toContain("bg-primary-hover");
    expect(classNameOf(button)).toContain("opacity-50");
  });

  it("releases the lift when it becomes disabled mid-hover", () => {
    jest.replaceProperty(Platform, "OS", "web");
    const { getByLabelText, rerender } = render(<SendButton label="Envoyer" />);

    fireEvent(getByLabelText("Envoyer"), "hoverIn");
    expect(classNameOf(getByLabelText("Envoyer"))).toContain("bg-primary-hover");

    rerender(<SendButton label="Envoyer" disabled />);
    expect(classNameOf(getByLabelText("Envoyer"))).not.toContain("bg-primary-hover");
  });

  it("shows a white spinner and blocks press while loading", () => {
    const onPress = jest.fn();
    const { getByLabelText, UNSAFE_getByType } = render(
      <SendButton label="Envoyer" loading onPress={onPress} />
    );
    const button = getByLabelText("Envoyer");

    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    expect(UNSAFE_getByType(ActivityIndicator).props.color).toBe("#FFFFFF");
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("calls onPress when enabled", () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<SendButton label="Envoyer" onPress={onPress} />);
    fireEvent.press(getByLabelText("Envoyer"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
