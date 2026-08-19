import { Button } from "@/components/ui/Button";
import { useUpdateProfile } from "@/hooks/useProfile";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Modal, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { supabase } from "@/lib/supabase";

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Confirmation modal for making a private profile public.
 * This action is irreversible - once public, the profile cannot be made private again.
 */
export function GoPublicSheet({ visible, onClose }: Props) {
  const userId = useAuthStore((s) => s.userId);
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleGoPublic = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_public_profile: true })
        .eq("id", userId);

      if (error) throw error;

      // Invalidate profile queries to refresh UI
      await qc.invalidateQueries({ queryKey: ["profile", userId] });
      
      Toast.show({
        type: "success",
        text1: "Profil public activé",
      });
      
      onClose();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Erreur lors de la mise à jour",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4">
          <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
            Passer au profil public
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            Ton profil sera visible par tous les utilisateurs. Ta bio, tes sports, 
            ta langue et tes photos publiques seront accessibles publiquement.
          </Text>
          <Text className="text-sm text-error mb-4 font-medium">
            Attention : cette action est irréversible. Une fois public, tu ne pourras 
            plus revenir en mode privé.
          </Text>
          <View className="flex-row gap-2 mt-4">
            <Button title="Annuler" variant="ghost" onPress={onClose} />
            <Button
              title="Confirmer"
              variant="primary"
              onPress={handleGoPublic}
              loading={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}