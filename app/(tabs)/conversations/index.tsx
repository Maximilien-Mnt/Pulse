import { ConversationItem } from "@/components/conversations/ConversationItem";
import { Header } from "@/components/shared/Header";
import { SearchBar } from "@/components/shared/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useConversations } from "@/hooks/useConversations";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import { useMemo, useState, useCallback } from "react";
import { FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ConversationsScreen() {
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const { data, isLoading, isError, error, refetch, isRefetching } = useConversations(userId);
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const rows = data ?? [];
    if (!q.trim()) return rows;
    const t = q.toLowerCase();
    return rows.filter((x) => x.other.full_name.toLowerCase().includes(t) || x.other.username.toLowerCase().includes(t));
  }, [data, q]);
  const onRefresh = useCallback(() => void refetch(), [refetch]);

  if (isError) {
    return (
      <SafeAreaView className="flex-1">
        <ErrorState message={error?.message ?? "Erreur"} onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Header title="Messages" showAvatar avatarUrl={profile?.avatar_url} />
      <SearchBar value={q} onChangeText={setQ} className="mx-4 mb-2" />
      <FlatList
        data={list}
        keyExtractor={(i) => i.conversation.id}
        renderItem={({ item }) => <ConversationItem item={item} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        ListEmptyComponent={
          isLoading ? null : <EmptyState icon="chatbubbles-outline" title="Aucune conversation" subtitle="Crée-en une depuis Créer." />
        }
      />
    </SafeAreaView>
  );
}
