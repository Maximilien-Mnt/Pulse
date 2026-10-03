// ---------------------------------------------------------------------------
// PULSE EXPLORE — Cover Overlay Actions
//
// Two placements for the like/share actions on explore cards:
//   - overlay (default): floating glass chips anchored to the top-right
//     corner of a cover image. Glass style (translucent dark + light border)
//     keeps the icons legible over any photo.
//   - inline: static chips for the info section, anchored at the right side
//     of the title row. Neutral surface style for light/dark card bodies.
//
// Behavior (both variants):
//   - Like chip: unfilled heart ↔ filled primary heart, with instant
//     local flip + spring pop (borrowed from FavoriteButton), reconciled with
//     the `isFavorite` prop. Stays pressable while pending for instant
//     feedback (the optimistic `useToggleFavorite` hook guards duplicates).
//   - Share chip: opens the native share sheet (same content as ShareButton).
//   - Both chips: hover (web) surface lift + press squash via PressableScale.
//     The hover uses the exact colour of the pressed state, so hover and press
//     read as one system, and a `transition-colors` fade makes it a small,
//     calm animation. Mirrors the hover pattern of MessageBubble (web-only
//     `hovered` state + class swap) rather than Tailwind `hover:` variants.
//     Both the fade and the press squash are gated by `useReducedMotion`.
//   - Presses stop propagation so tapping a chip never navigates the card.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform, Share as RNShare, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { ICON_BUTTON_TRANSITION_MS } from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/PressableScale";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { hitSlopForIcon } from "@/src/accessibility";
import { cn } from "@/utils/format";

export interface CoverShareContent {
  title: string;
  message?: string;
  url?: string;
}

interface CoverOverlayActionsProps {
  isFavorite: boolean;
  /** Accepted for API compatibility; ignored — chips stay pressable for instant feedback. */
  isPending?: boolean;
  onToggleFavorite: () => void;
  shareContent: CoverShareContent;
  /** "md" for default/wide covers, "sm" for compact grid covers. */
  size?: "md" | "sm";
  /**
   * Placement of the two chips.
   * - "overlay": absolutely positioned over the cover image (glass style).
   * - "inline": static row for the title row of the info section.
   */
  variant?: "overlay" | "inline";
  /** Called after the native share dialog is presented. */
  onShare?: (result: { action: string }) => void;
  /** Test identifier prefix for E2E and unit tests. */
  testID?: string;
}

// Resting and hovered surfaces are declared per placement. Each hovered
// background intentionally matches that placement's `active:` colour, so the
// chip reads as one control whether the pointer is hovering or pressing.
// `transition-colors` (ICON_BUTTON_TRANSITION_MS, same duration as
// MessageBubble and the arrow nudge) is what turns the swap into the small
// fade animation. These chips are the reference implementation that
// <IconButton> (components/ui/IconButton.tsx) was extracted from, so they now
// share its timing constants rather than restating them.
const OVERLAY_CHIP_CLASS =
  `rounded-full bg-black/35 border border-white/30 items-center justify-center active:bg-black/50 transition-colors duration-${ICON_BUTTON_TRANSITION_MS}`;
const OVERLAY_CHIP_HOVER_CLASS = "bg-black/50";

const INLINE_CHIP_CLASS =
  `rounded-full bg-neutral-100 dark:bg-neutral-800 border border-border items-center justify-center active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors duration-${ICON_BUTTON_TRANSITION_MS}`;
const INLINE_CHIP_HOVER_CLASS = "bg-neutral-200 dark:bg-neutral-700";

type ChipId = "favorite" | "share";

