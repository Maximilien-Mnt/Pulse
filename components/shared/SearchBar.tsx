// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — SearchBar (shared)
//
// Single search pill used in feed / explore / conversations. Motion follows
// IconButton / PressableScale: hover lifts the surface, press squashes gently
// (0.98 — calmer than round buttons, deliberate for a full-width bar), focus
// draws the primary border + primary icon. Reduced-motion snaps all states.
// ---------------------------------------------------------------------------

import { useCallback, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { ICON_BUTTON_SCALE_PRESS } from "@/components/ui/IconButton";
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

const restSurface = "bg-neutral-100 dark:bg-neutral-800";
const liftedSurface = "bg-neutral-200 dark:bg-neutral-700";

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

  const pillClass = cn(
    "flex-row items-center h-11 rounded-full px-4 gap-2 border-[1.5px]",
    focused ? "border-primary" : "border-transparent",
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

  // ── Collapsed (pressable stub) ───────────────────────────────────
  if (onPress && !expanded) {
    return (
      <PressableScale
        onPress={onPress}
        scaleOnPress={SEARCH_BAR_SCALE_PRESS}
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
        {hasQuery ? (
          <Pressable
            onPress={handleClear}
            hitSlop={8}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("common.search")}
          >
            <Icon name="XCircle" size={18} color="text-tertiary" />
          </Pressable>
        ) : null}
      </PressableScale>
    );
  }

  // ── Expanded ─────────────────────────────────────────────────────
  return (
    <View className={pillClass}>
      <Icon name="Search" size={18} color={engaged ? "primary" : "text-tertiary"} />
      <TextInput
        className="flex-1 text-base font-inter text-neutral-900 dark:text-neutral-50"
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
      />
      {value.length > 0 ? (
        <PressableScale
          onPress={handleClear}
          scaleOnPress={ICON_BUTTON_SCALE_PRESS}
          scaleOnHover={1}
          hitSlop={8}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("common.search")}
        >
          <Icon name="XCircle" size={18} color="text-tertiary" filled />
        </PressableScale>
      ) : null}
    </View>
  );
}