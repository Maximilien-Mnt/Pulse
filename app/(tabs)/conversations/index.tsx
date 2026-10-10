// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS SCREEN
//
// Search pill, FlatList of ConversationItems, tap opens detail.
// ---------------------------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import { FlatList, View, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { SearchBar } from "@/components/shared/SearchBar";
import { useConversations } from "@/hooks/useConversations";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation , t } from "@/hooks/useTranslation";
import { cn } from "@/utils/format";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tag } from "@/components/ui/Tag";
import { PressableScale, CHIP_SCALE_HOVER, CHIP_SCALE_PRESS } from "@/components/ui/PressableScale";
import { ConversationItem } from "@/components/conversations/ConversationItem";
import { ConversationActionSheet } from "@/components/conversations/ConversationActionSheet";

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ConvSkeleton() {
  return (
    <View
      className="px-4 pt-4"
      testID="conversations-skeleton"
      accessibilityLabel={t("common.loading")}
      importantForAccessibility="no-hide-descendants"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} className="flex-row items-center gap-3 py-4 border-b border-border">
          <Skeleton.Circle className="w-12 h-12" />
          <View className="flex-1 gap-2">
            <Skeleton.Line className="w-40" height={14} />
            <Skeleton.Line className="w-56" height={10} />
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
        {t("conversations.empty")}
      </Text>
      <Text variant="body" className="text-text-secondary text-center">
        {t("conversations.emptyHint")}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ConversationsScreen() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [menuItem, setMenuItem] = useState<any>(null);
  // On-screen rect of the "⋮" / long-pressed row, used to anchor the floating
  // options menu next to the button that opened it.
  const [menuAnchor, setMenuAnchor] = useState<any>(null);
  const [convFilter, setConvFilter] = useState<"all" | "unread" | "pinned" | "public">("all");

  const openMenu = useCallback((item: any, anchor: any) => {
    setMenuAnchor(anchor ?? null);
    setMenuItem(item);
  }, []);

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
    ({ item }: { item: any }) => {
      const isGroup = item.conversation.is_group;
      const convName = isGroup
        ? item.conversation.group_name ?? "Groupe"
        : item.other?.full_name ?? "";
      const convAvatar = isGroup
        ? item.conversation.group_photo_url ?? null
        : item.other?.avatar_url ?? null;

      return (
      <ConversationItem
        conversation={{
          id: item.conversation.id,
          name: convName,
          avatar_url: convAvatar,
          last_message: item.conversation.last_message_preview,
          last_message_at: item.conversation.last_message_at,
          unread: item.unread > 0,
          pinned: item.pinned,
        }}
        onPress={() => {
          router.push({
            pathname: "/(tabs)/conversations/[conversationId]" as any,
            params: {
              conversationId: item.conversation.id,
              otherName: convName,
              otherAvatarUrl: convAvatar ?? "",
              otherId: isGroup ? "" : item.other?.id ?? "",
            },
          });
        }}
        onLongPress={(anchor) => openMenu(item, anchor)}
        onOptionsPress={(anchor) => openMenu(item, anchor)}
        onAvatarPress={
          isGroup ? undefined : item.other?.id
            ? () => router.push(`/profile/${item.other.id}`)
            : undefined
        }
      />
    );
    },
    [openMenu, router]
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

      <ConvFilterRow activeFilter={convFilter} onFilterChange={setConvFilter} t={t as (key: string, variables?: Record<string, string | number>) => string} />

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
        anchor={menuAnchor}
        conversationId={menuItem?.conversation?.id ?? ""}
        name={
          menuItem?.conversation?.is_group
            ? menuItem?.conversation?.group_name ?? "Groupe"
            : menuItem?.other?.full_name ?? ""
        }
        isGroup={!!menuItem?.conversation?.is_group}
        groupName={menuItem?.conversation?.group_name ?? ""}
        // Live query value, not the open-time snapshot: when the (un)pin
        // refetch lands, the open menu's row flips to the opposite action.
        pinned={
          menuItem
            ? (data?.find(
                (c: any) => c.conversation?.id === menuItem.conversation?.id
              )?.pinned ?? menuItem.pinned ?? false)
            : false
        }
        onClose={() => {
          setMenuItem(null);
          setMenuAnchor(null);
        }}
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
      <SearchBar
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch("")}
        expanded
        autoFocus={false}
        placeholder={t("conv.search")}
      />
    </View>
  );
}

function ConvFilterRow({
  activeFilter,
  onFilterChange,
  t,
}: {
  activeFilter: "all" | "unread" | "pinned" | "public";
  onFilterChange: (f: "all" | "unread" | "pinned" | "public") => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}) {
  const filters: { key: typeof activeFilter; label: string }[] = [
    { key: "all", label: t("conv.all") },
    { key: "unread", label: t("conv.unread") },
    { key: "pinned", label: t("conv.pinned") },
    { key: "public", label: t("conv.public") },
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
          <PressableScale
            onPress={() => onFilterChange(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === item.key }}
            scaleOnHover={CHIP_SCALE_HOVER}
            scaleOnPress={CHIP_SCALE_PRESS}
          >
            <Tag variant="chip" active={activeFilter === item.key}>
              {item.label}
            </Tag>
          </PressableScale>
        )}
      />
    </View>
  );
}





