import { Avatar } from "@/components/ui/Avatar";
import type { ConversationListItem } from "@/hooks/useConversations";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { formatRelative } from "@/utils/date";
import { exportConversationToJsonl } from "@/utils/conversationExport";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { ActionSheetIOS, Alert, Platform, Pressable, Share, Text, View } from "react-native";
import Toast from "react-native-toast-message";

type Props = { item: ConversationListItem };

export function ConversationItem({ item }: Props) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);

  const pinMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      const { error } = await supabase
        .from("conversation_participants")
        .update({ pinned: !item.pinned })
        .eq("conversation_id", item.conversation.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["conversations", userId] }),
  });

  const leaveMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      const { error } = await supabase
        .from("conversation_participants")
        .update({ left_at: new Date().toISOString() })
        .eq("conversation_id", item.conversation.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["conversations", userId] }),
  });

  const reportMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      const { error } = await supabase.from("reports").insert({
        reporter_id: userId,
        target_type: "conversation",
        target_id: item.conversation.id,
        message: "Signalement conversation (données partagées avec l'équipe)",
      });
      if (error) throw error;
    },
    onSuccess: () => Toast.show({ type: "success", text1: "Signalement envoyé" }),
  });

  const openMenu = () => {
    const opts = [
      item.pinned ? "Désépingler" : "Épingler",
      "Télécharger",
      "Signaler",
      "Supprimer",
      "Annuler",
    ];
    const handler = (i?: number) => {
      if (i === undefined) return;
      if (opts[i] === "Annuler") return;
      if (opts[i]?.startsWith("Éping") || opts[i]?.startsWith("Déséping")) pinMut.mutate();
      if (opts[i] === "Télécharger") {
        exportConversationToJsonl(item.conversation.id).catch(() =>
          Toast.show({ type: "error", text1: "Export impossible" })
        );
      }
      if (opts[i] === "Signaler") {
        Alert.alert("Signaler ?", "Des données peuvent être partagées avec l'équipe.", [
          { text: "Annuler", style: "cancel" },
          { text: "Envoyer", onPress: () => reportMut.mutate() },
        ]);
      }
      if (opts[i] === "Supprimer") {
        Alert.alert("Quitter la conversation ?", "", [
          { text: "Non", style: "cancel" },
          { text: "Oui", style: "destructive", onPress: () => leaveMut.mutate() },
        ]);
      }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: opts, cancelButtonIndex: 4, destructiveButtonIndex: 3 },
        handler
      );
    } else {
      Alert.alert("Actions", undefined, [
        { text: opts[0]!, onPress: () => handler(0) },
        { text: opts[1]!, onPress: () => handler(1) },
        { text: opts[2]!, onPress: () => handler(2) },
        { text: opts[3]!, onPress: () => handler(3) },
        { text: "Annuler", style: "cancel" },
      ]);
    }
  };

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/conversations/${item.conversation.id}`)}
      className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800"
    >
      <Avatar uri={item.other.avatar_url} size={40} />
      <View className="flex-1 ml-3">
        <View className="flex-row justify-between">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            {item.other.full_name}
          </Text>
          <Text className="text-xs text-neutral-400">
            {formatRelative(item.conversation.last_message_at ?? item.conversation.updated_at)}
          </Text>
        </View>
        <Text className="text-sm text-neutral-500 mt-1" numberOfLines={1}>
          {item.conversation.last_message_preview ?? "—"}
        </Text>
      </View>
      <View className="items-end gap-2 ml-2">
        {item.unread > 0 ? (
          <View className="min-w-[22px] h-[22px] rounded-full bg-primary items-center justify-center px-1">
            <Text className="text-xs text-white font-bold">{item.unread > 9 ? "9+" : item.unread}</Text>
          </View>
        ) : null}
        <Pressable onPress={openMenu} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
        </Pressable>
      </View>
    </Pressable>
  );
}
