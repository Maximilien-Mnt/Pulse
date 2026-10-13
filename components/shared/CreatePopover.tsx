// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Create Popover
//
// The options menu opened by the Create button (bottom TabBar FAB and the
// SideRail Create control). It replaces the old full-width bottom sheet with a
// small card floating DIRECTLY ABOVE (or next to) the button that opened it:
//
//   - Position: transparent modal + full-screen dismiss layer; the card is
//     absolutely positioned from the anchor the owning nav bar resolves —
//     `placement: "bottom"` (mobile TabBar: centered above the raised FAB) or
//     `placement: "rail"` (SideRail: right of the rail, centered on the
//     button). Coordinates are always clamped to the viewport.
//
//   - Adaptive option layout (driven by the CARD's own content width, so it
//     stays correct even when the card is width-capped by a thin viewport):
//       · `square` — four tiles side by side in a single row, once the card
//         is wide enough for four legible tiles (≥ ~340px of card content;
//         tiles shrink from 112px to fit the 420px card),
//       · `grid`   — the same tiles in a 2-column grid when the card is not
//         wide enough for one row (240–339px),
//       · `list`   — a plain icon+label row list when the screen is too thin
//         for squares (< 240px), since a squeezed square can't hold its label.
//     The card's outer width follows the content mode (clamped to the
//     viewport), so the breakpoint is a real size decision, not a viewport
//     guess with a half-empty card.
//
//   - Hover/focus on every option: the surface LIFTS to the pressed colour
//     over a 150ms `transition-colors` fade and the tile springs up
//     (ICON_BUTTON_SCALE_HOVER) — same language as IconButton/NavTab. JS
//     `hovered` state + class swap (the repo convention), never a Tailwind
//     `hover:` variant. Press squashes back (ICON_BUTTON_SCALE_PRESS). All of
//     it snaps under `useReducedMotion`.
//
//   - Two-step flows (Club / Événement) stay INSIDE the menu: tapping one
//     swaps the card's contents to the visibility sub-step (with a back
//     button) instead of navigating away — no second Modal, no unmount, no
//     close-and-reopen. Header and options change together in the same card.
//
//   - A final choice navigates first and closes second (navigate-then-close),
//     which avoids the nested-modal close race that used to white-screen.
//     Web: Escape closes, Tab cycles the options (plain focus order).
// ---------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, View, useWindowDimensions } from "react-native";
import type { ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Arrow, useArrowNudge } from "@/components/ui/Arrow";
import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/ui/PressableScale";
import {
  ICON_BUTTON_SCALE_HOVER,
  ICON_BUTTON_SCALE_PRESS,
  ICON_BUTTON_TRANSITION_MS,
} from "@/components/ui/IconButton";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTranslation, t } from "@/hooks/useTranslation";
import { cn } from "@/utils/format";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Bottom TabBar height — the card floats directly above this + the inset. */
export const TAB_BAR_HEIGHT = 64;
/** Gap (px) left between the anchor (button / rail) and the card. */
export const CREATE_POPOVER_GAP = 12;
/** Minimum inner width (px) below which the card falls back to the list. */
export const LIST_MIN_CONTENT = 240;
/** Padding inside the card — exported so tests can compute content width. */
export const CARD_PADDING = 16;
/** Gap between options in both the row and the grid. */
export const OPTION_GAP = 12;
/** Columns used by the grid layout. */
export const COLUMNS = 2;
/** Perfect square tiles: their own `w`/`h` in both tile layouts. */
export const TILE_SIZE = 112;
/** Layout mode of the option list — see the header for the thresholds. */
export type CreateMenuLayout = "list" | "grid" | "square";

/** Content width (px) below which a single row no longer fits comfortably.
 *  Tiles shrink to fit the 420px card (down to ~76px each), so this is much
 *  smaller than 4 full-size tiles — it just needs room for 4 legible tiles. */
const CREATE_OPTION_COUNT = 4;
const MIN_SQUARE_TILE = 76;
const SQUARE_ROW_MIN =
  CREATE_OPTION_COUNT * MIN_SQUARE_TILE + (CREATE_OPTION_COUNT - 1) * OPTION_GAP;

/** Pure layout decision — exported so tests can assert the breakpoints. */
export function createMenuLayout(contentWidth: number): CreateMenuLayout {
  if (contentWidth < LIST_MIN_CONTENT) return "list";
  return contentWidth >= SQUARE_ROW_MIN ? "square" : "grid";
}

