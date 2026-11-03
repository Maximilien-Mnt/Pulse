// ---------------------------------------------------------------------------
// PULSE — Auth-required modal (centred overlay)
// ---------------------------------------------------------------------------
// Shown to visitors when they attempt a connected-user action (like, comment,
// publish, favourite, join, report). Explains they must log in / create an
// account, names the blocked action, and offers two CTAs: sign in or sign up.
// ---------------------------------------------------------------------------

import React, { useMemo } from "react";
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeStore } from "@/stores/themeStore";
import { useTranslation, t } from "@/hooks/useTranslation";
import { Link } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type AuthRequiredAction =
  | "like"
  | "comment"
  | "createPost"
  | "favoriteClub"
  | "favoriteEvent"
  | "joinClub"
  | "joinEvent"
  | "report"
  | "conversation";

type AuthRequiredModalProps = {
  visible: boolean;
  /** Called when the modal should be dismissed (backdrop tap or Fermer). */
  onClose: () => void;
  /** Action the visitor attempted — used to personalise the message. */
  action: AuthRequiredAction;
};

export type { AuthRequiredAction };

const ACTION_LABELS: Record<AuthRequiredAction, string> = {
  like: "aimer un post",
  comment: "commenter un post",
  createPost: "publier un post",
  favoriteClub: "ajouter un club aux favoris",
  favoriteEvent: "ajouter un événement aux favoris",
  joinClub: "rejoindre un club",
  joinEvent: "participer à un événement",
  report: "signaler un contenu",
  conversation: "accéder aux conversations",
};

export function AuthRequiredModal({ visible, onClose, action }: AuthRequiredModalProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const { t } = useTranslation();
  const { width, height } = Dimensions.get("window");

  const fadeAnim = useMemo(() => new Animated.Value(visible ? 1 : 0), []);
  const scaleAnim = useMemo(() => new Animated.Value(visible ? 1 : 0.9), []);

  React.useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 9, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [visible, fadeAnim, scaleAnim]);

  const label = ACTION_LABELS[action];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop tap dismisses */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("authRequired.close")}
        className="absolute inset-0 bg-black/40 items-center justify-center p-4 z-50"
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
              width: Math.min(width - 48, 330),
              maxHeight: height * 0.72,
              backgroundColor: isDark ? "#171A20" : "#FFFFFF",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isDark ? "#262A32" : "#E5E7EB",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 20,
              overflow: "hidden",
            },
          ]}
        >
          <View className="px-6 py-6 gap-4 w-full">
            <View className="items-center">
              <View className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary-tint-dark items-center justify-center mb-2">
                <Icon name="Lock" size={32} color="primary" />
              </View>
              <Text variant="subtitle" className="text-text-primary text-center font-semibold">
                {t("authRequired.title")}
              </Text>
            </View>
            <Text variant="body" className="text-text-secondary text-center leading-relaxed">
              {t("authRequired.message", { action: label })}
            </Text>

            <Link href="/auth/signin" asChild>
              <Button title={t("authRequired.signIn")} variant="primary" className="h-11 flex-1" />
            </Link>
            <Link href="/auth/signup/step1" asChild>
              <Button
                title={t("authRequired.signUp")}
                variant="ghost"
                className="h-11 flex-1 border border-primary dark:border-primary"
              />
            </Link>

            <Pressable
              onPress={onClose}
              className="items-center mt-3"
              accessibilityRole="button"
              accessibilityLabel={t("authRequired.close")}
            >
              <Text variant="caption" className="text-text-tertiary">
                {t("authRequired.close")}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
