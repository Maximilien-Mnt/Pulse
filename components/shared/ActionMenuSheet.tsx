// ---------------------------------------------------------------------------
// PULSE SHARED — Action menu sheet (fallback renderer)
//
// Renders an ActionMenuDescriptor as an in-app bottom sheet, for the platforms
// where React Native exposes no OS options menu (Android, web).
//
// It consumes the exact same descriptor as `showNativeActionMenu`, so the
// option list, labels, destructive/disabled states and the callback keys are
// identical on every platform — only the chrome differs. On iOS this component
// is never rendered: the real system action sheet is used instead.
// ---------------------------------------------------------------------------

import React from "react";
import { Modal, Pressable, View } from "react-native";

import { Text } from "@/components/ui/Text";
import type { IconName } from "@/components/ui/Icon";
import { ActionMenuRows } from "@/components/shared/ActionMenuRows";
import { TextButton } from "@/components/ui/TextButton";
import type { ActionMenuDescriptor } from "@/components/shared/nativeActionMenu";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  visible: boolean;
  descriptor: ActionMenuDescriptor | null;
  onClose: () => void;
  onSelect: (key: string) => void;
  /** Optional icon per option key. */
  icons?: Partial<Record<string, IconName>>;
}

export function ActionMenuSheet({ visible, descriptor, onClose, onSelect, icons }: Props) {
  const { t } = useTranslation();

  if (!descriptor) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        {/* Backdrop — tapping outside dismisses the menu (like the OS sheet). */}
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        />

        <View className="bg-surface dark:bg-surface-dark rounded-t-3xl px-2 pt-3 pb-8">
          <View className="self-center w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />

          {descriptor.title ? (
            <Text
              variant="subtitle"
              className="text-text-secondary text-center px-4 pt-3"
              numberOfLines={1}
            >
              {descriptor.title}
            </Text>
          ) : null}

          <View className="mt-2">
            {/* Same shared rows as the floating popover: uniform alignment
                and the blue-tint hover for every option, destructive included. */}
            <ActionMenuRows
              descriptor={descriptor}
              onSelect={onSelect}
              icons={icons}
              density="sheet"
            />
          </View>

          <TextButton
            tone="link"
            onPress={onClose}
            accessibilityLabel={descriptor.cancelLabel}
            className="mt-1 border-t border-border pt-4"
          >
            {descriptor.cancelLabel}
          </TextButton>
        </View>
      </View>
    </Modal>
  );
}
