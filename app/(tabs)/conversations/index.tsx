// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS SCREEN
//
// Search pill, FlatList of ConversationItems, tap opens detail.
// ---------------------------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, TextInput, View, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { useConversations } from "@/hooks/useConversations";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/utils/format";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tag } from "@/components/ui/Tag";
import { ConversationItem } from "@/components/conversations/ConversationItem";
import { ConversationActionSheet } from "@/components/conversations/ConversationActionSheet";

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ConvSkeleton() {
  return (
    <View className="px-4 pt-4 gap-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} className="flex-row items-center gap-3 py-4 border-b border-border">
          <Skeleton className="w-12 h-12 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="w-40 h-4 rounded-sm" />
            <Skeleton className="w-56 h-3 rounded-sm" />
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function ConvEmpty() {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Icon name="MessageCircle" size={32} color="text-tertiary" />
      <Text variant="subtitle" className="text-text-primary mt-4 mb-2 text-center">
        Aucune conversation
      </Text>
      <Text variant="body" className="text-text-secondary text-center">
        Utilise le bouton + pour démarrer une nouvelle discussion.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ConversationsScreen() {
  const userId = useAuthStore((s) => s.userId);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [menuItem, setMenuItem] = useState<any>(null);
  const [convFilter, setConvFilter] = useState<"all" | "unread" | "pinned" | "public">("all");

  const { data, isLoading, isError, refetch } = useConversations(userId);

  // Refetch on focus
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (convFilter === "unread") {
      result = result.filter((c: any) => c.unread > 0);
    } else if (convFilter === "pinned") {
      result = result.filter((c: any) => c.pinned);
    } else if (convFilter === "public") {
      result = result.filter((c: any) => c.isPublicList);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c: any) =>
          c.other?.full_name?.toLowerCase().includes(q) ||
          c.conversation?.last_message_preview?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, search, convFilter]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <ConversationItem
        conversation={{
          id: item.conversation.id,
          name: item.other?.full_name ?? "",
          avatar_url: item.other?.avatar_url ?? null,
          last_message: item.conversation.last_message_preview,
          last_message_at: item.conversation.last_message_at,
          unread: item.unread > 0,
          pinned: item.pinned,
        }}
        onPress={() =>
          router.push(`/(tabs)/conversations/${item.conversation.id}` as any)
        }
        onLongPress={() => setMenuItem(item)}
      />
    ),
    [router]
  );

  const keyExtractor = useCallback((item: any) => String(item.conversation.id), []);

  if (isLoading) {
    return (
      <SafeScreen edges={["top"]}>
        <ConvHeader search={search} setSearch={setSearch} />
        <ConvSkeleton />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={["top"]}>
      <ConvHeader search={search} setSearch={setSearch} />

      <ConvFilterRow activeFilter={convFilter} onFilterChange={setConvFilter} />

      {filtered.length === 0 ? (
        <ConvEmpty />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
          }
        />
      )}

      <ConversationActionSheet
        visible={!!menuItem}
        conversationId={menuItem?.conversation?.id ?? ""}
        name={menuItem?.other?.full_name ?? ""}
        pinned={menuItem?.pinned ?? false}
        onClose={() => setMenuItem(null)}
        targetAuthorId={menuItem?.other?.id}
      />
    </SafeScreen>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function ConvHeader({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (s: string) => void;
}) {
  return (
    <View className="px-4 pt-3 bg-bg dark:bg-bg-dark">
      <View className="flex-row items-center bg-neutral-50 dark:bg-neutral-800 rounded-full px-4 h-11 gap-2">
        <Icon name="Search" size={16} color="text-tertiary" />
        <TextInput
          className="flex-1 text-base text-text-primary font-inter"
          placeholder="Rechercher une conversation"
          placeholderTextColor="#888D97"
          value={search}
          onChangeText={setSearch}
        />
      </View>
    </View>
  );
}

function ConvFilterRow({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: "all" | "unread" | "pinned" | "public";
  onFilterChange: (f: "all" | "unread" | "pinned" | "public") => void;
}) {
  const filters: { key: typeof activeFilter; label: string }[] = [
    { key: "all", label: "Toutes" },
    { key: "unread", label: "Non lues" },
    { key: "pinned", label: "Épinglées" },
    { key: "public", label: "Publiques" },
  ];

  return (
    <View className="bg-bg dark:bg-bg-dark py-2">
      <FlatList
        horizontal
        data={filters}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => onFilterChange(item.key)}>
            <Tag variant="chip" active={activeFilter === item.key}>
              {item.label}
            </Tag>
          </Pressable>
        )}
      />
    </View>
  );
}
