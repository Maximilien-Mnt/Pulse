import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { BackButton } from "@/components/ui/BackButton";
import { useRouter } from "expo-router";
import { useNotifications, useMarkAsRead, useJoinRequestAction } from "@/hooks/useNotifications";
import { useStartConversationWith } from "@/hooks/useStartConversationWith";
import Toast from "react-native-toast-message";
import { useTranslation , t } from "@/hooks/useTranslation";
import { TranslationKey } from "@/lib/translations";

const FILTERS = [
  { key: "all" as const, label: t("notifications.filter.all") },
  { key: "pending" as const, label: t("notifications.filter.pending") },
  { key: "processed" as const, label: t("notifications.filter.processed") },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t("time.justNow");
  if (minutes < 60) return t("time.minutesAgo", { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("time.hoursAgo", { hours });
  const days = Math.floor(hours / 24);
  return t("time.daysAgo", { days });
}

function formatNotificationTitle(n: any, t: (key: TranslationKey, variables?: Record<string, string | number>) => string): string {
  if (n.title) return n.title;
  switch (n.type) {
    case "club_join_request":
      return t("notifications.type.clubJoinRequest");
    case "event_join_request":
      return t("notifications.type.eventJoinRequest");
    case "club_join_request_response_accept":
      return t("notifications.type.clubJoinRequestResponseAccept");
    case "event_join_request_response_accept":
      return t("notifications.type.eventJoinRequestResponseAccept");
    case "club_join_request_response_refuse":
      return t("notifications.type.clubJoinRequestResponseRefuse");
    case "event_join_request_response_refuse":
      return t("notifications.type.eventJoinRequestResponseRefuse");
    case "conversation_deleted":
      return t("notifications.type.conversationDeleted");
    default:
      return t("notifications.type.default");
  }
}

export default function ProfileNotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "pending" | "processed">("all");
  const [refreshing, setRefreshing] = useState(false);
  const { data: notifications = [], isLoading, refetch } = useNotifications({ status: filter, limit: 50 });
  const markAsRead = useMarkAsRead();
  const joinAction = useJoinRequestAction();
  const { startConversation, isPending: isContacting } = useStartConversationWith();

  const isJoinRequest = (n: any) => n.type === "club_join_request" || n.type === "event_join_request";
  
  const isRefused = (n: any) => 
    n.type === "club_join_request_response_refuse" || 
    n.type === "event_join_request_response_refuse";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePress = async (item: any) => {
    try {
      await markAsRead.mutateAsync(item.id);
    } catch (e) {
      // ignore
    }
    const data = item.data as any;
    if (isJoinRequest(item) && data) {
      const route =
        item.type === "club_join_request"
          ? `/clubs/${data.club_id}`
          : `/events/${data.event_id}`;
      router.push(route as any);
    }
  };

  const handleAction = async (
    action: "accept" | "refuse",
    item: any
  ) => {
    const data = item.data as any;
    if (!data?.request_id) return;
    try {
      await joinAction.mutateAsync({
        action,
        requestId: data.request_id,
        type: item.type === "club_join_request" ? "club" : "event",
        targetId: data.club_id ?? data.event_id,
        requesterId: data.requester_id,
      });
      Toast.show({
        type: "success",
        text1: action === "accept" ? t("notifications.toast.accepted") : t("notifications.toast.refused"),
      });
    } catch (e) {
      Toast.show({
        type: "error",
        text1: t("notifications.toast.error"),
      });
    }
  };

  const handleContact = async (item: any) => {
    const data = item.data as any;
    const ownerId = data?.owner_id;
    if (!ownerId) {
      Toast.show({
        type: "error",
        text1: t("common.cannotContact"),
      });
      return;
    }
    try {
      await startConversation(ownerId);
    } catch (e) {
      Toast.show({
        type: "error",
        text1: t("conv.cannotStart"),
      });
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const join = isJoinRequest(item);
    const refused = isRefused(item);
    const unread = item.read_at === null;
    return (
      <Pressable
        onPress={() => handlePress(item)}
        className={`mx-4 mb-2 p-4 rounded-2xl border ${
          unread
            ? "bg-primary/5 border-primary/20"
            : "bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700"
        }`}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-1">
              <View
                className={`w-2 h-2 rounded-full mt-1 ${
                  unread ? "bg-primary" : "bg-transparent"
                }`}
              />
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {formatNotificationTitle(item, t)}
              </Text>
            </View>
            <Text className="text-sm text-neutral-600 dark:text-neutral-300 ml-4">
              {item.body ?? item.data?.requester_name ?? "—"}
            </Text>
            <Text className="text-xs text-neutral-400 mt-1 ml-4">
              {timeAgo(item.created_at)}
            </Text>
          </View>
        </View>
        {join && (
          <View className="flex-row gap-2 mt-3 ml-4">
            <Pressable
              onPress={() => handleAction("accept", item)}
              className="px-5 py-3 rounded-xl bg-primary active:opacity-80"
            >
              <Text className="text-sm font-semibold text-white">{t("common.accept")}</Text>
            </Pressable>
            <Pressable
              onPress={() => handleAction("refuse", item)}
              className="px-5 py-3 rounded-xl bg-neutral-200 dark:bg-neutral-700 active:opacity-80"
            >
              <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                {t("common.refuse")}
              </Text>
            </Pressable>
          </View>
        )}

        {refused && (
          <View className="flex-row gap-2 mt-3 ml-4">
            <Pressable
              onPress={() => handleContact(item)}
              className="px-5 py-3 rounded-xl bg-primary active:opacity-80"
              disabled={isContacting}
            >
              {isContacting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-sm font-semibold text-white">{t("common.contact")}</Text>
              )}
            </Pressable>
          </View>
        )}

      </Pressable>
    );
  };

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton />
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          Notifications
        </Text>
        <View className="w-11" />
      </View>
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row gap-2">
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`px-5 py-3 rounded-full active:opacity-80 ${
                filter === f.key ? "bg-primary" : "bg-white dark:bg-neutral-800"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  filter === f.key
                    ? "text-white"
                    : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1E6BFF" />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-neutral-400 text-center">
            {filter === "pending"
              ? t("notifications.empty.pending")
              : filter === "processed"
              ? t("notifications.empty.processed")
              : t("notifications.empty.all")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerClassName="py-2"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeScreen>
  );
}
