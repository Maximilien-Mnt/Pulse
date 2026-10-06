// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — SearchBar (shared)
//
// Single search pill used in feed / explore / conversations.
// Motion (coherent with IconButton / Button — 150ms colour fade + spring
// scale, all gated by useReducedMotion):
//   - Bar hover (web) / focus: surface lifts neutral-100 → neutral-200
//     (dark: 800 → 700) + search glyph tints to primary. No border,
//     no outline — focus reads through surface + icon, never a dark ring.
//   - Bar press (collapsed stub): gentle squash to 0.98.
//   - Clear button: circular chip with its own hover (chip darkens +
//     icon tints to primary, surface lifts to 1.06) and press (squash
//     to 0.9). Plain "X" glyph — never XCircle+filled (which self-fills
//     into an unreadable blob).
// ---------------------------------------------------------------------------

import { useCallback, useState } from "react";
import { Platform, Text, TextInput, View } from "react-native";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import {
  ICON_BUTTON_SCALE_HOVER,
  ICON_BUTTON_SCALE_PRESS,
} from "@/components/ui/IconButton";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useDesignTokens } from "@/src/design-tokens/useDesignTokens";
import { cn } from "@/utils/format";
import { t } from "@/hooks/useTranslation";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onClear?: () => void;
  onCollapse?: () => void;
  placeholder?: string;
  onPress?: () => void;
  expanded?: boolean;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  className?: string;
};

/** Hover lift for a full-width bar — calmer than the 1.06 icon-button lift. */
export const SEARCH_BAR_SCALE_HOVER = 1.02;
/** Press squash for a full-width bar — calmer than 0.9 icon-button press. */
export const SEARCH_BAR_SCALE_PRESS = 0.98;
/** Colour-fade duration shared with IconButton / Button. */
export const SEARCH_BAR_TRANSITION_MS = 150;

const restSurface = "bg-neutral-100 dark:bg-neutral-800";
const liftedSurface = "bg-neutral-200 dark:bg-neutral-700";

const clearRest = "bg-neutral-300/60 dark:bg-neutral-600/60";
const clearLifted = "bg-neutral-400/80 dark:bg-neutral-500/80";

// ---------------------------------------------------------------------------
// Clear (cross) button — circular chip with hover + press micro-interaction
// ---------------------------------------------------------------------------

function ClearButton({ onPress }: { onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const isWeb = Platform.OS === "web";

  const setTo = useCallback(
    (next: boolean) => setHovered(reduceMotion ? false : next),
    [reduceMotion]
  );

  return (
    <PressableScale
      onPress={onPress}
      scaleOnPress={reduceMotion ? 1 : ICON_BUTTON_SCALE_PRESS}
      scaleOnHover={reduceMotion ? 1 : ICON_BUTTON_SCALE_HOVER}
      hitSlop={10}
      accessible
      accessibilityRole="button"
      accessibilityLabel={t("common.close")}
      accessibilityHint={t("common.close")}
      onHoverIn={isWeb ? () => setTo(true) : undefined}
      onHoverOut={isWeb ? () => setTo(false) : undefined}
      onFocus={() => setTo(true)}
      onBlur={() => setTo(false)}
      className={cn(
        "w-6 h-6 rounded-full items-center justify-center shrink-0",
        hovered ? clearLifted : clearRest,
        !reduceMotion && "transition-colors duration-150"
      )}
    >
      <Icon
        name="X"
        size={14}
        color={hovered ? "primary" : "text-secondary"}
      />
    </PressableScale>
  );
}

export function SearchBar({
  value,
  onChangeText,
  onClear,
  onCollapse,
  placeholder = t("common.search"),
  onPress,
  expanded,
  onSubmitEditing,
  autoFocus = true,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();
  const tokens = useDesignTokens();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const isWeb = Platform.OS === "web";

  const hasQuery = value.trim().length > 0;
  const engaged = hovered || focused || hasQuery;

  const setHover = useCallback(
    (next: boolean) => setHovered(reduceMotion ? false : next),
    [reduceMotion]
  );

  const handleClear = useCallback(() => {
    if (value.length > 0) {
      onChangeText("");
      onClear?.();
    } else {
      onCollapse?.();
    }
  }, [value, onChangeText, onClear, onCollapse]);

  // No border, no outline: hover / focus / query read through the surface
  // colour + the search glyph tint only.
  const pillClass = cn(
    "flex-row items-center h-11 rounded-full px-4 gap-2 border-0",
    engaged ? liftedSurface : restSurface,
    !reduceMotion && "transition-colors duration-150",
    className
  );

  const hoverProps = {
    onHoverIn: isWeb ? () => setHover(true) : undefined,
    onHoverOut: isWeb ? () => setHover(false) : undefined,
    onFocus: () => {
      setFocused(true);
      setHover(true);
    },
    onBlur: () => {
      setFocused(false);
      setHover(false);
    },
  };

  // Web hover on the container: cast keeps TS happy (RN-web forwards it).
  const containerHoverProps: Record<string, () => void> = isWeb
    ? {
        onHoverIn: () => setHover(true),
        onHoverOut: () => setHover(false),
      }
    : {};

  // ── Collapsed (pressable stub) ───────────────────────────────────
  if (onPress && !expanded) {
    return (
      <PressableScale
        onPress={onPress}
        scaleOnPress={reduceMotion ? 1 : SEARCH_BAR_SCALE_PRESS}
        scaleOnHover={reduceMotion ? 1 : SEARCH_BAR_SCALE_HOVER}
        {...hoverProps}
        accessible
        accessibilityRole="button"
        accessibilityLabel={hasQuery ? value : placeholder}
        className={pillClass}
      >
        <Icon name="Search" size={18} color={engaged ? "primary" : "text-tertiary"} />
        <Text
          className={cn(
            "flex-1 text-base font-inter",
            hasQuery ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-500"
          )}
          numberOfLines={1}
        >
          {hasQuery ? value : placeholder}
        </Text>
        {hasQuery ? <ClearButton onPress={handleClear} /> : null}
      </PressableScale>
    );
  }

  // ── Expanded ─────────────────────────────────────────────────────
  return (
    <View className={pillClass} {...containerHoverProps}>
      <Icon name="Search" size={18} color={engaged ? "primary" : "text-tertiary"} />
      <TextInput
        className="flex-1 text-base font-inter text-neutral-900 dark:text-neutral-50 outline-none"
        placeholder={placeholder}
        placeholderTextColor={tokens.colors["text-tertiary"]}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        onFocus={hoverProps.onFocus}
        onBlur={hoverProps.onBlur}
        accessible
        accessibilityLabel={placeholder}
        accessibilityRole="search"
        // Kill the browser / Android default focus ring — focus is conveyed
        // by the lifted surface + primary icon, never a dark outline.
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ outlineStyle: "none" } as never}
      />
      {value.length > 0 ? <ClearButton onPress={handleClear} /> : null}
    </View>
  );
}