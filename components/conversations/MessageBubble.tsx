import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { formatTime } from "@/utils/date";
import type { Message } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";
import { Alert, Pressable, Text, View } from "react-native";

type Props = {
  message: Message;
  mine: boolean;
  senderName: string;
};

export function MessageBubble({ message, mine, senderName }: Props) {
  const userId = useAuthStore((s) => s.userId);

  const deleteMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("messages")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", message.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", message.conversation_id] });
    },
  });

  const hideMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      const { error } = await supabase.from("message_hidden").insert({
        message_id: message.id,
        user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", message.conversation_id] });
    },
  });

  const onLongPress = () => {
    Alert.alert("Message", undefined, [
      mine
        ? { text: "Supprimer", style: "destructive", onPress: () => deleteMut.mutate() }
        : { text: "Masquer", onPress: () => hideMut.mutate() },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  if (message.is_deleted) {
    return (
      <View className={`mb-3 max-w-[85%] ${mine ? "self-end" : "self-start"}`}>
        <Text className="text-sm italic text-neutral-400">Message supprimé</Text>
      </View>
    );
  }

  return (
    <Pressable
      onLongPress={onLongPress}
      className={`mb-3 max-w-[85%] px-4 py-3 rounded-2xl ${
        mine
          ? "self-end bg-primary rounded-tr-sm"
          : "self-start bg-neutral-100 dark:bg-neutral-800 rounded-tl-sm"
      }`}
    >
      <Text className={`text-base ${mine ? "text-white" : "text-neutral-900 dark:text-neutral-50"}`}>
        {message.body}
      </Text>
      <Text className={`text-xs mt-1 ${mine ? "text-white/80" : "text-neutral-400"}`}>
        {senderName} · {formatTime(message.created_at)}
      </Text>
    </Pressable>
  );
}