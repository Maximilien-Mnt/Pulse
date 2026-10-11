// ---------------------------------------------------------------------------
// PULSE - CreatePopover tests
//
// The Create button's options menu (floating card above / next to the button):
//   - the four options render,
//   - createMenuLayout adapts: single row of squares when wide, 2-col grid
//     when narrower, plain list when too thin for squares,
//   - Club / Event keep the user INSIDE the menu (visibility sub-step with a
//     working back button) - nothing navigates yet,
//   - a final choice navigates first, then closes,
//   - the backdrop (anywhere outside the card) closes the menu.
// ---------------------------------------------------------------------------

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import {
  CreatePopover,
  TILE_SIZE,
  createMenuLayout,
} from "@/components/shared/CreatePopover";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  usePathname: () => "/feed",
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

jest.mock("@/hooks/useTranslation", () => {
  const resolve = (key: string) => key;
  return { useTranslation: () => ({ t: resolve, language: "en" }), t: resolve };
});

beforeEach(() => {
  mockPush.mockClear();
});

const renderOpen = (onClose: () => void = jest.fn()) =>
  render(
    <CreatePopover
      visible
      onClose={onClose}
      anchor={{ placement: "bottom" }}
    />
  );

// ---------------------------------------------------------------------------
// createMenuLayout
// ---------------------------------------------------------------------------

describe("createMenuLayout", () => {
  it("uses a single row of squares once everything fits", () => {
    // One row needs 4 tiles + 3 gaps (~484px).
    expect(createMenuLayout(4 * TILE_SIZE + 3 * 12 + 8)).toBe("square");
  });

  it("falls back to a 2-column grid when one row no longer fits", () => {
    // 240-483px: two square columns fit, four in a row don't.
    expect(createMenuLayout(400)).toBe("grid");
    expect(createMenuLayout(240)).toBe("grid");
  });

  it("falls back to a plain list when too thin for squares", () => {
    expect(createMenuLayout(239)).toBe("list");
    expect(createMenuLayout(100)).toBe("list");
  });
});

// ---------------------------------------------------------------------------
// CreatePopover
// ---------------------------------------------------------------------------

describe("CreatePopover", () => {
  it("renders nothing while closed", () => {
    const { queryByLabelText } = render(
      <CreatePopover
        visible={false}
        onClose={jest.fn()}
        anchor={{ placement: "bottom" }}
      />
    );
    expect(queryByLabelText("create.post")).toBeNull();
  });

  it("renders the four options as a menu", () => {
    const { getByLabelText } = renderOpen();
    expect(getByLabelText("create.title")).toBeTruthy();
    expect(getByLabelText("create.post")).toBeTruthy();
    expect(getByLabelText("create.club")).toBeTruthy();
    expect(getByLabelText("create.event")).toBeTruthy();
    expect(getByLabelText("create.conversation")).toBeTruthy();
  });

  it("keeps the user inside the menu for Club, with a working back button", () => {
    const onClose = jest.fn();
    const { getByLabelText, queryByLabelText } = renderOpen(onClose);

    fireEvent.press(getByLabelText("create.club"));

    // Sub-step swapped the contents in place: no navigation, no close.
    expect(mockPush).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(queryByLabelText("create.post")).toBeNull();
    expect(getByLabelText("create.club.private")).toBeTruthy();
    expect(getByLabelText("create.club.public")).toBeTruthy();

    fireEvent.press(getByLabelText("create.back"));
    expect(getByLabelText("create.post")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps the user inside the menu for Event, with a working back button", () => {
    const { getByLabelText, queryByLabelText } = renderOpen();

    fireEvent.press(getByLabelText("create.event"));

    expect(mockPush).not.toHaveBeenCalled();
    expect(queryByLabelText("create.post")).toBeNull();
    expect(getByLabelText("create.event.private")).toBeTruthy();
    expect(getByLabelText("create.event.public")).toBeTruthy();

    fireEvent.press(getByLabelText("create.back"));
    expect(getByLabelText("create.post")).toBeTruthy();
  });

  it("navigates first, then closes, on a final choice", () => {
    const order: string[] = [];
    mockPush.mockImplementation(() => {
      order.push("push");
    });
    const onClose = jest.fn(() => {
      order.push("close");
    });
    const { getByLabelText } = renderOpen(onClose);

    fireEvent.press(getByLabelText("create.post"));

    expect(mockPush).toHaveBeenCalledWith("/(tabs)/create?mode=post");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["push", "close"]);
  });

  it("navigates with the visibility on a sub-step choice, then closes", () => {
    const onClose = jest.fn();
    const { getByLabelText } = renderOpen(onClose);

    fireEvent.press(getByLabelText("create.club"));
    fireEvent.press(getByLabelText("create.club.private"));

    expect(mockPush).toHaveBeenCalledWith("/create/club/private");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop outside the card is pressed", () => {
    const onClose = jest.fn();
    const { getByLabelText } = renderOpen(onClose);

    fireEvent.press(getByLabelText("common.close"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
