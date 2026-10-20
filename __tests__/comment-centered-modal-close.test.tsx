// ---------------------------------------------------------------------------
// PULSE — CommentCenteredModal close button tests
//
// The comments window close (X) control renders through the canonical
// <IconButton> so it inherits the shared motion language (surface lift +
// glyph grow on hover/focus, spring squash on press). These tests pin the
// wiring: correct icon, accessible label/hint, and onPress -> onClose.
// The animation contract itself is pinned in icon-button.test.tsx.
// ---------------------------------------------------------------------------

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { CommentCenteredModal } from "@/components/feed/CommentCenteredModal";

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: () => null,
}));

jest.mock("@/stores/themeStore", () => ({
  useThemeStore: () => false,
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [] }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) }) },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/hooks/usePostComment", () => ({
  usePostComment: () => ({
    commentsCount: 0,
    isPending: false,
    addComment: jest.fn(),
    deleteComment: jest.fn(),
    editComment: jest.fn(),
  }),
}));

jest.mock("@/components/ui/Icon", () => {
  const { View } = jest.requireActual("react-native");
  return {
    Icon: (props: Record<string, unknown>) => <View {...props} testID="icon-glyph" />,
  };
});

describe("CommentCenteredModal close button", () => {
  it("renders the X through IconButton with an accessible label and hint", () => {
    const { getAllByLabelText, getAllByTestId, getByTestId } = render(
      <CommentCenteredModal postId="p1" visible onClose={jest.fn()} />
    );

    // The backdrop also carries label "Fermer" — the circular close button is
    // the one tagged `comments-close`.
    const closeButton = getByTestId("comments-close");
    expect(closeButton).toBeTruthy();
    expect(getAllByLabelText("Fermer").length).toBeGreaterThanOrEqual(1);
    expect(closeButton.props.accessibilityLabel).toBe("Fermer");
    expect(closeButton.props.accessibilityHint).toBe("Ferme les commentaires");
    const glyphs = getAllByTestId("icon-glyph");
    expect(glyphs.map((g) => g.props.name)).toContain("X");
  });

  it("calls onClose when pressed", () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <CommentCenteredModal postId="p1" visible onClose={onClose} />
    );

    fireEvent.press(getByTestId("comments-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
