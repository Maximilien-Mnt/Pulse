import { EventCard } from "@/components/events/EventCard";
import { Header } from "@/components/shared/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useProfileEvents } from "@/hooks/useProfileEvents";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import { Pressable, FlatList, View, Text } from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { t } from "@/hooks/useTranslation";

type EventTab = "upcoming" | "ongoing" | "past";

export default function ProfileEventsScreen() {
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const [activeTab, setActiveTab] = useState<EventTab>("upcoming");
  
  const { upcoming, ongoing, past, isLoading, isError } = useProfileEvents(userId);

  const events = activeTab === "upcoming" ? upcoming : activeTab === "ongoing" ? ongoing : past;

  if (isLoading) {
    return (
      <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
        <Header title={t("profile.myEvents")} showAvatar avatarUrl={profile?.avatar_url} />
        <View className="px-4 gap-3">
          <Skeleton height={80} />
          <Skeleton height={80} />
        </View>
      </SafeScreen>
    );
  }

  if (isError) {
    return (
      <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
        <Header title={t("profile.myEvents")} showAvatar avatarUrl={profile?.avatar_url} />
        <ErrorState message="Erreur de chargement" onRetry={() => {}} />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Header title={t("profile.myEvents")} showAvatar avatarUrl={profile?.avatar_url} />
      
      {/* Tab Selector */}
      <View className="flex-row mx-4 mb-2 bg-neutral-200 dark:bg-neutral-800 rounded-xl p-1">
        {(["upcoming", "ongoing", "past"] as EventTab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === tab ? "bg-white dark:bg-neutral-900" : ""
            }`}
          >
            <Text
              className={`font-semibold ${
                activeTab === tab ? "text-primary" : "text-neutral-500"
              }`}
            >
              {tab === "upcoming" ? t("events.upcoming") : tab === "ongoing" ? "En cours" : t("events.past")}
            </Text>
          </Pressable>
        ))}
      </View>

      {events.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            icon="Calendar"
            title={
              activeTab === "upcoming"
                ? t("events.emptyUpcoming")
                : activeTab === "ongoing"
                ? t("events.emptyOngoing")
                : t("events.emptyPast")
            }
            subtitle={t("events.joinHint")}
          />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.event.id}
          renderItem={({ item }) => (
            <View className="px-4 py-2">
              <EventCard event={item.event} compact />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeScreen>
  );
}