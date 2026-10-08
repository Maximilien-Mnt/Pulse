// ---------------------------------------------------------------------------
// PULSE SHARED — Action menu popover (floating, anchored)
//
// Renders an ActionMenuDescriptor as a *floating* menu anchored to the button
// that opened it, for the platforms where React Native exposes no OS options
// menu (Android, web). Unlike the bottom-sheet fallback (ActionMenuSheet), the
// menu appears right next to the trigger — the pattern users expect from a
// row's "⋮" button — while consuming the exact same descriptor, so the option
// list, labels and destructive/disabled states are identical on every platform.
//
// Placement is computed from the trigger's on-screen rect (`anchor`) and the
// current window size, then clamped so the menu is **fully visible at any
// width**: it right-aligns to the button, never crosses the screen edges, and
// flips above the trigger when it would otherwise overflow the bottom.
//
// Options render through <TextButton>, so each row carries the shared
// hover/focus lift, 150ms colour fade and press feedback, and fires its
// action on tap. A full-screen transparent backdrop sits behind the menu:
// tapping anywhere outside dismisses it, exactly like the OS sheet.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native";

import { Text } from "@/components/ui/Text";
import { TextButton } from "@/components/ui/TextButton";
import type { IconName } from "@/components/ui/Icon";
import type { ActionMenuDescriptor } from "@/components/shared/nativeActionMenu";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTranslation } from "@/hooks/useTranslation";
import { useDesignTokens } from "@/src/design-tokens/useDesignTokens";

// ---------------------------------------------------------------------------
// Types + layout tokens
// ---------------------------------------------------------------------------

/** On-screen rect (window coordinates) of the button that opened the menu. */
export interface ActionMenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  descriptor: ActionMenuDescriptor | null;
  /** Trigger rect used to anchor the floating menu. Falls back to top-right. */
  anchor: ActionMenuAnchor | null;
  onClose: () => void;
  onSelect: (key: string) => void;
  /** Optional icon per option key. */
  icons?: Partial<Record<string, IconName>>;
}

/** Preferred menu width; always clamped down to fit narrow screens. */
const MENU_WIDTH = 232;
/** Minimum gap kept between the menu and any screen edge. */
const EDGE = 12;
/** Gap between the trigger and the menu. */
const GAP = 8;
/** Per-option row height used to estimate the menu before it is measured. */
const ROW_HEIGHT = 52;
/** Height of the optional title header. */
const TITLE_HEIGHT = 34;
/** Vertical padding of the card container. */
const CARD_PADDING = 16;
/** Entry animation duration (ms) — the shared, felt-not-flashy range. */
const ENTER_MS = 150;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActionMenuPopover({
  visible,
  descriptor,
  anchor,
  onClose,
  onSelect,
  icons,
}: Props) {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { colors } = useDesignTokens();

  // Real card height, measured once laid out; 0 until then (estimate is used).
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const enter = useRef(new Animated.Value(0)).current;

  // Reset + play the entry animation every time the menu opens.
  useEffect(() => {
    if (!visible) {
      enter.setValue(0);
      setMeasuredHeight(0);
      return;
    }
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: ENTER_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [enter, reduceMotion, visible]);

  const optionCount = descriptor?.options.length ?? 0;

  // Height used for the flip/clamp decision: the measured value once known,
  // otherwise a close estimate so the very first frame already lands in place.
  const estimatedHeight = useMemo(
    () =>
      optionCount * ROW_HEIGHT +
      CARD_PADDING +
      (descriptor?.title ? TITLE_HEIGHT : 0),
    [descriptor?.title, optionCount]
  );
  const menuHeight = measuredHeight || estimatedHeight;

  // ── Placement — clamped so the menu is fully visible at any width ────────
  const fallbackAnchor = useMemo<ActionMenuAnchor>(
    () => ({ x: windowWidth - EDGE, y: 80, width: 0, height: 0 }),
    [windowWidth]
  );
  const rect = anchor ?? fallbackAnchor;

  const menuWidth = Math.min(MENU_WIDTH, windowWidth - EDGE * 2);

  // Horizontal: right-align to the trigger, then clamp inside the screen.
  const rawLeft = rect.x + rect.width - menuWidth;
  const left = clamp(rawLeft, EDGE, windowWidth - menuWidth - EDGE);

  // Vertical: prefer below the trigger; flip above when it would overflow the
  // bottom; if neither side has room, clamp to keep it on-screen.
  const belowTop = rect.y + rect.height + GAP;
  let top = belowTop;
  if (windowHeight - belowTop - EDGE < menuHeight) {
    const aboveTop = rect.y - menuHeight - GAP;
    top = aboveTop >= EDGE ? aboveTop : windowHeight - menuHeight - EDGE;
  }
  top = clamp(top, EDGE, windowHeight - menuHeight - EDGE);

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      setMeasuredHeight(e.nativeEvent.layout.height);
    },
    []
  );

  if (!visible || !descriptor) return null;

  const opacity = enter;
  const translateY = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0],
  });
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  // iOS renders a genuine shadow; on Android the `elevation` value is used.
  const shadow =
    Platform.OS === "android"
      ? { elevation: 8 }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.16,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1" pointerEvents="box-none">
        {/* Backdrop — a tap anywhere outside the menu dismisses it. */}
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        />

        <Animated.View
          testID="action-menu-popover"
          style={[
            { position: "absolute", top, left, width: menuWidth },
            { opacity, transform: [{ translateY }, { scale }] },
          ]}
        >
          <View
            onLayout={onLayout}
            style={[
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 8,
              },
              shadow,
            ]}
          >
            {descriptor.title ? (
              <Text
                variant="caption"
                className="text-text-secondary px-3 pt-1 pb-2"
                numberOfLines={1}
              >
                {descriptor.title}
              </Text>
            ) : null}

            {descriptor.options.map((option) => (
              <TextButton
                key={option.key}
                tone={option.destructive ? "danger" : "neutral"}
                disabled={option.disabled ?? false}
                onPress={() => onSelect(option.key)}
                accessibilityLabel={option.label}
                icon={icons?.[option.key]}
                iconSize={18}
                labelVariant="body"
                className="flex-row items-center gap-3 px-3 py-3 rounded-xl"
                labelClassName="flex-1 text-left"
                testID={`action-menu-option-${option.key}`}
              >
                {option.label}
              </TextButton>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

