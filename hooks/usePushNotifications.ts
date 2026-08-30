import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import Toast from "react-native-toast-message";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => {
    if (!userId) return;

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
      const data = notification.request.content.data;
      const title = notification.request.content.title;
      const body = notification.request.content.body;
      if (title || body) {
        Toast.show({ type: "info", text1: title ?? "", text2: body ?? "" });
      }
    });

    const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // Navigation is handled by the screen based on notification press
      // because expo-router handles deep links from notifications if configured.
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
