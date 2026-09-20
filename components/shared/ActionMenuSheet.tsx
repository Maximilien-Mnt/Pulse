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

import { Icon, type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import type { ActionMenuDescriptor } from "@/components/shared/nativeActionMenu";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/utils/format";

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
            {descriptor.options.map((option) => {
              const icon = icons?.[option.key];
              return (
                <Pressable
                  key={option.key}
                  disabled={option.disabled}
                  onPress={() => onSelect(option.key)}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ disabled: option.disabled ?? false }}
                  className={cn(
                    "flex-row items-center gap-3 px-4 py-4 rounded-2xl",
                    option.disabled
                      ? "opacity-40"
                      : "active:bg-primary-tint dark:active:bg-primary-tint-dark"
                  )}
                >
                  {icon ? (
                    <Icon
                      name={icon}
                      size={20}
                      color={option.destructive ? "error-600" : "text-secondary"}
                    />
                  ) : null}
                  <Text
                    className={cn(
                      "flex-1 text-base",
                      option.destructive ? "text-error-600" : "text-text-primary"
                    )}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={descriptor.cancelLabel}
            className="mt-1 border-t border-border pt-4 active:opacity-70"
          >
            <Text className="text-center text-base font-['Inter_600SemiBold'] text-primary">
              {descriptor.cancelLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
