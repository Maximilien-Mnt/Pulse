// ---------------------------------------------------------------------------
// PULSE — Cover overlay actions tests
//
// Checks the floating like/share chips anchored to explore card covers:
//   - both chips render with accessible labels,
//   - pressing like flips the filled state instantly + calls the toggle,
//   - prop reconciliation restores the server truth,
//   - pressing share opens the native share sheet with the right content,
//   - every chip renders at the shared 44x44 hit target (`size` is accepted
//     for API compatibility but no longer changes the dimensions).
// ---------------------------------------------------------------------------

import React from "react";
import { Platform, Share } from "react-native";
import { fireEvent, render, act } from "@testing-library/react-native";
import { CoverOverlayActions } from "@/components/explore/CoverOverlayActions";

const classNameOf = (node: { props: { className?: string } }) => node.props.className ?? "";

// Must mirror the hover classes in CoverOverlayActions. Asserted as whole token
// sequences because the resting inline class already contains
// `active:bg-neutral-200`.
const HOVER_INLINE = "bg-neutral-200 dark:bg-neutral-700";

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

  it("renders the standard 44x44 chip in grid size", () => {
    // `size` is accepted for API compatibility but no longer drives the
    // dimensions — every circular action shares the 44x44 hit target
    // (BUTTON_ICON_SIZE; see CoverOverlayActions).
    const { getByTestId } = renderOverlay({ size: "sm", testID: "cover-actions" });
    expect(getByTestId("cover-actions-favorite").props.className).toContain("w-11 h-11");
    expect(getByTestId("cover-actions-share").props.className).toContain("w-11 h-11");
  });

  it("renders the same 44x44 chip by default", () => {
    const { getByTestId } = renderOverlay({ testID: "cover-actions" });
    expect(getByTestId("cover-actions-favorite").props.className).toContain("w-11 h-11");
    expect(getByTestId("cover-actions-share").props.className).toContain("w-11 h-11");
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

  describe("hover (web)", () => {
    const realPlatform = Platform.OS;

    beforeEach(() => {
      jest.replaceProperty(Platform, "OS", "web");
    });

    afterEach(() => {
      jest.replaceProperty(Platform, "OS", realPlatform);
    });

    it("lifts the inline chip surface on hover and restores it on hover out", () => {
      const { getByTestId } = renderOverlay({ variant: "inline", testID: "cover-actions" });
      const fav = getByTestId("cover-actions-favorite");

      expect(classNameOf(fav)).toContain("bg-neutral-100");
      // The resting class already carries `active:bg-neutral-200`, so assert on
      // the whole hover token sequence rather than the bare colour.
      expect(classNameOf(fav)).not.toContain(HOVER_INLINE);

      fireEvent(fav, "hoverIn");
      expect(classNameOf(fav)).toContain(HOVER_INLINE);

      fireEvent(fav, "hoverOut");
      expect(classNameOf(fav)).toContain("bg-neutral-100");
      expect(classNameOf(fav)).not.toContain(HOVER_INLINE);
    });

    it("lifts the overlay chip surface on hover", () => {
      const { getByTestId } = renderOverlay({ testID: "cover-actions" });
      const share = getByTestId("cover-actions-share");

      expect(classNameOf(share)).toContain("bg-black/35");
      fireEvent(share, "hoverIn");
      expect(classNameOf(share)).toContain("bg-black/50");
    });

    it("hovers each chip independently", () => {
      const { getByTestId } = renderOverlay({ variant: "inline", testID: "cover-actions" });
      const fav = getByTestId("cover-actions-favorite");
      const share = getByTestId("cover-actions-share");

      fireEvent(fav, "hoverIn");
      expect(classNameOf(fav)).toContain(HOVER_INLINE);
      expect(classNameOf(share)).not.toContain(HOVER_INLINE);

      fireEvent(share, "hoverIn");
      expect(classNameOf(share)).toContain(HOVER_INLINE);
    });

    it("animates the colour fade on both chips", () => {
      const { getByTestId } = renderOverlay({ testID: "cover-actions" });
      expect(classNameOf(getByTestId("cover-actions-favorite"))).toContain("transition-colors");
      expect(classNameOf(getByTestId("cover-actions-favorite"))).toContain("duration-150");
      expect(classNameOf(getByTestId("cover-actions-share"))).toContain("transition-colors");
    });
  });

  it("does not attach hover handlers on native", () => {
    // Platform.OS is native under jest-expo, so no hover affordance is wired.
    const { getByTestId } = renderOverlay({ variant: "inline", testID: "cover-actions" });
    expect(getByTestId("cover-actions-favorite").props.onHoverIn).toBeUndefined();
    expect(classNameOf(getByTestId("cover-actions-favorite"))).toContain("bg-neutral-100");
  });
});
