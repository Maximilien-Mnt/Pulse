import { useMyUpcomingEvents } from "@/hooks/useMyUpcomingEvents";
import { useAuthStore } from "@/stores/authStore";
import { EventCard } from "@/components/events/EventCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text, View } from "react-native";

/**
 * List of EventCard (compact) for upcoming events the user is registered to.
 */
export function ProfileEventsSection() {
  const userId = useAuthStore((s) => s.userId);
  const { data, isLoading, isError } = useMyUpcomingEvents(userId);

  if (isLoading) {
    return (
      <View className="mt-4">
        <Text className="text-lg font-semibold mb-2">Événements à venir</Text>
        <Skeleton height={80} className="w-full mb-2" />
        <Skeleton height={80} className="w-full" />
      </View>
    );
  }

  if (isError || !data?.length) return null;

  return (
    <View className="mt-4">
      <Text className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-50">
        Événements à venir ({data.length})
      </Text>
      {data.map((item) => (
        <EventCard key={item.event.id} event={item.event} compact />
      ))}
    </View>
  );
}