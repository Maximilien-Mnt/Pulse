// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Create Bottom Sheet
//
// Opens as a modal overlay when the "+" button is tapped. Shows 4 creation
// options: Post, Club, Événement, Conversation.
//
// Each option navigates to the appropriate creation screen.
// Dimmed backdrop, sheet anchored to the bottom, radius top 24.
// ---------------------------------------------------------------------------

import React from "react";
import { Modal, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface CreateOption {
  key: string;
  label: string;
  icon: IconName;
  route: string;
}

const CREATE_OPTIONS: CreateOption[] = [
  { key: "post",     label: "Post",        icon: "PlusCircle",   route: "/(tabs)/create?mode=post" },
  { key: "club",     label: "Club",        icon: "Users",        route: "/(tabs)/create?mode=club" },
  { key: "event",    label: "Événement",   icon: "Calendar",     route: "/(tabs)/create?mode=event" },
  { key: "conv",     label: "Conversation",icon: "MessageCircle",route: "/(tabs)/create?mode=conversation" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CreateBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateBottomSheet({ visible, onClose }: CreateBottomSheetProps) {
  const router = useRouter();

  const handleSelect = (option: CreateOption) => {
    // Close the sheet, then navigate to the creation screen
    onClose();
    setTimeout(() => {
      router.push(option.route as any);
    }, 50);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        {/* Backdrop — tap to dismiss */}
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Fermer" />

        {/* Sheet */}
        <View className="bg-surface dark:bg-surface-dark rounded-t-xl px-6 pt-6 pb-10">
          {/* Handle indicator */}
          <View className="self-center w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 mb-6" />

          {/* Title */}
          <Text variant="subtitle" className="text-text-primary mb-6">
            Créer
          </Text>

          {/* Options */}
          <View className="gap-2">
            {CREATE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => handleSelect(opt)}
                accessibilityRole="button"
                className="flex-row items-center gap-4 py-4 px-3 rounded-lg active:bg-primary-tint"
              >
                <View className="w-10 h-10 rounded-full bg-neutral-50 dark:bg-neutral-800 items-center justify-center">
                  <Icon name={opt.icon} size={20} color="text-secondary" />
                </View>
                <Text variant="bodyLarge" className="text-text-primary flex-1">
                  {opt.label}
                </Text>
                <Icon name="PlusCircle" size={20} color="text-tertiary" />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}