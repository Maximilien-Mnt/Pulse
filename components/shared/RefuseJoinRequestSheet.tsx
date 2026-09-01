// ---------------------------------------------------------------------------
// PULSE — Refuse Join Request Sheet
//
// Bottom sheet shown when a club/event owner refuses a join request.
// Offers an OPTIONAL explanation message that will be shown to the requester
// in their "request refused" notification. Submitting with or without a
// message is always allowed.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { t } from "@/hooks/useTranslation";

export interface RefuseJoinRequestSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Full name of the user whose request is being refused */
  requesterName: string;
  /** Name of the club/event the request targetst */
  entityName: string;
  /** Called with the (optional) reason once the owner confirms the refusal */
  onConfirm: (reason: string) => void;
  isPending?: boolean;
}

const MAX_REASON_LENGTH = 500;

export function RefuseJoinRequestSheet({
  visible,
  onClose,
  requesterName,
  entityName,
  onConfirm,
  isPending = false,
}: RefuseJoinRequestSheetProps) {
  const [reason, setReason] = useState("");
 
  useEffect(() => {
    if (visible) {
      setReason("");
    }
  }, [visible]);
 
  const handleClose = () => {
    if (isPending) return;
    onClose();
  };
 
  const handleConfirm = () => {
    if (isPending) return;
    onConfirm(reason.trim());
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
            {t("clubs.dashboard.refuseTitle")}
          </Text>
 
          <Text variant="body" className="text-text-secondary mb-4">
            {t("clubs.dashboard.refusePrompt", { name: requesterName, club: entityName })}
          </Text>
 
          <Input
            label=""
            placeholder={t("clubs.dashboard.refusePlaceholder")}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={MAX_REASON_LENGTH}
            help={`${reason.length}/${MAX_REASON_LENGTH}`}
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
                title={t("common.refuse")}
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