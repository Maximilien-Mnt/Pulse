import { formatTime } from "@/utils/date";
import type { Message } from "@/types";
import { Alert, Pressable, Text, View } from "react-native";

type Props = {
  message: Message;
  mine: boolean;
  senderName: string;
};

export function MessageBubble({ message, mine, senderName }: Props) {
  const onLongPress = () => {
    Alert.alert("Message", undefined, [
      mine
        ? { text: "Supprimer", style: "destructive", onPress: () => {} }
        : { text: "Masquer", onPress: () => {} },
      { text: "Annuler", style: "cancel" },
    ]);
    // TODO V2: suppression / masquage réel + sync serveur
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
