// ---------------------------------------------------------------------------
// PULSE SHARED — Action menu rows (uniform option rows)
//
// One sibling row per descriptor option, shared by the floating popover
// (ActionMenuPopover) and the bottom-sheet fallback (ActionMenuSheet), so the
// options look and behave identically in both presentations:
//
//   - **Identical structure for every row**: a fixed-width leading icon slot
//     (same width whether or not that option has an icon) followed by a
//     `flex-1` left-aligned label. No per-tone wrapper views, so every option
//     — neutral and destructive alike — aligns vertically by construction.
//   - **One uniform hover treatment**: pointer hover (web) and keyboard focus
//     lift the row to the app's blue reference tint (`bg-primary-tint`), faded
//     over the shared 150ms colour transition. Destructive rows keep their red
//     label/icon colour — only the hover surface is shared.
//   - Press feedback (tint + opacity dip) and the 44px touch target contract
//     are the same for every row; disabled rows are dimmed and inert.
// ---------------------------------------------------------------------------

import React, { useState } from "react";
import { Platform, Pressable, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import type { ActionMenuDescriptor } from "@/components/shared/nativeActionMenu";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/utils/format";

interface ActionMenuRowsProps {
  descriptor: ActionMenuDescriptor;
  onSelect: (key: string) => void;
  /** Optional icon per option key. */
  icons?: Partial<Record<string, IconName>>;
  /** Row height rhythm: compact (popover) or roomy (bottom sheet). */
  density?: "popover" | "sheet";
  /** Test-ID prefix for the rows. */
  testIDPrefix?: string;
}

const isWeb = Platform.OS === "web";

function ActionMenuRow({
  label,
  destructive,
  disabled,
  icon,
  labelVariant,
  rowClassName,
  onPress,
  accessibilityLabel,
  testID,
}: {
  label: string;
  destructive: boolean;
  disabled: boolean;
  icon?: IconName;
  labelVariant: "body" | "subtitle";
  rowClassName: string;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const lifted = (hovered || focused) && !disabled;
  const transition = cn(!reduceMotion && "transition-colors", "duration-150");

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      onHoverIn={isWeb ? () => setHovered(true) : undefined}
      onHoverOut={isWeb ? () => setHovered(false) : undefined}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={cn(
        "flex-row items-center gap-3 rounded-xl",
        rowClassName,
        transition,
        lifted && "bg-primary-tint dark:bg-primary-tint-dark",
        !disabled && "active:bg-primary-tint dark:active:bg-primary-tint-dark active:opacity-70",
        isWeb && focused && !disabled && "outline outline-2 outline-primary outline-offset-2",
        disabled && "opacity-50"
      )}
    >
      {/* Fixed-width icon slot: identical leading edge whether or not this
          option carries an icon, so every label starts at the same x. */}
      <View style={{ width: 18 }} className="shrink-0 items-center justify-center">
        {icon ? (
          <Icon
            name={icon}
            size={18}
            color={destructive ? "error-600" : "text-secondary"}
            decorative
          />
        ) : null}
      </View>
      <Text
        variant={labelVariant}
        numberOfLines={1}
        ellipsizeMode="tail"
        className={cn(
          "flex-1 text-left",
          destructive ? "text-error" : "text-text-primary",
          transition
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ActionMenuRows({
  descriptor,
  onSelect,
  icons,
  density = "popover",
  testIDPrefix = "action-menu-option",
}: ActionMenuRowsProps) {
  const popover = density === "popover";
  return (
    <>
      {descriptor.options.map((option) => (
        <ActionMenuRow
          key={option.key}
          label={option.label}
          destructive={option.destructive ?? false}
          disabled={option.disabled ?? false}
          icon={icons?.[option.key]}
          labelVariant={popover ? "body" : "subtitle"}
          rowClassName={popover ? "px-3 py-3" : "px-4 py-4"}
          onPress={() => onSelect(option.key)}
          accessibilityLabel={option.label}
          testID={`${testIDPrefix}-${option.key}`}
        />
      ))}
    </>
  );
}
