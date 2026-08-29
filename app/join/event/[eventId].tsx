import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useRedeemInvitation } from "@/hooks/useInvitations";
import { useAuthStore } from "@/stores/authStore";
import { queryClient } from "@/lib/queryClient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import Toast from "react-native-toast-message";
import { useTranslation , t } from "@/hooks/useTranslation";

export default function JoinEventScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { eventId, token } = useLocalSearchParams<{ eventId: string; token?: string }>();
  const userId = useAuthStore((s) => s.userId);
  const redeem = useRedeemInvitation();
  const [event, setEvent] = useState<{ name: string; sport: string | null; created_by: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.from("events").select("name, sport, created_by").eq("id", eventId).maybeSingle();

      if (active) {
        setEvent(data as any);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [eventId]);

  const handleJoin = () => {
    if (!userId) {
      Toast.show({ type: "info", text1: t("events.join.loginRequired") });
      router.replace("/auth/signin");
      return;
    }
    if (!token) {
      Toast.show({ type: "error", text1: "Lien d'invitation invalide" });
      return;
    }
    redeem.mutate(
      { type: "event", targetId: eventId, token },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["events"] });
          Toast.show({ type: "success", text1: t("events.join.success") });
          router.replace(`/(tabs)/events/${eventId}`);
        },
        onError: (e) => {
          Toast.show({ type: "error", text1: e instanceof Error ? e.message : "Erreur" });
        },
      }
    );
  };

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
      <View className="flex-1 items-center justify-center px-6">
        {loading ? (
          <ActivityIndicator color="#1E6BFF" />
        ) : (
          <>
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6">
              <Text className="text-4xl">🎉</Text>
            </View>
            <Text className="text-2xl font-bold text-center text-neutral-900 dark:text-neutral-50">
              Invitation à un événement
            </Text>
            <Text className="text-xl font-semibold text-primary text-center mt-2">
              {event?.name ?? t("events.defaultName")}

            </Text>
            {event?.sport ? (
              <Text className="text-neutral-500 text-center mt-1">{event.sport}</Text>
            ) : null}
            <Text className="text-neutral-600 dark:text-neutral-300 text-center mt-4 mb-8">
              {t("join.event.invited")}
            </Text>
            {userId && event?.created_by === userId ? null : (
              <Button
                title="Participer"
                onPress={handleJoin}
                loading={redeem.isPending}
                className="w-full"
              />
            )}
            <Button
              title="Annuler"
              variant="ghost"
              className="w-full mt-2"
              onPress={() => router.replace("/(tabs)/events")}
            />
          </>
        )}
      </View>
    </SafeScreen>
  );
}
