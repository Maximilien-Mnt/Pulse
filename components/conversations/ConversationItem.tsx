// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS — Conversation Item
//
// Avatar 48px, name (Subtitle, bold if unread), last message preview
// truncated, timestamp Caption, unread dot primary 8px.
//
// Micro-interaction (web hover / keyboard focus, per row):
//   - the row lifts to the reference tint (`bg-primary-tint`), and
//   - its content (avatar + text + timestamp) nudges 4px to the right and
//     slides back on hover-out / blur — the same timing/easing as the shared
//     arrow nudge (components/ui/Arrow.tsx), since this row has no arrow.
// Both snap without animation under prefers-reduced-motion.
//
// The avatar is a nested pressable (opens the profile). Its hover/focus
// re-asserts the row state and it never deactivates it, so sliding the
// pointer onto the picture keeps the row tint + nudge. Row hover-out / blur
// release on a microtask the nested enter cancels, so the row never flickers
// while the pointer moves between its children.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from "react-native";
import { formatRelative } from "@/utils/date";

import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { ARROW_NUDGE, ARROW_NUDGE_DURATION } from "@/components/ui/Arrow";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/utils/format";
import type { ActionMenuAnchor } from "@/components/shared/ActionMenuPopover";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationItemProps {
  conversation: {
    id: string;
    name: string;
    avatar_url?: string | null;
    last_message?: string | null;
    last_message_at?: string | null;
    unread?: boolean;
    pinned?: boolean;
  };
  onPress: () => void;
  onLongPress?: (anchor?: ActionMenuAnchor | null) => void;
  onAvatarPress?: () => void;
  onOptionsPress?: (anchor?: ActionMenuAnchor | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Options button overlays the date, right-aligned and vertically centered,
  // so the swap happens in place without reflowing the name column.
  optionsLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});

