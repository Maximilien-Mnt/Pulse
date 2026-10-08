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

  it("fires press and long-press", async () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const { getByText } = render(
      <ConversationItem conversation={conversation} onPress={onPress} onLongPress={onLongPress} />
    );

    fireEvent.press(getByText("Alice"));
    expect(onPress).toHaveBeenCalledTimes(1);

    fireEvent(getByText("Alice"), "longPress");
    await waitFor(() => {
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });
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

  // ── Options button (hover affordance) ───────────────────────────────────
  //
  // The relative date on the right swaps into an options button while the row
  // is hovered/focused. At rest the button layer is inert (pointerEvents none),
  // so a press there still opens the conversation; once active the button is
  // the pointer target and its press opens the options menu WITHOUT also
  // triggering the row press.
  it("shows the relative date and renders an options button at rest", () => {
    const { getByTestId } = render(
      <ConversationItem conversation={conversation} onPress={jest.fn()} />
    );

    expect(getByTestId("conversation-date")).toBeTruthy();
    const button = getByTestId("conversation-options");
    expect(button.props.accessibilityRole).toBe("button");
  });

  it("opens the options menu from the button on hover without pressing the row", async () => {
    const onPress = jest.fn();
    const onOptionsPress = jest.fn();
    const { getAllByTestId, getByTestId } = render(
      <ConversationItem
        conversation={conversation}
        onPress={onPress}
        onOptionsPress={onOptionsPress}
      />
    );

    // Row hover arms the options button (its layer becomes the pointer target).
    fireEvent(getAllByTestId("conversation-item")[0], "hoverIn");
    fireEvent.press(getByTestId("conversation-options"));
    await waitFor(() => {
      expect(onOptionsPress).toHaveBeenCalledTimes(1);
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  it("falls through to the row press when the options button is idle", () => {
    const onPress = jest.fn();
    const onOptionsPress = jest.fn();
    const { getByTestId } = render(
      <ConversationItem
        conversation={conversation}
        onPress={onPress}
        onOptionsPress={onOptionsPress}
      />
    );

    // Idle: the button layer is inert, so the press reaches the row.
    fireEvent.press(getByTestId("conversation-options"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onOptionsPress).not.toHaveBeenCalled();
  });

  // ── Options menu anchor ────────────────────────────────────────────────
  //
  // Both triggers (the row's "⋮" button and a long-press) hand the anchor
  // rect up so the floating options menu can position itself next to the
  // button. In the test env there is no layout engine, so `measureInWindow`
  // is unavailable and the callback receives `null` — the menu then falls
  // back to its default placement. The contract asserted here is simply that
  // both triggers fire their handler (the anchor value itself is exercised in
  // action-menu-popover.test.tsx).
  it("passes an anchor (or null without layout) from the options button", async () => {
    const onOptionsPress = jest.fn();
    const { getAllByTestId, getByTestId } = render(
      <ConversationItem
        conversation={conversation}
        onPress={jest.fn()}
        onOptionsPress={onOptionsPress}
      />
    );

    fireEvent(getAllByTestId("conversation-item")[0], "hoverIn");
    fireEvent.press(getByTestId("conversation-options"));
    await waitFor(() => {
      expect(onOptionsPress).toHaveBeenCalledTimes(1);
    });
    // Called with a measured anchor rect, or null when none is measurable.
    const arg = onOptionsPress.mock.calls[0][0];
    expect(arg === null || typeof arg === "object").toBe(true);
  });

  it("passes an anchor (or null without layout) from a long-press", async () => {
    const onLongPress = jest.fn();
    const { getByText } = render(
      <ConversationItem
        conversation={conversation}
        onPress={jest.fn()}
        onLongPress={onLongPress}
      />
    );

    fireEvent(getByText("Alice"), "longPress");
    await waitFor(() => {
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });
    const arg = onLongPress.mock.calls[0][0];
    expect(arg === null || typeof arg === "object").toBe(true);
  });

  it("keeps the row lifted while the pointer rests on the options button", async () => {
    const { getAllByTestId, getByTestId } = render(
      <ConversationItem conversation={conversation} onPress={jest.fn()} />
    );
    const row = () => getAllByTestId("conversation-item")[0];

    fireEvent(row(), "hoverIn");
    expect(classes(row())).toContain("bg-primary-tint");

    // Pointer moving onto the button re-asserts the row state so it never drops.
    fireEvent(row(), "hoverOut");
    fireEvent(getByTestId("conversation-options"), "hoverIn");
    expect(classes(row())).toContain("bg-primary-tint");

    // Truly leaving releases on the deferred off-tick.
    fireEvent(row(), "hoverOut");
    await waitFor(() => {
      expect(classes(row())).not.toContain("bg-primary-tint");
    });
  });
});
