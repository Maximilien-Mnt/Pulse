import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useDeleteClub } from "@/hooks/useDeleteClub";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { t } from "@/hooks/useTranslation";

type Props = {
  visible: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
};

/**
 * Confirmation dialog for deleting a club.
 * Warns that all members will be removed and notified.
 */
export function DeleteClubSheet({ visible, onClose, clubId, clubName }: Props) {
  const router = useRouter();
  const deleteMut = useDeleteClub();

  const handleDelete = () => {
    deleteMut.mutate([clubId, clubName], {
      onSuccess: () => {
        Toast.show({
          type: "success",
          text1: t("deleteClub.success"),
          text2: t("deleteClub.body", { clubName }),
        });
        onClose();
        // Navigate back to profile if we're on the club page
        if (router.canGoBack()) {
          router.back();
        }
      },
      onError: (error) => {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: t("deleteClub.error"),
        });
        console.error("Delete club error:", error);
      },
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full">
          <View className="items-center mb-4">
            <View className="w-16 h-16 rounded-full bg-error-100 dark:bg-error-900/30 items-center justify-center mb-3">
              <Icon name="Trash2" size={32} color="error-500" />
            </View>
            <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50 text-center">
              Supprimer le club ?
            </Text>
          </View>

          <Text className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 text-center">
            Cette action est irréversible. Tous les membres seront supprimés du club et
            recevront une notification.
          </Text>

          <View className="gap-3">
            <Button
              title="Annuler"
              variant="ghost"
              onPress={onClose}
              disabled={deleteMut.isPending}
            />
            <Button
              title={t("common.delete")}
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