/** Position of the card relative to the button that opened it. */
export type CreateAnchor =
  | { placement: "bottom" }
  | { placement: "rail"; left: number; centerY: number };

interface CreateOption {
  key: string;
  label: string;
  icon: IconName;
  route: string;
}

const CREATE_OPTIONS: CreateOption[] = [
  { key: "post",     label: t("create.post"),     icon: "PlusCircle",    route: "/(tabs)/create?mode=post" },
  { key: "club",     label: t("create.club"),     icon: "Users",         route: "" },
  { key: "event",    label: t("create.event"),    icon: "Calendar",      route: "" },
  { key: "conv",     label: t("create.conversation"), icon: "MessageCircle", route: "/(tabs)/create?mode=conversation" },
];

type VisibilityStep = "club" | "event" | null;

interface VisibilityOption {
  key: string;
  label: string;
  description: string;
  icon: IconName;
  route: string;
}

const VISIBILITY_OPTIONS: Record<Exclude<VisibilityStep, null>, VisibilityOption[]> = {
  club: [
    {
      key: "private",
      label: t("create.club.private"),
      description: t("create.club.privateDesc"),
      icon: "Lock",
      route: "/create/club/private",
    },
    {
      key: "public",
      label: t("create.club.public"),
      description: t("create.club.publicHint"),
      icon: "Globe",
      route: "/create/club/public",
    },
  ],
  event: [
    {
      key: "private",
      label: t("create.event.private"),
      description: t("create.event.inviteOnlyHint"),
      icon: "Lock",
      route: "/create/event/private",
    },
    {
      key: "public",
      label: t("create.event.public"),
      description: t("create.event.publicIdentityHint"),
      icon: "Globe",
      route: "/create/event/public",
    },
  ],
};

