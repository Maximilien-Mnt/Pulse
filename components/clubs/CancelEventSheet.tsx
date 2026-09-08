import { useState } from "react";
import { Modal, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useTranslation } from "@/hooks/useTranslation";

type Props = {
  visible: boolean;
  eventName: string;
  onClose: () => void;
  onConfirm: (message?: string) => void;
  isLoading?: boolean;
};

export function CancelEventSheet({ visible, eventName, onClose, onConfirm, isLoading }: Props) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");

  const handleConfirm = () => {
    onConfirm(message || undefined);
    setMessage("");
  };

  const handleClose = () => {
    setMessage("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="w-full max-w-sm bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-xl">
          {/* Warning icon */}
          <View className="w-14 h-14 rounded-full bg-error-500/10 items-center justify-center self-center mb-4">
            <Icon name="AlertCircle" size={28} color="error-500" />
          </View>

          {/* Title */}
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 text-center mb-2">
            {t("events.cancelTitle")}
          </Text>

          {/* Event name */}
          <Text className="text-base font-medium text-primary text-center mb-3" numberOfLines={2}>
            {eventName}
          </Text>

          {/* Explanation */}
          <Text className="text-sm text-neutral-500 text-center mb-4 leading-relaxed">
            {t("events.cancelConfirm")}
          </Text>

          {/* Optional message */}
          <Text className="text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wide">
            {t("events.cancelOptionalMessage")}
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t("events.cancelMessagePlaceholder")}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 text-sm text-neutral-900 dark:text-neutral-50 bg-neutral-50 dark:bg-neutral-900 mb-5"
            textAlignVertical="top"
          />

          {/* Actions */}
          <View className="flex-row gap-3">
            <Button
              title={t("common.cancel")}
              variant="secondary"
              onPress={handleClose}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              title={t("events.cancelAction")}
              variant="destructive"
              onPress={handleConfirm}
              loading={isLoading}
              className="flex-1"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
