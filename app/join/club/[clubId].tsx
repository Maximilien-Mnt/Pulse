import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useRedeemInvitation } from "@/hooks/useInvitations";
import { useAuthStore } from "@/stores/authStore";
import { queryClient } from "@/lib/queryClient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function JoinClubScreen() {
  const router = useRouter();
  const { clubId, token } = useLocalSearchParams<{ clubId: string; token?: string }>();
  const userId = useAuthStore((s) => s.userId);
  const redeem = useRedeemInvitation();
  const [club, setClub] = useState<{ name: string; sport: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.from("clubs").select("name, sport").eq("id", clubId).maybeSingle();
      if (active) {
        setClub(data);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clubId]);

  const handleJoin = () => {
    if (!userId) {
      Toast.show({ type: "info", text1: "Connecte-toi pour rejoindre ce club" });
      router.replace("/auth/signin");
      return;
    }
    if (!token) {
      Toast.show({ type: "error", text1: "Lien d'invitation invalide" });
      return;
    }
    redeem.mutate(
      { type: "club", targetId: clubId, token },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["clubs"] });
          Toast.show({ type: "success", text1: "Tu as rejoint le club !" });
          router.replace(`/clubs/${clubId}` as any);
        },
        onError: (e) => {
          Toast.show({ type: "error", text1: e instanceof Error ? e.message : "Erreur" });
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
      <View className="flex-1 items-center justify-center px-6">
        {loading ? (
          <ActivityIndicator color="#1E6BFF" />
        ) : (
          <>
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6">
              <Text className="text-4xl">🎟️</Text>
            </View>
            <Text className="text-2xl font-bold text-center text-neutral-900 dark:text-neutral-50">
              Invitation à rejoindre
            </Text>
            <Text className="text-xl font-semibold text-primary text-center mt-2">
              {club?.name ?? "Ce club"}
            </Text>
            {club?.sport ? (
              <Text className="text-neutral-500 text-center mt-1">{club.sport}</Text>
            ) : null}
            <Text className="text-neutral-600 dark:text-neutral-300 text-center mt-4 mb-8">
              Tu as été invité(e) à rejoindre ce club privé. Accepte l'invitation pour y accéder.
            </Text>
            <Button
              title="Rejoindre le club"
              onPress={handleJoin}
              loading={redeem.isPending}
              className="w-full"
            />
            <Button
              title="Annuler"
              variant="ghost"
              className="w-full mt-2"
              onPress={() => router.replace("/(tabs)/clubs")}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