const STEP_TITLES: Record<Exclude<VisibilityStep, null>, string> = {
  club: t("create.club.title"),
  event: t("create.event.title"),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CreatePopoverProps {
  visible: boolean;
  onClose: () => void;
  /** Where the card sits relative to the button. Defaults to the TabBar FAB. */
  anchor?: CreateAnchor;
}

export function CreatePopover({ visible, onClose, anchor }: CreatePopoverProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<VisibilityStep>(null);
  const { active: backActive, ...backNudge } = useArrowNudge();

  // Reset to the root step whenever the popover reopens.
  useEffect(() => {
    if (visible) setStep(null);
  }, [visible]);

  // Entrance: scale 0.96 → 1 with a quick fade. Reduced motion keeps the
  // state (fully visible) but snaps instead of springing.
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    pop.setValue(reduceMotion ? 1 : 0);
    if (reduceMotion) return;
    Animated.spring(pop, {
      toValue: 1,
      friction: 18,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, reduceMotion, pop]);

  // Web: Escape closes the menu.
  useEffect(() => {
    if (!visible || Platform.OS !== "web" || typeof window === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, onClose]);

  const options = step === null ? CREATE_OPTIONS : VISIBILITY_OPTIONS[step];

  const handleSelect = (option: CreateOption) => {
    if (option.key === "club" || option.key === "event") {
      // Another choice is needed — stay in the menu, swap its contents.
      setStep(option.key);
      return;
    }
    // Navigate first, then close — avoids the close-and-navigate race.
    router.push(option.route as any);
    onClose();
  };

  const handleVisibilitySelect = (option: VisibilityOption) => {
    router.push(option.route as any);
    onClose();
  };

  const handleBack = () => {
    setStep(null);
  };

  // ---- Responsive card sizing ---------------------------------------------
  // Available card width (outside its own padding): the viewport minus the
  // popover's margins, minus the rail offset when it anchors beside one.
  const railLeft =
    anchor && anchor.placement === "rail"
      ? Math.max(0, Math.min(anchor.left, width))
      : 0;
  const available = Math.max(
    0,
    width - railLeft - 2 * (CREATE_POPOVER_GAP + CARD_PADDING),
  );
  const layout = createMenuLayout(available);
  const cardWidth =
    layout === "list"
      ? Math.max(0, Math.min(available, LIST_MIN_CONTENT))
      : Math.max(0, Math.min(available, 420));
  // Tile width: split the card's inner width evenly (minus gaps) so 4 tiles
  // fit in one row on wide cards, 2 per row in the grid — never wider than
  // TILE_SIZE so tiles don't stretch on very wide viewports.
  const cardInner = Math.max(0, cardWidth - 2 * CARD_PADDING);
  const tileCols = layout === "square" ? CREATE_OPTION_COUNT : COLUMNS;
  const tileWidth =
    layout === "list"
      ? TILE_SIZE
      : Math.max(
          0,
          Math.min(TILE_SIZE, (cardInner - (tileCols - 1) * OPTION_GAP) / tileCols),
        );

  // ---- Card position (clamped to the viewport) ----------------------------
  const railAnchor = anchor && anchor.placement === "rail" ? anchor : null;
  const cardTop = railAnchor
    ? Math.max(8, Math.min(railAnchor.centerY, height - 8))
    : undefined;
  const cardBottom = railAnchor
    ? undefined
    : TAB_BAR_HEIGHT + insets.bottom + CREATE_POPOVER_GAP;
  const cardLeft = clampLeft(
    railAnchor ? railLeft + CREATE_POPOVER_GAP : null,
    cardWidth,
    width,
  );

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      {/* Fixed full-viewport layer on web so the absolute card coordinates are
          viewport-relative whatever wrapper the web Modal renders. */}
      <View
        style={
          Platform.OS === "web"
            ? ({ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 } as unknown as ViewStyle)
            : { flex: 1 }
        }
      >
        {/* Dimmed backdrop — solid enough that the options stay readable, tap to dismiss */}
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        />

        {/* Card */}
        <Animated.View
          accessibilityRole="menu"
          accessibilityLabel={t("create.title")}
          onLayout={() => {
            // The card measures itself; keep the entrance anchored on the
            // button. A re-layout only re-runs the quick fade — the anchor
            // edges never move, so there is no transform jump.
            pop.stopAnimation();
            pop.setValue(reduceMotion ? 1 : 0);
            if (reduceMotion) return;
            Animated.timing(pop, {
              toValue: 1,
              duration: ICON_BUTTON_TRANSITION_MS,
              useNativeDriver: true,
            }).start();
          }}
          style={{
            position: "absolute",
            top: cardTop,
            bottom: cardBottom,
            left: cardLeft,
            width: cardWidth,
            zIndex: 50,
            opacity: pop,
            transform: [{ scale: reduceMotion ? 1 : pop }],
          }}
          className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl shadow-lg dark:shadow-none"
        >
          <View style={{ padding: CARD_PADDING, gap: 16 }}>
            {step === null ? (
              <Text variant="subtitle" className="text-text-primary">
                {t("create.title")}
              </Text>
            ) : (
              /* Sub-step header with back button */
              <View className="flex-row items-center gap-1">
                <Pressable
                  {...backNudge}
                  onPress={handleBack}
                  accessibilityRole="button"
                  accessibilityLabel={t("create.back")}
                  hitSlop={8}
                  className="p-1 -ml-1 rounded-lg"
                >
                  <Arrow active={backActive} name="ChevronLeft" size={22} color="text-secondary" />
                </Pressable>
                <Text variant="subtitle" className="text-text-primary flex-1" numberOfLines={1}>
                  {STEP_TITLES[step]}
                </Text>
              </View>
            )}

            <View accessibilityRole={layout === "list" ? "list" : "none"}
              style={{ gap: layout === "list" ? 4 : OPTION_GAP }}
              className={layout === "list" ? "" : "flex-row flex-wrap"}
            >
              {options.map((opt) => {
                const o = opt as CreateOption & { description?: string };
                const onPress =
                  step === null
                    ? () => handleSelect(o)
                    : () => handleVisibilitySelect(o as VisibilityOption);
                return layout === "list" ? (
                  <CreateListRow
                    key={o.key}
                    icon={o.icon}
                    label={o.label}
                    description={o.description}
                    onPress={onPress}
                  />
                ) : (
                  <CreateTile
                    key={o.key}
                    icon={o.icon}
                    label={o.label}
                    description={o.description}
                    layout={layout}
                    tileWidth={tileWidth}
                    onPress={onPress}
                  />
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Horizontal position of the card: beside the rail when one is given (already
 * viewport-relative), otherwise centered on the bottom FAB. Always clamped so
 * a narrow viewport can never push the card off-screen.
 */
function clampLeft(
  besideAnchor: number | null,
  cardWidth: number,
  windowWidth: number,
): number {
  if (besideAnchor === null) return Math.max(8, (windowWidth - cardWidth) / 2);
  return Math.max(8, Math.min(besideAnchor, windowWidth - cardWidth - 8));
}

// ---------------------------------------------------------------------------
// CreateTile — one rounded square option (grid / single-row layouts)
// ---------------------------------------------------------------------------

interface CreateTileProps {
  icon: IconName;
  label: string;
  description?: string;
  layout: Exclude<CreateMenuLayout, "list">;
  tileWidth: number;
  onPress: () => void;
}

function CreateTile({ icon, label, description, layout, tileWidth, onPress }: CreateTileProps) {
  const [hovered, setHovered] = useState(false);
  const isWeb = Platform.OS === "web";
  const lifted = hovered;

  return (
    <PressableScale
      onPress={onPress}
      // Springs come from PressableScale — reduced-motion aware by default.
      scaleOnPress={ICON_BUTTON_SCALE_PRESS}
      scaleOnHover={ICON_BUTTON_SCALE_HOVER}
      // Hover is a pointer concept (web only); keyboard focus gets the same
      // affordance everywhere, exactly like IconButton.
      onHoverIn={isWeb ? () => setHovered(true) : undefined}
      onHoverOut={isWeb ? () => setHovered(false) : undefined}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      accessibilityHint={description}
      style={{ width: tileWidth }}
      className={cn(
        // The colour fade that turns the surface swap into an animation —
        // the hover state is a lifted version of the pressed colour, so the
        // two read as one continuous control (IconButton convention).
        "transition-colors",
        `duration-${ICON_BUTTON_TRANSITION_MS}`,
        "rounded-2xl items-center justify-center py-3 px-2",
        lifted
          ? "bg-primary-tint dark:bg-primary-tint-dark"
          : "bg-neutral-50 dark:bg-neutral-800",
      )}
    >
      <View className="w-11 h-11 rounded-full bg-surface dark:bg-surface-dark items-center justify-center mb-2">
        <Icon name={icon} size={22} color={lifted ? "primary" : "text-secondary"} />
      </View>
      <Text variant="caption" className="text-text-primary text-center" numberOfLines={2}>
        {label}
      </Text>
      {description && layout === "square" ? (
        <Text variant="caption" className="text-text-tertiary text-center mt-0.5" numberOfLines={2}>
          {description}
        </Text>
      ) : null}
    </PressableScale>
  );
}

// ---------------------------------------------------------------------------
// CreateListRow — one row option (the narrow-screen fallback layout)
// ---------------------------------------------------------------------------

interface CreateListRowProps {
  icon: IconName;
  label: string;
  description?: string;
  onPress: () => void;
}

function CreateListRow({ icon, label, description, onPress }: CreateListRowProps) {
  const [hovered, setHovered] = useState(false);
  const isWeb = Platform.OS === "web";
  const lifted = hovered;

  return (
    <PressableScale
      onPress={onPress}
      scaleOnPress={ICON_BUTTON_SCALE_PRESS}
      scaleOnHover={ICON_BUTTON_SCALE_HOVER}
      onHoverIn={isWeb ? () => setHovered(true) : undefined}
      onHoverOut={isWeb ? () => setHovered(false) : undefined}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      accessibilityHint={description}
      // Stretches to the card's full inner width; the height is the row's own
      // content (icon circle), so the tap target stays comfortably above 44px.
      style={{ alignSelf: "stretch" }}
      className={cn(
        "transition-colors",
        `duration-${ICON_BUTTON_TRANSITION_MS}`,
        "flex-row items-center gap-3 py-2.5 px-2 rounded-xl",
        lifted
          ? "bg-primary-tint dark:bg-primary-tint-dark"
          : "bg-transparent",
      )}
    >
      <View className="w-9 h-9 rounded-full bg-neutral-50 dark:bg-neutral-800 items-center justify-center">
        <Icon name={icon} size={18} color={lifted ? "primary" : "text-secondary"} />
      </View>
      <View className="flex-1">
        <Text variant="body" className="text-text-primary" numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" className="text-text-tertiary" numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
      <Icon name="ChevronRight" size={16} color="text-tertiary" />
    </PressableScale>
  );
}

