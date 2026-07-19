import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SPORTS } from "@/lib/constants";
import type { Club, EventRow, Post } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Dimensions, FlatList, Pressable, Text, View } from "react-native";

type Tab = "posts" | "clubs" | "events";

type Props = {
  posts: Post[];
  clubs: Club[];
  events: EventRow[];
  loading?: boolean;
};

const COLS = 3;
const GAP = 4;
const SIZE = (Dimensions.get("window").width - 32 - GAP * (COLS - 1)) / COLS;

export function PublicProfileGallery({ posts, clubs, events, loading }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("posts");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "posts", label: "Posts", count: posts.length },
    { key: "clubs", label: "Clubs", count: clubs.length },
    { key: "events", label: "Événements", count: events.length },
  ];

  if (loading) {
    return (
      <View className="py-8">
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View className="mt-4">
      <View className="flex-row border-b border-neutral-200 dark:border-neutral-700 mb-4">
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            className={`flex-1 py-3 items-center border-b-2 ${
              tab === t.key ? "border-primary" : "border-transparent"
            }`}
          >
            <Text className={`font-semibold ${tab === t.key ? "text-primary" : "text-neutral-500"}`}>
              {t.label} ({t.count})
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "posts" && (
        posts.length === 0 ? (
          <EmptyState icon="images-outline" title="Aucun post" />
        ) : (
          <FlatList
            data={posts}
            numColumns={COLS}
            scrollEnabled={false}
            keyExtractor={(p) => p.id}
            columnWrapperStyle={{ gap: GAP }}
            contentContainerStyle={{ gap: GAP }}
            renderItem={({ item }) => {
              const thumb = item.media_urls?.[0];
              return (
                <Pressable
                  onPress={() => router.push(`/(tabs)/feed/${item.id}/comments`)}
                  style={{ width: SIZE, height: SIZE }}
                  className="rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700"
                >
                  {thumb ? (
                    <Image
                      source={{ uri: thumb }}
                      style={{ width: SIZE, height: SIZE }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center p-2">
                      <Text className="text-xs text-neutral-600 dark:text-neutral-300" numberOfLines={3}>
                        {item.title}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )
      )}

      {tab === "clubs" && (
        clubs.length === 0 ? (
          <EmptyState icon="people-outline" title="Aucun club" />
        ) : (
          clubs.map((c) => (
            <Card key={c.id} onPress={() => router.push(`/(tabs)/clubs/${c.id}`)} className="p-4 mb-3">
              <View className="flex-row items-center gap-3">
                {c.logo_url ? (
                  <Image source={{ uri: c.logo_url }} style={{ width: 48, height: 48, borderRadius: 12 }} />
                ) : (
                  <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
                    <Ionicons name="people" size={24} color="#1E6BFF" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="font-semibold text-neutral-900 dark:text-neutral-50">{c.name}</Text>
                  <Text className="text-sm text-neutral-500">
                    {SPORTS.find((s) => s.id === c.sport)?.label ?? c.sport} · {c.city}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )
      )}

      {tab === "events" && (
        events.length === 0 ? (
          <EmptyState icon="calendar-outline" title="Aucun événement" />
        ) : (
          events.map((e) => (
            <Card key={e.id} onPress={() => router.push(`/(tabs)/events/${e.id}`)} className="p-4 mb-3">
              <Text className="font-semibold text-neutral-900 dark:text-neutral-50">{e.name}</Text>
              <Text className="text-sm text-neutral-500 mt-1">
                {SPORTS.find((s) => s.id === e.sport)?.label ?? e.sport} · {e.city}
              </Text>
            </Card>
          ))
        )
      )}
    </View>
  );
}