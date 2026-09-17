// ---------------------------------------------------------------------------
// PULSE — Club Event Visibility Choice Sheet
//
// Shown from the public club profile when an owner/admin taps "Create event".
// Offers public vs private creation, carrying the current clubId into the
// chosen form so the club is preselected while personal profile stays selectable.
// ---------------------------------------------------------------------------

import React from "react";
import { Modal, Pressable, View } from "react-native";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { useTranslation } from "@/hooks/useTranslation";

interface ClubCreateEventSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (visibility: "public" | "private") => void;
}

export function ClubCreateEventSheet({ visible, onClose, onSelect }: ClubCreateEventSheetProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel={t("common.close")} />

        <View className="bg-surface dark:bg-surface-dark rounded-t-xl px-6 pt-6 pb-10">
          <View className="self-center w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 mb-6" />

          <Text variant="subtitle" className="text-text-primary mb-6">
            {t("create.event.title")}
          </Text>

          <View className="gap-2">
            {(
              [
                {
                  key: "private" as const,
                  label: t("create.event.private"),
                  description: t("create.event.inviteOnlyHint"),
                  icon: "Lock" as const,
                },
                {
                  key: "public" as const,
                  label: t("create.event.public"),
                  description: t("create.event.publicIdentityHint"),
                  icon: "Globe" as const,
                },
              ]
            ).map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => onSelect(opt.key)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                className="flex-row items-center gap-4 py-4 px-3 rounded-lg active:bg-primary-tint"
              >
                <View className="w-10 h-10 rounded-full bg-neutral-50 dark:bg-neutral-800 items-center justify-center">
                  <Icon name={opt.icon} size={20} color="text-secondary" />
                </View>
                <View className="flex-1">
                  <Text variant="bodyLarge" className="text-text-primary">
                    {opt.label}
                  </Text>
                  <Text variant="caption" className="text-text-tertiary">
                    {opt.description}
                  </Text>
                </View>
                <Icon name="PlusCircle" size={20} color="text-tertiary" />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
