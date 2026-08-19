import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useDeleteAccount } from "@/hooks/useDeleteAccount";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Text, View } from "react-native";
import Toast from "react-native-toast-message";

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Password input → re-auth → soft delete profile → sign out.
 */
export function DeleteAccountSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const deleteMut = useDeleteAccount();

  const handleDelete = () => {
    if (!password.trim()) {
      Toast.show({ type: "error", text1: "Mot de passe requis" });
      return;
    }
    deleteMut.mutate(password, {
      onSuccess: () => {
        Toast.show({ type: "success", text1: "Compte supprimé" });
        onClose();
        router.replace("/auth/signin");
      },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4">
          <Text className="text-xl font-bold text-error mb-2">Supprimer mon compte</Text>
          <Text className="text-sm text-neutral-500 mb-4">
            Cette action est irréversible. Saisis ton mot de passe pour confirmer.
          </Text>
          <Input
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <View className="flex-row gap-2 mt-4">
            <Button title="Annuler" variant="ghost" onPress={onClose} />
            <Button
              title="Supprimer définitivement"
              variant="destructive"
              onPress={handleDelete}
              loading={deleteMut.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}