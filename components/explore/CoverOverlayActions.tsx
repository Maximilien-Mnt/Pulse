// ---------------------------------------------------------------------------
// PULSE EXPLORE — Cover Overlay Actions
//
// Floating like/share chips anchored to the top-right corner of an explore
// card cover image. Glass style (translucent dark + light border) keeps the
// icons legible over any photo, matching the ClubHeroBar floating chips.
//
// Behavior:
//   - Like chip: unfilled white heart ↔ filled primary heart, with instant
//     local flip + spring pop (borrowed from FavoriteButton), reconciled with
//     the `isFavorite` prop. Stays pressable while pending for instant
//     feedback (the optimistic `useToggleFavorite` hook guards duplicates).
//   - Share chip: opens the native share sheet (same content as ShareButton).
//   - Both chips: hover grow (web) + press squash via PressableScale, all
//     gated by `useReducedMotion`.
//   - Presses stop propagation so tapping a chip never navigates the card.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Share as RNShare, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { hitSlopForIcon } from "@/src/accessibility";

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
  /** Called after the native share dialog is presented. */
  onShare?: (result: { action: string }) => void;
  /** Test identifier prefix for E2E and unit tests. */
  testID?: string;
}

const CHIP_CLASS =
  "rounded-full bg-black/35 border border-white/30 items-center justify-center active:bg-black/50";

export function CoverOverlayActions({
  isFavorite,
  isPending: _isPending,
  onToggleFavorite,
  shareContent,
  size = "md",
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

  return (
    <View
      className={small ? "absolute top-2 right-2 flex-row gap-1.5" : "absolute top-3 right-3 flex-row gap-1.5"}
      pointerEvents="box-none"
    >
      <PressableScale
        onPress={handleToggle}
        scaleOnPress={0.85}
        scaleOnHover={1.08}
        accessibilityRole="button"
        accessibilityLabel={favoriteLabel}
        accessibilityHint={favoriteHint}
        accessibilityState={{ selected: visualLiked }}
        hitSlop={hitSlopForIcon(chipSize)}
        className={`${small ? "w-7 h-7" : "w-9 h-9"} ${CHIP_CLASS}`}
        testID={testID ? `${testID}-favorite` : undefined}
      >
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <Icon
            name="Heart"
            size={heartSize}
            color="white"
            active={visualLiked}
            decorative
          />
        </Animated.View>
      </PressableScale>
      <PressableScale
        onPress={handleShare}
        scaleOnPress={0.85}
        scaleOnHover={1.08}
        accessibilityRole="button"
        accessibilityLabel={shareLabel}
        hitSlop={hitSlopForIcon(chipSize)}
        className={`${small ? "w-7 h-7" : "w-9 h-9"} ${CHIP_CLASS}`}
        testID={testID ? `${testID}-share` : undefined}
      >
        <Icon name="Share2" size={shareSize} color="white" decorative />
      </PressableScale>
    </View>
  );
}
