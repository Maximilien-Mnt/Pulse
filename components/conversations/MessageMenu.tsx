// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS — Message Menu
//
// Anchored context menu for a chat message, reusing the exact design of the
// feed CommentMenu (spring-scale popover, backdrop, destructive styling).
//
// Options: Copier / Modifier / Supprimer
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

export interface MessageMenuProps {
  visible: boolean;
  anchorX: number;
  anchorY: number;
  anchorWidth: number;
  anchorHeight: number;
  /** Which anchor edge the menu should hug horizontally ("left" = menu's
   *  left edge aligns with the anchor's left edge; "right" = menu's right
   *  edge aligns with the anchor's right edge). Defaults to centered. */
  hugSide?: "left" | "right";
  onClose: () => void;
  onCopy: () => void;
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

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageMenu({
  visible,
  anchorX,
  anchorY,
  anchorWidth,
  anchorHeight,
  hugSide,
  onClose,
  onCopy,
  onEdit,
  onDelete,
  isDeleting = false,
}: MessageMenuProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const items: MenuItem[] = useMemo(
    () => [
      { key: "copy", label: "Copier", icon: "FileText", onPress: onCopy },
      { key: "edit", label: "Modifier", icon: "Pen", onPress: onEdit },
      {
        key: "delete",
        label: "Supprimer",
        icon: "Trash2",
        iconColor: "error-600",
        destructive: true,
        onPress: onDelete,
      },
    ],
    [onCopy, onEdit, onDelete]
  );

  // Calculate position when the menu becomes visible (same smart flip logic
  // as the feed CommentMenu). Screen bounds are read fresh so the placement
  // stays correct on any screen size / orientation.
  useEffect(() => {
    if (!visible) return;

    const screen = Dimensions.get("window");
    const anchorCenterX = anchorX + anchorWidth / 2;
    const menuHeightEstimate = items.length * 44 + MENU_PADDING * 2;

    // Hug the anchor edge nearest the ⋮ button so the menu stays close to
    // the message and its options button; fall back to centered.
    let left: number;
    if (hugSide === "left") {
      left = anchorX;
    } else if (hugSide === "right") {
      left = anchorX + anchorWidth - MENU_WIDTH;
    } else {
      left = anchorCenterX - MENU_WIDTH / 2;
    }
    left = Math.max(MENU_MARGIN, Math.min(left, screen.width - MENU_WIDTH - MENU_MARGIN));

    let top = anchorY + anchorHeight + MENU_MARGIN;
    if (top + menuHeightEstimate > screen.height - MENU_MARGIN) {
      top = anchorY - menuHeightEstimate - MENU_MARGIN;
    }
    top = Math.max(MENU_MARGIN, top);

    setPosition({ top, left });
    top = Math.max(MENU_MARGIN, top);

    setPosition({ top, left });

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    visible,
    anchorX,
    anchorY,
    anchorWidth,
    anchorHeight,
    hugSide,
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
            <Icon name={item.icon} size={18} color={item.iconColor ?? "text-secondary"} />
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
    borderRadius: 12,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
});