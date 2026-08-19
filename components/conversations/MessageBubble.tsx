// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS — Message Bubble
//
// "moi" = primary bg, white text, right-aligned
// "autre" = bg-alt, text-primary, left-aligned, radius lg
// ---------------------------------------------------------------------------

import React from "react";
import { View } from "react-native";
import { cn } from "@/utils/format";
import { Text } from "@/components/ui/Text";
import type { MessageType } from "@/types";

interface MessageBubbleProps {
  text: string;
  isMine: boolean;
  type?: MessageType;
  className?: string;
}

export function MessageBubble({ text, isMine, type, className }: MessageBubbleProps) {
  // System messages: small, grey, centered, no sender
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
    <View
      className={cn(
        "max-w-[80%] px-4 py-3 rounded-lg my-1",
        isMine
          ? "bg-primary self-end rounded-br-sm"
          : "bg-neutral-100 dark:bg-neutral-800 self-start rounded-bl-sm",
        className
      )}
    >
      <Text
        variant="body"
        className={isMine ? "text-white" : "text-text-primary"}
      >
        {text}
      </Text>
    </View>
  );
}
