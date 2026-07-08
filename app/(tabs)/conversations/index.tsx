import { ConversationItem } from "@/components/conversations/ConversationItem";
import { Header } from "@/components/shared/Header";
import { SearchBar } from "@/components/shared/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useConversations } from "@/hooks/useConversations";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import { useMemo, useState, useCallback } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ListMode = "private" | "public";

export default function ConversationsScreen() {
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const hasPublicProfile = profile?.is_public_profile ?? false;
  const [listMode, setListMode] = useState<ListMode>("private");
  const publicListFilter = listMode === "public";
  const { data, isLoading, isError, error, refetch, isRefetching } = useConversations(
    userId,
    hasPublicProfile ? publicListFilter : undefined
  );
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
      {hasPublicProfile ? (
        <View className="flex-row mx-4 mb-2 bg-neutral-200 dark:bg-neutral-800 rounded-xl p-1">
          {(["private", "public"] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setListMode(mode)}
              className={`flex-1 py-2 rounded-lg items-center ${
                listMode === mode ? "bg-white dark:bg-neutral-900" : ""
              }`}
            >
              <Text
                className={`font-semibold ${
                  listMode === mode ? "text-primary" : "text-neutral-500"
                }`}
              >
                {mode === "private" ? "Privées" : "Publiques"}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <SearchBar value={q} onChangeText={setQ} className="mx-4 mb-2" />
      <FlatList
        data={list}
        keyExtractor={(i) => i.conversation.id}
        renderItem={({ item }) => <ConversationItem item={item} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="chatbubbles-outline"
              title={listMode === "public" ? "Aucune conversation publique" : "Aucune conversation"}
              subtitle={listMode === "public" ? "Les contacts via ton profil public apparaîtront ici." : "Crée-en une depuis Créer."}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