export function CoverOverlayActions({
  isFavorite,
  isPending: _isPending,
  onToggleFavorite,
  shareContent,
  size = "md",
  variant = "overlay",
  onShare,
  testID,
}: CoverOverlayActionsProps) {
  void _isPending; // accepted for API compat, intentionally ignored
  const reduceMotion = useReducedMotion();

  const small = size === "sm";
  const chipSize = small ? 28 : 36;
  const heartSize = small ? 15 : 18;
  const shareSize = small ? 14 : 16;

  // Instant local like state: flips synchronously on press so the heart fills
  // (+ pop) without waiting for the optimistic hook / backend round-trip.
  // Reconciled with `isFavorite` (server truth or rollback restores the look).
  const [visualLiked, setVisualLiked] = useState(isFavorite);
  const serverLikedRef = useRef(isFavorite);
  const likedRef = useRef(isFavorite);
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (serverLikedRef.current === isFavorite) return;
    serverLikedRef.current = isFavorite;
    setVisualLiked(isFavorite);
  }, [isFavorite]);

  useEffect(() => {
    if (likedRef.current === visualLiked) return;
    likedRef.current = visualLiked;
    if (reduceMotion) {
      pop.setValue(1);
      return;
    }
    pop.setValue(visualLiked ? 0.6 : 1.3);
    Animated.spring(pop, {
      toValue: 1,
      friction: 5,
      tension: 320,
      useNativeDriver: true,
    }).start();
  }, [visualLiked, pop, reduceMotion]);

  const stopPropagation = useCallback((e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
  }, []);

  const handleToggle = useCallback(
    (e?: { stopPropagation?: () => void }) => {
      stopPropagation(e);
      setVisualLiked((v) => !v);
      onToggleFavorite();
    },
    [onToggleFavorite, stopPropagation],
  );

  const handleShare = useCallback(
    async (e?: { stopPropagation?: () => void }) => {
      stopPropagation(e);
      try {
        const result = await RNShare.share({
          title: shareContent.title,
          message: shareContent.message ?? shareContent.title,
          url: shareContent.url,
        });
        onShare?.(result);
      } catch {
        // User dismissed the share sheet — no-op
      }
    },
    [onShare, shareContent, stopPropagation],
  );

  const favoriteLabel = visualLiked ? "Retirer des favoris" : "Ajouter aux favoris";
  const favoriteHint = visualLiked
    ? "Retire ce contenu de tes favoris"
    : "Ajoute ce contenu à tes favoris";
  const shareLabel = `Partager ${shareContent.title}${shareContent.url ? ` — ${shareContent.url}` : ""}`;

  const isInline = variant === "inline";
  const chipClass = isInline ? INLINE_CHIP_CLASS : OVERLAY_CHIP_CLASS;
  const chipHoverClass = isInline ? INLINE_CHIP_HOVER_CLASS : OVERLAY_CHIP_HOVER_CLASS;
  const containerClass = isInline
    ? "flex-row items-center gap-1.5 shrink-0"
    : small
      ? "absolute top-2 right-2 flex-row gap-1.5"
      : "absolute top-3 right-3 flex-row gap-1.5";
  // On a light card body the icons use the secondary token; the liked heart
  // fills with primary via `active`. On the photo overlay they stay white.
  const idleIconColor = isInline ? ("text-secondary" as const) : ("white" as const);

  // ── Hover (web only) ───────────────────────────────────────────────
  // Hover is a pointer-only affordance, so the handlers are only attached on
  // web — native never carries a hovered state (same guard as MessageBubble).
  // Only one chip can be hovered at a time, hence the single `hovered` value.
  const isWeb = Platform.OS === "web";
  const [hovered, setHovered] = useState<ChipId | null>(null);

  const hoverPropsFor = (chip: ChipId) =>
    isWeb
      ? {
          onHoverIn: () => setHovered(chip),
          onHoverOut: () => setHovered((h) => (h === chip ? null : h)),
        }
      : {};

  const classFor = (chip: ChipId) =>
    cn(
      small ? "w-7 h-7" : "w-9 h-9",
      chipClass,
      hovered === chip && chipHoverClass,
    );

  return (
    <View
      className={containerClass}
      pointerEvents="box-none"
    >
      <PressableScale
        onPress={handleToggle}
        scaleOnPress={0.85}
        scaleOnHover={1.08}
        {...hoverPropsFor("favorite")}
        accessibilityRole="button"
        accessibilityLabel={favoriteLabel}
        accessibilityHint={favoriteHint}
        accessibilityState={{ selected: visualLiked }}
        hitSlop={hitSlopForIcon(chipSize)}
        className={classFor("favorite")}
        testID={testID ? `${testID}-favorite` : undefined}
      >
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <Icon
            name="Heart"
            size={heartSize}
            color={visualLiked ? "primary" : idleIconColor}
            active={visualLiked}
            decorative
          />
        </Animated.View>
      </PressableScale>
      <PressableScale
        onPress={handleShare}
        scaleOnPress={0.85}
        scaleOnHover={1.08}
        {...hoverPropsFor("share")}
        accessibilityRole="button"
        accessibilityLabel={shareLabel}
        hitSlop={hitSlopForIcon(chipSize)}
        className={classFor("share")}
        testID={testID ? `${testID}-share` : undefined}
      >
        <Icon name="Share2" size={shareSize} color={idleIconColor} decorative />
      </PressableScale>
    </View>
  );
}
