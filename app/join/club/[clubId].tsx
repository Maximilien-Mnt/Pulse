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
import { t } from "@/hooks/useTranslation";

export default function JoinClubScreen() {
  const router = useRouter();
  const { clubId, token } = useLocalSearchParams<{ clubId: string; token?: string }>();
  const userId = useAuthStore((s) => s.userId);
  const redeem = useRedeemInvitation();
  const [club, setClub] = useState<{ name: string; sport: string | null; created_by: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.from("clubs").select("name, sport, created_by").eq("id", clubId).maybeSingle();
      if (active) {
        setClub(data as any);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clubId]);

  const handleJoin = () => {
    if (!userId) {
      Toast.show({ type: "info", text1: t("clubJoin.loginRequired") });
      router.replace("/auth/signin");
      return;
    }
    if (!token) {
      Toast.show({ type: "error", text1: t("clubJoin.invalidLink") });
      return;
    }
    redeem.mutate(
      { type: "club", targetId: clubId, token },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["clubs"] });
          Toast.show({ type: "success", text1: t("clubJoin.joined") });
          router.replace(`/(tabs)/clubs/${clubId}`);
        },
        onError: (e) => {
          Toast.show({ type: "error", text1: e instanceof Error ? e.message : t("clubJoin.error") });
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
              <Text className="text-4xl">🎟️</Text>
            </View>
            <Text className="text-2xl font-bold text-center text-neutral-900 dark:text-neutral-50">
              {t("clubJoin.title")}
            </Text>
            <Text className="text-xl font-semibold text-primary text-center mt-2">
              {club?.name ?? t("clubJoin.defaultName")}
            </Text>
            {club?.sport ? (
              <Text className="text-neutral-500 text-center mt-1">{club.sport}</Text>
            ) : null}
            <Text className="text-neutral-600 dark:text-neutral-300 text-center mt-4 mb-8">
              {t("clubJoin.body")}
            </Text>
            {userId && club?.created_by === userId ? null : (
              <Button
                title={t("clubJoin.joinButton")}
                onPress={handleJoin}
                loading={redeem.isPending}
                className="w-full"
              />
            )}
            <Button
              title={t("common.cancel")}
              variant="ghost"
              className="w-full mt-2"
              onPress={() => router.replace("/(tabs)/clubs")}
            />
          </>
        )}
      </View>
    </SafeScreen>
  );
}
