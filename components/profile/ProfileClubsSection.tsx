import { useMyClubMemberships } from "@/hooks/useMyClubMemberships";
import { useAuthStore } from "@/stores/authStore";
import { ClubCard } from "@/components/clubs/ClubCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text, View } from "react-native";

/**
 * List of ClubCard (compact) for clubs the user is a member of.
 */
export function ProfileClubsSection() {
  const userId = useAuthStore((s) => s.userId);
  const { data, isLoading, isError } = useMyClubMemberships(userId);

  if (isLoading) {
    return (
      <View className="mt-4">
        <Text className="text-lg font-semibold mb-2">Clubs</Text>
        <Skeleton height={80} className="w-full mb-2" />
        <Skeleton height={80} className="w-full" />
      </View>
    );
  }

  if (isError || !data?.length) return null;

  return (
    <View className="mt-4">
      <Text className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-50">
        Clubs ({data.length})
      </Text>
      {data.map((item) => (
        <ClubCard key={item.club.id} club={item.club} compact />
      ))}
    </View>
  );
}