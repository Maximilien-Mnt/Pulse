import { ClubCard } from "@/components/clubs/ClubCard";
import { Header } from "@/components/shared/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMyClubMemberships } from "@/hooks/useMyClubMemberships";
import { useMyCreatedClubs } from "@/hooks/useMyCreatedClubs";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import { Pressable, FlatList, View, Text } from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";

type ClubsTab = "member" | "created";

export default function ProfileClubsScreen() {
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const isPublic = profile?.is_public_profile ?? false;
  
  const [activeTab, setActiveTab] = useState<ClubsTab>("member");
  
  const { data: memberships, isLoading: loadingMembers, isError: errorMembers } = useMyClubMemberships(userId);
  const { data: createdClubs, isLoading: loadingCreated, isError: errorCreated } = useMyCreatedClubs(userId);

  const memberClubs = memberships?.map((m) => m.club) ?? [];
  const clubs = activeTab === "member" ? memberClubs : (createdClubs ?? []);
  const isLoading = activeTab === "member" ? loadingMembers : loadingCreated;
  const isError = activeTab === "member" ? errorMembers : errorCreated;

  if (isLoading) {
    return (
      <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
        <Header title="Mes clubs" showBackButton showAvatar avatarUrl={profile?.avatar_url} />
      <View className="px-4 gap-3 mt-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </View>
      </SafeScreen>
    );
  }

  if (isError) {
    return (
      <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
        <Header title="Mes clubs" showBackButton showAvatar avatarUrl={profile?.avatar_url} />
        <ErrorState message="Erreur de chargement" onRetry={() => {}} />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Header title="Mes clubs" showBackButton showAvatar avatarUrl={profile?.avatar_url} />
      
      {/* Tab Selector */}
      <View className="flex-row mx-4 mb-2 bg-neutral-200 dark:bg-neutral-800 rounded-xl p-1">
        <Pressable
          onPress={() => setActiveTab("member")}
          className={`flex-1 py-2 rounded-lg items-center ${
            activeTab === "member" ? "bg-white dark:bg-neutral-900" : ""
          }`}
        >
          <Text
            className={`font-semibold ${
              activeTab === "member" ? "text-primary" : "text-neutral-500"
            }`}
          >
            Mes clubs ({memberClubs.length})
          </Text>
        </Pressable>
        {isPublic && (
          <Pressable
            onPress={() => setActiveTab("created")}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === "created" ? "bg-white dark:bg-neutral-900" : ""
            }`}
          >
            <Text
              className={`font-semibold ${
                activeTab === "created" ? "text-primary" : "text-neutral-500"
              }`}
            >
              Clubs créés ({createdClubs?.length ?? 0})
            </Text>
          </Pressable>
        )}
      </View>

      {clubs.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            icon="people-outline"
            title={
              activeTab === "member"
                ? "Aucun club"
                : "Aucun club créé"
            }
            subtitle={
              activeTab === "member"
                ? "Rejoins des clubs depuis l'onglet Découvrir."
                : "Crée ton premier club pour le voir ici."
            }
          />
        </View>
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="px-4 py-2">
              <ClubCard club={item} compact />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeScreen>
  );
}