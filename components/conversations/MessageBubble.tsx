// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS — Message Bubble
//
// "moi" = primary bg, white text, right-aligned
// "autre" = bg-alt, text-primary, left-aligned, radius lg
//
// Options menu (own messages only):
//   - Mobile: long-press the bubble opens the anchored MessageMenu
//   - Web/desktop: hover reveals a small ⋮ button that opens the menu
//   - "Modifié" indicator when the message has been edited
// ---------------------------------------------------------------------------

import React, { useCallback, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { cn } from "@/utils/format";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import type { MessageType } from "@/types";
import { MessageMenu } from "./MessageMenu";

interface MessageBubbleProps {
  text: string;
  isMine: boolean;
  type?: MessageType;
  isEdited?: boolean;
  canModify?: boolean;
  isDeleting?: boolean;
  className?: string;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function MessageBubble({
  text,
  isMine,
  type,
  isEdited,
  canModify = false,
  isDeleting = false,
  className,
  onCopy,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const bubbleRef = useRef<React.ComponentRef<typeof Pressable>>(null);
  const buttonRef = useRef<React.ComponentRef<typeof Pressable>>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [anchorMetrics, setAnchorMetrics] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const isWeb = Platform.OS === "web";

  const openMenu = useCallback(() => {
    if (!canModify) return;
    // Prefer the ⋮ button as anchor (web) so the menu always opens right
    // next to it; fall back to the bubble (mobile long-press). Measure at
    // open time so coordinates are always fresh.
    const anchor = buttonRef.current ?? bubbleRef.current;
    if (!anchor) return;
    anchor.measureInWindow((x, y, width, height) => {
      if (x === 0 && y === 0 && width === 0 && height === 0) {
        // Fallback if the preferred anchor reported nothing measurable
        const fallback = buttonRef.current === anchor ? bubbleRef.current : buttonRef.current;
        if (fallback && fallback !== anchor) {
          fallback.measureInWindow((fx, fy, fw, fh) => {
            setAnchorMetrics({ x: fx, y: fy, width: fw, height: fh });
            setMenuVisible(true);
          });
          return;
        }
      }
      setAnchorMetrics({ x, y, width, height });
      setMenuVisible(true);
    });
  }, [canModify]);

  // System messages: small, grey, centered, no sender — no options menu.
  if (type === "system") {
    return (
      <View className={cn("max-w-[90%] py-2 my-1 self-center", className)}>
        <Text
          variant="caption"
          className="text-neutral-500 dark:text-neutral-400 text-center italic"
        >
          {text}
        </Text>
      </View>
    );
  }

  // Regular messages (text, image, file)
  return (
    <>
      <View
        collapsable={false}
        className={cn("self-stretch flex-row items-center my-1", isMine ? "justify-end" : "justify-start")}
      >
        {/* ⋮ options button (web/desktop, own messages) — always visible,
            vertically centered on the message, opposite side of the bubble
            tail. Shows a little grey bg only when hovered directly. */}
        {isWeb && canModify && (
          <Pressable
            ref={buttonRef}
            onPress={openMenu}
            accessibilityRole="button"
            accessibilityLabel="Options du message"
            hitSlop={8}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            className={cn(
              "p-1 rounded-full transition-colors duration-150",
              hovered ? "bg-neutral-200 dark:bg-neutral-700" : "bg-transparent",
              isMine ? "order-first mr-1" : "ml-1",
              "active:bg-neutral-300 dark:active:bg-neutral-600"
            )}
          >
            <Icon name="MoreVertical" size={16} color="text-tertiary" />
          </Pressable>
        )}

        <Pressable
          ref={bubbleRef}
          collapsable={false}
          onLongPress={isWeb ? undefined : openMenu}
          delayLongPress={300}
          disabled={!canModify}
          accessibilityRole="text"
          className={cn(
            "max-w-[80%] px-4 py-3 rounded-lg",
            isMine
              ? "bg-primary rounded-br-sm"
              : "bg-neutral-100 dark:bg-neutral-800 rounded-bl-sm",
            className
          )}
        >
          <Text
            variant="body"
            className={isMine ? "text-white" : "text-text-primary"}
          >
            {text}
          </Text>
          {isEdited ? (
            <Text
              variant="caption"
              className={cn("mt-1 self-end", isMine ? "text-white/70" : "text-neutral-400")}
            >
              Modifié
            </Text>
          ) : null}
        </Pressable>
      </View>

      {anchorMetrics && (
        <MessageMenu
          visible={menuVisible}
          anchorX={anchorMetrics.x}
          anchorY={anchorMetrics.y}
          anchorWidth={anchorMetrics.width}
          anchorHeight={anchorMetrics.height}
          hugSide={isMine ? "left" : "right"}
          onClose={() => setMenuVisible(false)}
          onCopy={() => {
            setMenuVisible(false);
            onCopy?.();
          }}
          onEdit={() => {
            setMenuVisible(false);
            onEdit?.();
          }}
          onDelete={() => {
            setMenuVisible(false);
            onDelete?.();
          }}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
