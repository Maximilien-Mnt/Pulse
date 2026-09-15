// ---------------------------------------------------------------------------
// PULSE PROFILE — Notifications screen
//
// Lists the user's notifications with filters (all / pending / processed),
// inline accept/refuse actions for join requests, and a "contact" shortcut for
// refused requests.
//
// Localization rules applied here:
//   - Every user-facing and accessibility string comes from lib/translations
//     (FR + EN), including plural-aware counts (`tp`).
//   - Labels are derived from the server `type` so the *viewer* reads them in
//     their own language; unknown server values fall back safely to the stored
//     title, then to a generic label (see lib/notifications/labels.ts).
//   - Stored `body` / requester names are user-authored content: rendered
//     verbatim, never translated.
//   - Relative and absolute timestamps use locale-aware Intl formatters with
//     the user's language and device timezone.
// ---------------------------------------------------------------------------

import { useState, useCallback, useMemo } from "react";
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
import {
  useNotifications,
  useMarkAsRead,
  useJoinRequestAction,
  useUnreadNotificationsCount,
  type Notification,
} from "@/hooks/useNotifications";
import { useStartConversationWith } from "@/hooks/useStartConversationWith";
import { RefuseJoinRequestSheet } from "@/components/shared/RefuseJoinRequestSheet";
import Toast from "react-native-toast-message";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/lib/translations";
import {
  getNotificationStoredText,
  resolveNotificationTitle,
} from "@/lib/notifications/labels";
import { getDeviceTimeZone } from "@/lib/locale";
import { formatDateTimeLocalized, formatRelativeLocalized } from "@/utils/date";

type FilterKey = "all" | "pending" | "processed";

const FILTERS: { key: FilterKey; labelKey: TranslationKey }[] = [
  { key: "all", labelKey: "notifications.filter.all" },
  { key: "pending", labelKey: "notifications.filter.pending" },
  { key: "processed", labelKey: "notifications.filter.processed" },
];

const EMPTY_LABEL_KEYS: Record<FilterKey, TranslationKey> = {
  all: "notifications.empty.all",
  pending: "notifications.empty.pending",
  processed: "notifications.empty.processed",
};

/** Shape of `notifications.data` written by hooks and database triggers. */
type NotificationData = {
  request_id?: string;
  requester_id?: string;
  requester_name?: string;
  club_id?: string;
  event_id?: string;
  club_name?: string;
  event_name?: string;
  owner_id?: string;
  type?: string;
  message?: string;
};

function getNotificationData(item: Notification): NotificationData {
  const data = item.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return data as NotificationData;
}

function isJoinRequest(item: Notification) {
  return item.type === "club_join_request" || item.type === "event_join_request";
}

function isRefused(item: Notification) {
  return (
    item.type === "club_join_request_response_refuse" ||
    item.type === "event_join_request_response_refuse"
  );
}

