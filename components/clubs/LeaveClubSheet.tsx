import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useLeaveClub } from "@/hooks/useLeaveClub";
import { useState } from "react";
import { Modal, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { t } from "@/hooks/useTranslation";

type Props = {
  visible: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
  creatorId: string;
};

/**
 * Confirmation dialog for leaving a club.
 * Asks for an optional reason message that is sent to the club creator.
 */
export function LeaveClubSheet({ visible, onClose, clubId, clubName, creatorId }: Props) {
  const [reason, setReason] = useState("");
  const leaveMut = useLeaveClub();

  const handleLeave = () => {
    leaveMut.mutate(
      { clubId, clubName, creatorId, reason },
      {
        onSuccess: () => {
          setReason("");
          onClose();
        },
      }
    );
  };

  const handleClose = () => {
    if (!leaveMut.isPending) {
      setReason("");
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full">
          <View className="items-center mb-4">
            <View className="w-16 h-16 rounded-full bg-error-100 dark:bg-error-900/30 items-center justify-center mb-3">
              <Icon name="ArrowRight" size={32} color="error-500" />
            </View>
            <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50 text-center">
              {t("clubs.leaveConfirmTitle")}
            </Text>
          </View>

          <Text className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 text-center">
            {t("clubs.leaveConfirmBody")}
          </Text>

          {/* Optional reason input */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t("clubs.leaveReasonLabel")}
            </Text>
            <TextInput
              className="border-2 border-neutral-200 dark:border-neutral-700 rounded-sm px-4 py-3 text-base text-neutral-900 dark:text-neutral-50 bg-surface dark:bg-surface-dark min-h-[80px] max-h-[120px]"
              placeholder={t("clubs.leaveReasonPlaceholder")}
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              value={reason}
              onChangeText={setReason}
              editable={!leaveMut.isPending}
            />
          </View>

          <View className="gap-3">
            <Button
              title={t("common.cancel")}
              variant="ghost"
              onPress={handleClose}
              disabled={leaveMut.isPending}
            />
            <Button
              title={t("clubs.leave")}
              variant="destructive"
              onPress={handleLeave}
              loading={leaveMut.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