export function ConversationItem({
  conversation,
  onPress,
  onLongPress,
  onAvatarPress,
  onOptionsPress,
}: ConversationItemProps) {
  const { t } = useTranslation();
  const unread = conversation.unread ?? false;
  const pinned = conversation.pinned ?? false;

  // Hover/focus state: drives the tint and the content nudge (per row).
  // Hover-out / blur release on a microtask so a nested enter (avatar) that
  // follows in the same tick cancels the release — the row never flickers
  // while the pointer moves between its children.
  const [active, setActive] = useState(false);
  const offTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWeb = Platform.OS === "web";
  const reduceMotion = useReducedMotion();
  const translateX = useRef(new Animated.Value(0)).current;

  // Row + options-button refs, used to anchor the floating options menu near
  // the "⋮" that opened it. The row is the fallback anchor for the native
  // long-press path (where the ⋮ is never revealed).
  const rowRef = useRef<View>(null);
  const optionsRef = useRef<View>(null);

  // Measure a view's window rect and hand it to `cb`. Guarded so it degrades
  // gracefully in environments without a layout engine (tests / SSR): `cb`
  // then receives `null` and the menu falls back to its default placement.
  const measureAnchor = useCallback(
    (node: View | null, cb: (anchor: ActionMenuAnchor | null) => void) => {
      if (node && typeof node.measureInWindow === "function") {
        let settled = false;
        try {
          node.measureInWindow((x, y, width, height) => {
            if (!settled) {
              settled = true;
              cb({ x, y, width, height });
            }
          });
        } catch {
          cb(null);
          return;
        }
        // Safety net: test renderers expose measureInWindow but never invoke
        // its callback — the menu trigger must never hang.
        setTimeout(() => {
          if (!settled) {
            settled = true;
            cb(null);
          }
        }, 50);
      } else {
        cb(null);
      }
    },
    []
  );

  const handleOptionsPress = useCallback(() => {
    // Prefer the ⋮ button as the anchor; fall back to the whole row.
    const node = optionsRef.current ?? rowRef.current;
    measureAnchor(node, (anchor) => onOptionsPress?.(anchor));
  }, [measureAnchor, onOptionsPress]);

  const handleLongPress = useCallback(() => {
    // Long-press anchors to the row (its top-right corner sits by the ⋮).
    measureAnchor(rowRef.current, (anchor) => onLongPress?.(anchor));
  }, [measureAnchor, onLongPress]);

  // The date ⇄ options-button crossfade rides the same nudge animation: as the
  // row slides ARROW_NUDGE px, the date fades out (1 → 0) and the options
  // button fades in (0 → 1). Deriving both from `translateX` keeps them locked
  // to that one animation and makes them snap together under reduced motion —
  // no extra Animated.timing call is introduced.
  const dateOpacity = useMemo(
    () =>
      translateX.interpolate({
        inputRange: [0, ARROW_NUDGE],
        outputRange: [1, 0],
        extrapolate: "clamp",
      }),
    [translateX]
  );
  const optionsOpacity = useMemo(
    () =>
      translateX.interpolate({
        inputRange: [0, ARROW_NUDGE],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [translateX]
  );

  const cancelOff = useCallback(() => {
    if (offTimer.current !== null) {
      clearTimeout(offTimer.current);
      offTimer.current = null;
    }
  }, []);

  const handleActive = useCallback(() => {
    cancelOff();
    setActive(true);
  }, [cancelOff]);

  const scheduleOff = useCallback(() => {
    cancelOff();
    offTimer.current = setTimeout(() => {
      offTimer.current = null;
      setActive(false);
    }, 0);
  }, [cancelOff]);

  useEffect(
    () => () => {
      if (offTimer.current !== null) clearTimeout(offTimer.current);
    },
    []
  );

  useEffect(() => {
    const to = active ? ARROW_NUDGE : 0;
    if (reduceMotion) {
      // Still move, just without the animation (reduced-motion UX).
      translateX.setValue(to);
      return;
    }
    Animated.timing(translateX, {
      toValue: to,
      duration: ARROW_NUDGE_DURATION,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [active, reduceMotion, translateX]);

  // Native leave of the row host means the pointer truly left (moves between
  // descendants never fire it), so it releases synchronously.
  const webLeaveProps = isWeb
    ? ({
        onMouseLeave: () => {
          cancelOff();
          setActive(false);
        },
      } as const)
    : null;

  return (
    <Pressable
      ref={rowRef}
      onHoverIn={isWeb ? handleActive : undefined}
      onHoverOut={isWeb ? scheduleOff : undefined}
      onFocus={handleActive}
      onBlur={scheduleOff}
      {...(webLeaveProps as any)}
      testID="conversation-item"
      onPress={onPress}
      onLongPress={handleLongPress}
      className={cn(
        "w-full flex-row items-center gap-3 px-4 py-3",
        // Touch press feedback (no hover on native) + the reference hover tint.
        "active:bg-primary-tint dark:active:bg-primary-tint-dark",
        active && "bg-primary-tint dark:bg-primary-tint-dark"
      )}
    >
      {/* Content wrapper: slides 4px right while hovered/focused. */}
      <Animated.View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12, // gap-3
          transform: [{ translateX }],
        }}
      >
        <Pressable
          testID="conversation-avatar"
          onPress={onAvatarPress}
          onHoverIn={isWeb ? handleActive : undefined}
          onFocus={handleActive}
          onBlur={scheduleOff}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Avatar size={48} uri={conversation.avatar_url} />
        </Pressable>

        <View className="flex-1 min-w-0 justify-center">
          <View className="flex-row items-center gap-2">
            <Text
              variant="subtitle"
              className={unread ? "flex-1 text-text-primary font-['Inter_700Bold']" : "flex-1 text-text-primary"}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {conversation.name}
            </Text>
            {pinned ? (
              <Icon name="Pin" size={16} color="text-tertiary" />
            ) : null}
            {unread ? (
              <View className="w-2 h-2 rounded-full bg-primary" />
            ) : null}
          </View>

          <Text
            variant="body"
            className={unread ? "text-text-primary font-['Inter_600SemiBold']" : "text-text-secondary"}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {conversation.last_message ?? "Nouvelle conversation"}
          </Text>
        </View>

        {conversation.last_message_at ? (
          // Stable-width slot: the date defines its width so the flex-1 name
          // column never reflows when the date crossfades into the options
          // button on hover.
          <View className="shrink-0 self-start ml-auto pt-0.5">
            {/* Date — fades out as the row lifts. Never interactive. */}
            <Animated.View
              testID="conversation-date"
              style={{ opacity: dateOpacity }}
              pointerEvents="none"
            >
              <Text variant="caption" className="text-text-tertiary" numberOfLines={1}>
                {formatRelative(conversation.last_message_at)}
              </Text>
            </Animated.View>

            {/* Options button — fades in over the date while hovered/focused and
                becomes pressable, opening the conversation's options menu. At
                rest it is inert so presses fall through to the row. */}
            <Animated.View
              style={[styles.optionsLayer, { opacity: optionsOpacity }]}
              pointerEvents={active ? "auto" : "none"}
            >
              <Pressable
                ref={optionsRef}
                testID="conversation-options"
                onPress={handleOptionsPress}
                onHoverIn={isWeb ? handleActive : undefined}
                onFocus={handleActive}
                onBlur={scheduleOff}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t("conv.options")}
              >
                <Icon name="MoreVertical" size={20} color="text-tertiary" />
              </Pressable>
            </Animated.View>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}