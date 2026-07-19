import { Button } from "@/components/ui/Button";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Modal, Pressable, Text, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function EventCreationModal({ visible, onClose }: Props) {
  const router = useRouter();

  const handlePrivate = () => {
    onClose();
    router.push("/create/event/private");
  };

  const handlePublic = () => {
    onClose();
    router.push("/create/event/public");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
              Nouvel événement
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          <Text className="text-neutral-700 dark:text-neutral-200 mb-4">
            Choisis le type d'événement que tu souhaites créer :
          </Text>

          <Pressable
            onPress={handlePrivate}
            className="flex-row items-center p-4 bg-neutral-100 dark:bg-neutral-800 rounded-2xl mb-3"
          >
            <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-4">
              <Ionicons name="lock-closed-outline" size={24} color="#1E6BFF" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-neutral-900 dark:text-neutral-50">
                Événement privé
              </Text>
              <Text className="text-sm text-neutral-500">
                Accessible uniquement aux personnes invitées
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </Pressable>

          <Pressable
            onPress={handlePublic}
            className="flex-row items-center p-4 bg-neutral-100 dark:bg-neutral-800 rounded-2xl mb-3"
          >
            <View className="w-12 h-12 rounded-full bg-success/10 items-center justify-center mr-4">
              <Ionicons name="globe-outline" size={24} color="#22C55E" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-neutral-900 dark:text-neutral-50">
                Événement public
              </Text>
              <Text className="text-sm text-neutral-500">
                Visible par tous, nécessite un profil public
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </Pressable>

          <Button title="Annuler" variant="ghost" onPress={onClose} className="mt-2" />
        </View>
      </View>
    </Modal>
  );
}
