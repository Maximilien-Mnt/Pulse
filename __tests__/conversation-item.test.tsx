// ---------------------------------------------------------------------------
// PULSE — Conversation item tests
//
// Renders one conversation row and checks that the row carries the shared
// micro-interaction contract (components/ui/Arrow.tsx):
//   - press / long-press still reach their handlers,
//   - hover (web pointer) and focus/blur (keyboard) lift the row to the
//     reference tint and release it on hover-out / blur, per row,
//   - the row content nudges ARROW_NUDGE px with the shared duration while
//     active, and snaps without animation under prefers-reduced-motion,
//   - sliding the pointer onto the nested avatar never drops the row state:
//     the avatar re-asserts it and never deactivates it.
// ---------------------------------------------------------------------------

import React from "react";
import { Animated, Platform } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ConversationItem } from "@/components/conversations/ConversationItem";
import { ARROW_NUDGE, ARROW_NUDGE_DURATION } from "@/components/ui/Arrow";

let mockReducedMotion = false;

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockReducedMotion,
}));

const conversation = {
  id: "c1",
  name: "Alice",
  avatar_url: null as string | null,
  last_message: "Salut !",
  last_message_at: "2024-05-01T12:00:00.000Z",
  unread: true,
  pinned: false,
};

/** Split a className string into tokens (substring checks are ambiguous here). */
function classes(node: { props: { className?: unknown } }): string[] {
  return String(node.props.className ?? "").split(/\s+/);
}

describe("ConversationItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReducedMotion = false;
    jest.replaceProperty(Platform, "OS", "web");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fires press and long-press", () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const { getByText } = render(
      <ConversationItem conversation={conversation} onPress={onPress} onLongPress={onLongPress} />
    );

    fireEvent.press(getByText("Alice"));
    expect(onPress).toHaveBeenCalledTimes(1);

    fireEvent(getByText("Alice"), "longPress");
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("lifts to the reference tint while hovered and releases on hover-out", async () => {
    const { getAllByTestId } = render(
      <ConversationItem conversation={conversation} onPress={jest.fn()} />
    );

    const idle = classes(getAllByTestId("conversation-item")[0]);
    expect(idle).not.toContain("bg-primary-tint");

    fireEvent(getAllByTestId("conversation-item")[0], "hoverIn");
    const hovered = classes(getAllByTestId("conversation-item")[0]);
    expect(hovered).toContain("bg-primary-tint");
    expect(hovered).toContain("dark:bg-primary-tint-dark");

    fireEvent(getAllByTestId("conversation-item")[0], "hoverOut");
    await waitFor(() => {
      expect(classes(getAllByTestId("conversation-item")[0])).not.toContain("bg-primary-tint");
    });
  });

  it("lifts to the reference tint on keyboard focus and releases on blur", async () => {
    const { getAllByTestId } = render(
      <ConversationItem conversation={conversation} onPress={jest.fn()} />
    );

    fireEvent(getAllByTestId("conversation-item")[0], "focus");
    expect(classes(getAllByTestId("conversation-item")[0])).toContain("bg-primary-tint");

    fireEvent(getAllByTestId("conversation-item")[0], "blur");
    await waitFor(() => {
      expect(classes(getAllByTestId("conversation-item")[0])).not.toContain("bg-primary-tint");
    });
  });

  it("keeps the tint while the pointer moves onto the avatar", async () => {
    const { getAllByTestId, getByTestId } = render(
      <ConversationItem conversation={conversation} onPress={jest.fn()} />
    );
    const row = () => getAllByTestId("conversation-item")[0];

    fireEvent(row(), "hoverIn");
    expect(classes(row())).toContain("bg-primary-tint");

    // Sliding onto the nested avatar fires the row hover-out first, then the
    // avatar hover-in — the avatar re-asserts the row so it never drops.
    fireEvent(row(), "hoverOut");
    fireEvent(getByTestId("conversation-avatar"), "hoverIn");
    expect(classes(row())).toContain("bg-primary-tint");

    // Avatar focus (keyboard) keeps the row lifted too.
    fireEvent(getByTestId("conversation-avatar"), "focus");
    expect(classes(row())).toContain("bg-primary-tint");

    // Truly leaving the row releases on the deferred off-tick.
    fireEvent(row(), "hoverOut");
    await waitFor(() => {
      expect(classes(row())).not.toContain("bg-primary-tint");
    });
  });

  it("nudges the row content by ARROW_NUDGE with the shared timing", async () => {
    const timing = jest.spyOn(Animated, "timing");

    const { getAllByTestId } = render(
      <ConversationItem conversation={conversation} onPress={jest.fn()} />
    );

    // Idle on mount: the effect still runs once, at rest.
    expect(timing.mock.calls.map((call) => call[1]?.toValue)).toEqual([0]);

    fireEvent(getAllByTestId("conversation-item")[0], "hoverIn");
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: ARROW_NUDGE,
        duration: ARROW_NUDGE_DURATION,
        useNativeDriver: true,
      })
    );

    fireEvent(getAllByTestId("conversation-item")[0], "hoverOut");
    await waitFor(() => {
      expect(timing).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ toValue: 0 })
      );
    });
  });

  it("snaps to the offset instead of animating under reduced motion", () => {
    mockReducedMotion = true;
    const timing = jest.spyOn(Animated, "timing");
    const setValue = jest.spyOn(Animated.Value.prototype, "setValue");

    const { getAllByTestId } = render(
      <ConversationItem conversation={conversation} onPress={jest.fn()} />
    );
    fireEvent(getAllByTestId("conversation-item")[0], "hoverIn");

    expect(timing).not.toHaveBeenCalled();
    expect(setValue.mock.calls.some((call) => call[0] === ARROW_NUDGE)).toBe(true);
  });
});
