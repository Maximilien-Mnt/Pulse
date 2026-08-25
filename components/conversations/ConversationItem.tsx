// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS — Conversation Item
//
// Avatar 48px, name (Subtitle, bold if unread), last message preview
// truncated, timestamp Caption, unread dot primary 8px.
// ---------------------------------------------------------------------------

import React from "react";
import { Pressable, View } from "react-native";
import { formatRelative } from "@/utils/date";

import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

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
  onLongPress?: () => void;
  onAvatarPress?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConversationItem({
  conversation,
  onPress,
  onLongPress,
  onAvatarPress,
}: ConversationItemProps) {
  const unread = conversation.unread ?? false;
  const pinned = conversation.pinned ?? false;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="flex-row items-center gap-3 px-4 py-3 active:bg-primary-tint"
    >
      <Pressable
        onPress={onAvatarPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Avatar size={48} uri={conversation.avatar_url} />
      </Pressable>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            variant="subtitle"
            className={unread ? "text-text-primary font-['Inter_700Bold']" : "text-text-primary"}
            numberOfLines={1}
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
          className={unread ? "text-text-primary font_['Inter_600SemiBold']" : "text-text-secondary"}
          numberOfLines={1}
        >
          {conversation.last_message ?? "Nouvelle conversation"}
        </Text>
      </View>

      {conversation.last_message_at ? (
        <Text variant="caption" className="text-text-tertiary">
          {formatRelative(conversation.last_message_at)}
        </Text>
      ) : null}
    </Pressable>
  );
}