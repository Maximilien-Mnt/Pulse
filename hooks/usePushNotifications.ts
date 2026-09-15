import { useEffect } from "react";
import { Platform } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import Toast from "react-native-toast-message";
import * as Linking from "expo-linking";
import * as NotificationsModule from "expo-notifications";
import type * as NotificationsModuleType from "expo-notifications";

type NotificationsNamespace = typeof NotificationsModuleType;

let notificationsModule: NotificationsNamespace | null = null;
function getNotifications(): NotificationsNamespace | null {
  if (notificationsModule) return notificationsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require("expo-notifications") as NotificationsNamespace;
    const mod = notificationsModule;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    return mod;
  } catch {
    return null;
  }
}

export function usePushNotifications() {
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => {
    if (!userId) return;
    const Notifications = getNotifications();
    if (!Notifications) return;

    let subscription: { remove: () => void } | undefined;

    const register = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        // Push token via Expo is not supported on web yet.
        if (typeof window === "undefined" || Platform.OS === "web") return;

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        if (!token) return;

        await supabase.from("profiles").update({ push_token: token }).eq("id", userId);
      } catch (e) {
        // ignore
      }
    };

    register();

    const sub1 = Notifications.addNotificationReceivedListener((notification) => {
      const title = notification.request.content.title;
      const body = notification.request.content.body;
      if (title || body) {
        Toast.show({ type: "info", text1: title ?? "", text2: body ?? "" });
      }
    });

    const sub2 = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      
      // Extract navigation target from payload
      if (data?.club_id) {
        const url = `pulse:///(tabs)/clubs/${data.club_id}`;
        await Linking.openURL(url);
      } else if (data?.event_id) {
        const url = `pulse:///(tabs)/events/${data.event_id}`;
        await Linking.openURL(url);
      } else if (data?.conversation_id) {
        const url = `pulse:///(tabs)/conversations/${data.conversation_id}`;
        await Linking.openURL(url);
      } else if (data?.type === 'join_request' && data?.club_id) {
        const url = `pulse:///(tabs)/clubs/${data.club_id}/members`;
        await Linking.openURL(url);
      } else {
        // No navigation target, just show notification
        const title = response.notification.request.content.title;
        const body = response.notification.request.content.body;
        if (title || body) {
          Toast.show({ type: "info", text1: title ?? "", text2: body ?? "" });
        }
      }
    });

    subscription = {
      remove: () => {
        sub1.remove();
        sub2.remove();
      },
    };

    return () => {
      subscription?.remove();
    };
  }, [userId]);
}