export default function ProfileNotificationsScreen() {
  const router = useRouter();
  const { t, tp, language } = useTranslation();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);
  const { data: notifications = [], isLoading, refetch } = useNotifications({
    status: filter,
    limit: 50,
  });
  const { data: unreadNotifications } = useUnreadNotificationsCount();
  const markAsRead = useMarkAsRead();
  const joinAction = useJoinRequestAction();
  const { startConversation, isPending: isContacting } = useStartConversationWith();

  const unreadCount = unreadNotifications ?? 0;
  const timeZone = useMemo(() => getDeviceTimeZone(), []);

  const [refuseItem, setRefuseItem] = useState<Notification | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePress = async (item: Notification) => {
    try {
      await markAsRead.mutateAsync(item.id);
    } catch (e) {
      // ignore
    }
    const data = getNotificationData(item);
    if (isJoinRequest(item)) {
      const route =
        item.type === "club_join_request"
          ? `/clubs/${data.club_id}`
          : `/events/${data.event_id}`;
      router.push(route as any);
    }
  };

  const handleAction = async (
    action: "accept" | "refuse",
    item: Notification,
    reason?: string
  ) => {
    const data = getNotificationData(item);
    if (!data.request_id) return;
    try {
      await joinAction.mutateAsync({
        action,
        requestId: data.request_id,
        type: item.type === "club_join_request" ? "club" : "event",
        targetId: data.club_id ?? data.event_id ?? "",
        requesterId: data.requester_id ?? "",
        message: action === "refuse" ? reason : undefined,
      });
      setRefuseItem(null);
      Toast.show({
        type: "success",
        text1:
          action === "accept"
            ? t("notifications.toast.accepted")
            : t("notifications.toast.refused"),
      });
    } catch (e) {
      Toast.show({
        type: "error",
        text1: t("notifications.toast.error"),
      });
    }
  };

  const handleContact = async (item: Notification) => {
    const ownerId = getNotificationData(item).owner_id;
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
  const renderItem = ({ item }: { item: Notification }) => {
    const join = isJoinRequest(item);
    const refused = isRefused(item);
    const unread = item.read_at === null;
    const data = getNotificationData(item);

    const title = resolveNotificationTitle(item, t);
    // Stored text is user-authored content (message, requester name) — kept
    // verbatim in every language.
    const body =
      getNotificationStoredText(item.body) ||
      getNotificationStoredText(data.requester_name);
    const timeLabel = formatRelativeLocalized(item.created_at, {
      language,
      timeZone,
    });
    const absoluteTimeLabel = formatDateTimeLocalized(item.created_at, {
      language,
      timeZone,
    });
    const readState = unread
      ? t("notifications.a11y.unread")
      : t("notifications.a11y.read");
    const accessibilityLabel = [title, body, timeLabel, readState]
      .filter((part) => part.length > 0)
      .join(". ");

    return (
      <Pressable
        onPress={() => handlePress(item)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={absoluteTimeLabel}
        accessibilityState={{ selected: unread }}
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
                {title}
              </Text>
            </View>
            {body ? (
              <Text className="text-sm text-neutral-600 dark:text-neutral-300 ml-4">
                {body}
              </Text>
            ) : null}
            <Text className="text-xs text-neutral-400 mt-1 ml-4">{timeLabel}</Text>
          </View>
        </View>
        {join && (
          <View className="flex-row gap-2 mt-3 ml-4">
            <Pressable
              onPress={() => handleAction("accept", item)}
              accessibilityRole="button"
              className="px-5 py-3 rounded-xl bg-primary active:opacity-80"
            >
              <Text className="text-sm font-semibold text-white">{t("common.accept")}</Text>
            </Pressable>
            <Pressable
              onPress={() => setRefuseItem(item)}
              accessibilityRole="button"
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
              accessibilityRole="button"
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
        <Text
          accessibilityRole="header"
          className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50"
        >
          {t("common.notifications")}
        </Text>
        <View className="w-11" />
      </View>
      {unreadCount > 0 ? (
        <View className="px-4 pt-4">
          <Text className="text-sm font-medium text-primary">
            {tp("notifications.unread", unreadCount)}
          </Text>
        </View>
      ) : null}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row gap-2">
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f.key }}
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
                {t(f.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1E6BFF" accessibilityLabel={t("common.loading")} />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-neutral-400 text-center">
            {t(EMPTY_LABEL_KEYS[filter])}
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
      <RefuseJoinRequestSheet
        visible={!!refuseItem}
        onClose={() => setRefuseItem(null)}
        requesterName={
          (refuseItem && getNotificationStoredText(getNotificationData(refuseItem).requester_name)) ||
          t("notifications.unknownRequester")
        }
        entityName={
          refuseItem
            ? getNotificationData(refuseItem).club_name ??
              getNotificationData(refuseItem).event_name ??
              ""
            : ""
        }
        onConfirm={(reason) => {
          if (refuseItem) void handleAction("refuse", refuseItem, reason);
        }}
        isPending={joinAction.isPending}
      />
    </SafeScreen>
  );
}
