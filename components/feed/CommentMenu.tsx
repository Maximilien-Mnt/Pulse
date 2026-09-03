// ---------------------------------------------------------------------------
// PULSE FEED — Comment Menu
//
// A native-style context menu that appears anchored to a pressable button.
// It measures the button's on-screen position and places a small popover
// menu right next to it, with smart positioning to stay within screen bounds.
//
// Features:
//   - Anchored positioning via measureInWindow()
//   - Auto-flips above/below and left/right based on available space
//   - Backdrop overlay that blocks touches on background content
//   - Spring-scale + fade animation
//   - Close on backdrop tap or Escape (web)
// ---------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { Icon, type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MenuItem = {
  key: string;
  label: string;
  icon: IconName;
  iconColor?: "error-600" | "text-secondary";
  destructive?: boolean;
  onPress: () => void;
};

export interface CommentMenuProps {
  visible: boolean;
  anchorX: number;
  anchorY: number;
  anchorWidth: number;
  anchorHeight: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MENU_WIDTH = 192;
const MENU_MARGIN = 8;
const MENU_PADDING = 8;
const SCREEN = Dimensions.get("window");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommentMenu({
  visible,
  anchorX,
  anchorY,
  anchorWidth,
  anchorHeight,
  onClose,
  onEdit,
  onDelete,
  isDeleting = false,
}: CommentMenuProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const items: MenuItem[] = useMemo(
    () => [
      {
        key: "edit",
        label: "Modifier",
        icon: "Pen",
        onPress: onEdit,
      },
      {
        key: "delete",
        label: "Supprimer",
        icon: "Trash2",
        iconColor: "error-600",
        destructive: true,
        onPress: onDelete,
      },
    ],
    [onEdit, onDelete]
  );

  // Calculate position when the menu becomes visible
  useEffect(() => {
    if (!visible) return;

    const anchorCenterX = anchorX + anchorWidth / 2;
    const menuHeightEstimate = items.length * 48;

    // Horizontal: center under the anchor, clamp to screen bounds
    let left = anchorCenterX - MENU_WIDTH / 2;
    if (left < MENU_MARGIN) left = MENU_MARGIN;
    if (left + MENU_WIDTH > SCREEN.width - MENU_MARGIN) {
      left = SCREEN.width - MENU_WIDTH - MENU_MARGIN;
    }

    // Vertical: place below if there's enough space, otherwise above
    const spaceBelow = SCREEN.height - anchorY - anchorHeight - MENU_MARGIN;
    const spaceAbove = anchorY - MENU_MARGIN;

    let top: number;
    if (spaceBelow >= menuHeightEstimate || spaceBelow >= spaceAbove) {
      top = anchorY + anchorHeight + 4;
    } else {
      top = anchorY - menuHeightEstimate - 4;
      if (top < MENU_MARGIN) top = MENU_MARGIN;
    }

    setPosition({ top, left });

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 12,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    visible,
    anchorX,
    anchorY,
    anchorWidth,
    anchorHeight,
    items.length,
    scaleAnim,
    opacityAnim,
  ]);

  // Animate out when hiding
  useEffect(() => {
    if (!visible) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
    >
      {/* Backdrop — covers everything, dismisses on tap */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
      </TouchableWithoutFeedback>

      {/* Menu */}
      <Animated.View
        style={[
          styles.menuContainer,
          {
            top: position.top,
            left: position.left,
            width: MENU_WIDTH,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
        pointerEvents="box-none"
      >
        {items.map((item, idx) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            disabled={isDeleting && item.key === "delete"}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            className={cn(
              "flex-row items-center gap-3 px-4 py-3",
              idx === 0 ? "rounded-t-xl" : "",
              idx === items.length - 1 ? "rounded-b-xl" : "",
              "bg-surface dark:bg-neutral-800",
              item.destructive
                ? "active:bg-error-50 dark:active:bg-neutral-900"
                : "active:bg-neutral-100 dark:active:bg-neutral-700"
            )}
          >
            <Icon
              name={item.icon}
              size={18}
              color={item.iconColor ?? "text-secondary"}
            />
            <Text
              className={cn(
                "flex-1 text-sm font-medium",
                item.destructive
                  ? "text-error-600"
                  : "text-neutral-700 dark:text-neutral-200"
              )}
            >
              {item.label}
            </Text>
            {isDeleting && item.key === "delete" && (
              <View className="w-4 h-4 rounded-full border-2 border-error-600 border-t-transparent animate-spin" />
            )}
          </Pressable>
        ))}
      </Animated.View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
    menuContainer: {
    position: "absolute",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
});
