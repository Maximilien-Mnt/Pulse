// ---------------------------------------------------------------------------
// PULSE — Remove Member Sheet
//
// Bottom sheet shown when a club admin removes a member from the members
// screen. Offers an OPTIONAL message that is appended to the notification the
// removed member receives. Submitting with or without a message is allowed.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { t } from "@/hooks/useTranslation";

export interface RemoveMemberSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Full name of the member being removed. */
  memberName: string;
  /** Name of the club the member is being removed from. */
  clubName: string;
  /** Called with the (optional) message once the admin confirms. */
  onConfirm: (message: string) => void;
  isPending?: boolean;
}

const MAX_MESSAGE_LENGTH = 500;

export function RemoveMemberSheet({
  visible,
  onClose,
  memberName,
  clubName,
  onConfirm,
  isPending = false,
}: RemoveMemberSheetProps) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (visible) setMessage("");
  }, [visible]);

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleConfirm = () => {
    if (isPending) return;
    onConfirm(message.trim());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={handleClose} accessibilityLabel={t("common.close")} />

        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4 pb-8">
          <View className="self-center w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 mb-4" />

          <Text variant="subtitle" className="text-text-primary mb-2">
            {t("removeMember.confirmTitle")}
          </Text>

          <Text variant="body" className="text-text-secondary mb-4">
            {t("removeMember.confirmBody", { name: memberName, club: clubName })}
          </Text>

          <Input
            label=""
            placeholder={t("removeMember.messagePlaceholder")}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            help={`${message.length}/${MAX_MESSAGE_LENGTH}`}
            className="mb-4"
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                title={t("common.cancel")}
                variant="ghost"
                onPress={handleClose}
                disabled={isPending}
              />
            </View>
            <View className="flex-1">
              <Button
                title={t("common.delete")}
                variant="destructive"
                onPress={handleConfirm}
                loading={isPending}
                disabled={isPending}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}