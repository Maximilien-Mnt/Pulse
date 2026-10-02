// ---------------------------------------------------------------------------
// PULSE — Cover overlay actions tests
//
// Checks the floating like/share chips anchored to explore card covers:
//   - both chips render with accessible labels,
//   - pressing like flips the filled state instantly + calls the toggle,
//   - prop reconciliation restores the server truth,
//   - pressing share opens the native share sheet with the right content,
//   - size variants render the right chip dimensions.
// ---------------------------------------------------------------------------

import React from "react";
import { Share } from "react-native";
import { fireEvent, render, act } from "@testing-library/react-native";
import { CoverOverlayActions } from "@/components/explore/CoverOverlayActions";

const shareContent = {
  title: "Morning Run",
  message: "Morning Run — Running | Pulse",
  url: "https://pulse.app/event/e1",
};

function renderOverlay(props?: Partial<React.ComponentProps<typeof CoverOverlayActions>>) {
  return render(
    <CoverOverlayActions
      isFavorite={false}
      onToggleFavorite={jest.fn()}
      shareContent={shareContent}
      {...props}
    />,
  );
}

describe("CoverOverlayActions", () => {
  it("renders like + share chips with accessible labels", () => {
    const { getByLabelText } = renderOverlay();
    expect(getByLabelText("Ajouter aux favoris")).toBeTruthy();
    expect(getByLabelText(`Partager ${shareContent.title} — ${shareContent.url}`)).toBeTruthy();
  });

  it("flips the filled state instantly on like press and calls the toggle", () => {
    const onToggleFavorite = jest.fn();
    const { getByLabelText } = renderOverlay({ onToggleFavorite });
    const like = getByLabelText("Ajouter aux favoris");
    fireEvent.press(like);
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
    expect(like.props.accessibilityState).toMatchObject({ selected: true });
    expect(like.props.accessibilityLabel).toBe("Retirer des favoris");
  });

  it("reconciles with the isFavorite prop (server truth / rollback)", () => {
    const onToggleFavorite = jest.fn();
    const { getByLabelText, rerender } = renderOverlay({ isFavorite: false, onToggleFavorite });
    // Optimistic press keeps the filled look until server truth arrives.
    fireEvent.press(getByLabelText("Ajouter aux favoris"));
    expect(getByLabelText("Retirer des favoris")).toBeTruthy();
    // Server confirms the like → stays filled.
    rerender(
      <CoverOverlayActions
        isFavorite
        onToggleFavorite={onToggleFavorite}
        shareContent={shareContent}
      />,
    );
    expect(getByLabelText("Retirer des favoris")).toBeTruthy();
    // Server truth flips back (rollback / unlike elsewhere) → unfilled.
    rerender(
      <CoverOverlayActions
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        shareContent={shareContent}
      />,
    );
    expect(getByLabelText("Ajouter aux favoris")).toBeTruthy();
  });

  it("marks the chip selected when initially favorited", () => {
    const { getByLabelText } = renderOverlay({ isFavorite: true });
    expect(getByLabelText("Retirer des favoris").props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it("opens the native share sheet with the right content", async () => {
    const spy = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
    const onShare = jest.fn();
    const { getByLabelText } = renderOverlay({ onShare });
    await act(async () => {
      fireEvent.press(
        getByLabelText(`Partager ${shareContent.title} — ${shareContent.url}`),
      );
    });
    expect(spy).toHaveBeenCalledWith({
      title: shareContent.title,
      message: shareContent.message,
      url: shareContent.url,
    });
    expect(onShare).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("renders compact chips in grid size", () => {
    const { getByTestId } = renderOverlay({ size: "sm", testID: "cover-actions" });
    expect(getByTestId("cover-actions-favorite").props.className).toContain("w-7 h-7");
    expect(getByTestId("cover-actions-share").props.className).toContain("w-7 h-7");
  });

  it("renders medium chips by default", () => {
    const { getByTestId } = renderOverlay({ testID: "cover-actions" });
    expect(getByTestId("cover-actions-favorite").props.className).toContain("w-9 h-9");
    expect(getByTestId("cover-actions-share").props.className).toContain("w-9 h-9");
  });

  it("renders a static neutral row in inline variant (title row, no cover overlay)", () => {
    const { getByTestId } = renderOverlay({
      variant: "inline",
      testID: "cover-actions",
    } as any);
    const favClass = getByTestId("cover-actions-favorite").props.className as string;
    expect(favClass).toContain("bg-neutral-100");
    expect(favClass).not.toContain("bg-black/35");
  });

  it("keeps overlay positioning by default", () => {
    const { getByTestId } = renderOverlay({ testID: "cover-actions" });
    expect(getByTestId("cover-actions-favorite").props.className).toContain("bg-black/35");
  });
});
