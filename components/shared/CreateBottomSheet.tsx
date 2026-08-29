// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Create Bottom Sheet
//
// Opens as a modal overlay when the "+" button is tapped. Shows 4 creation
// options: Post, Club, Événement, Conversation.
//
// Club and Événement are two-step flows: tapping them switches the sheet to
// a t("create.privateClub") sub-step (with a back button) instead of opening a
// second Modal. Tapping a final choice navigates directly to the form screen
// and then closes the sheet (navigate-then-close) — this avoids the nested
// Modal + close-and-navigate race that caused white screens and the
// "message channel closed before a response was received" console error.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { Modal, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { useTranslation , t } from "@/hooks/useTranslation";

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
  { key: "post",     label: t("create.post"),     icon: "PlusCircle",    route: "/(tabs)/create?mode=post" },
  { key: "club",     label: t("create.club"),     icon: "Users",         route: "" },
  { key: "event",    label: t("create.event"),    icon: "Calendar",      route: "" },
  { key: "conv",     label: t("create.conversation"), icon: "MessageCircle", route: "/(tabs)/create?mode=conversation" },
];

type VisibilityStep = "club" | "event" | null;

interface VisibilityOption {
  key: string;
  label: string;
  description: string;
  icon: IconName;
  route: string;
}

const VISIBILITY_OPTIONS: Record<Exclude<VisibilityStep, null>, VisibilityOption[]> = {
  club: [
    {
      key: "private",
      label: t("create.club.private"),
      description: t("create.club.privateDesc"),
      icon: "Lock",
      route: "/create/club/private",
    },
    {
      key: "public",
      label: t("create.club.public"),
      description: t("create.club.publicHint"),
      icon: "Globe",
      route: "/create/club/public",
    },
  ],
  event: [
    {
      key: "private",
      label: t("create.event.private"),
      description: t("create.event.inviteOnlyHint"),
      icon: "Lock",
      route: "/create/event/private",
    },
    {
      key: "public",
      label: t("create.event.public"),
      description: t("create.event.publicHint"),
      icon: "Globe",
      route: "/create/event/public",
    },
  ],
};

const STEP_TITLES: Record<Exclude<VisibilityStep, null>, string> = {
  club: t("create.club.title"),
  event: t("create.event.title"),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CreateBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateBottomSheet({ visible, onClose }: CreateBottomSheetProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<VisibilityStep>(null);

  // Reset to the root step whenever the sheet reopens.
  useEffect(() => {
    if (visible) setStep(null);
  }, [visible]);

  const handleSelect = (option: CreateOption) => {
    if (option.key === "club" || option.key === "event") {
      // Switch to the visibility sub-step inside the same sheet.
      setStep(option.key);
      return;
    }
    // Navigate first, then close — avoids the close-and-navigate race.
    router.push(option.route as any);
    onClose();
  };

  const handleVisibilitySelect = (option: VisibilityOption) => {
    router.push(option.route as any);
    onClose();
  };

  const handleBack = () => {
    setStep(null);
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
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel={t("common.close")} />

        {/* Sheet */}
        <View className="bg-surface dark:bg-surface-dark rounded-t-xl px-6 pt-6 pb-10">
          {/* Handle indicator */}
          <View className="self-center w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 mb-6" />

          {step === null ? (
            <>
              {/* Title */}
              <Text variant="subtitle" className="text-text-primary mb-6">
                {t("create.title")}
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
            </>
          ) : (
            <>
              {/* Sub-step header with back button */}
              <View className="flex-row items-center mb-6">
                <Pressable
                  onPress={handleBack}
                  accessibilityRole="button"
                  accessibilityLabel="Retour"
                  hitSlop={8}
                  className="p-1 -ml-1"
                >
                  <Icon name="ChevronLeft" size={24} color="text-secondary" />
                </Pressable>
                <Text variant="subtitle" className="text-text-primary flex-1 text-center">
                  {STEP_TITLES[step]}
                </Text>
                <View className="w-8" />
              </View>

              {/* Visibility options */}
              <View className="gap-2">
                {VISIBILITY_OPTIONS[step].map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => handleVisibilitySelect(opt)}
                    accessibilityRole="button"
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
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}