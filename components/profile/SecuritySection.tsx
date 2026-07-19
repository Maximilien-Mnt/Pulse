import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  email: string;
};

/**
 * Collapsible showing email + password with show/hide eye toggles (display only).
 * V1 spec: no re-auth flow here.
 */
export function SecuritySection({ email }: Props) {
  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="mt-4 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
      <Text className="text-lg font-semibold mb-3 text-neutral-900 dark:text-neutral-50">Sécurité</Text>

      <View className="flex-row items-center justify-between py-2">
        <View className="flex-1">
          <Text className="text-sm text-neutral-500">Email</Text>
          <Text className="text-base text-neutral-900 dark:text-neutral-50 mt-0.5">
            {showEmail ? email : "••••••••••••"}
          </Text>
        </View>
        <Pressable onPress={() => setShowEmail((v) => !v)} hitSlop={8}>
          <Ionicons name={showEmail ? "eye-off-outline" : "eye-outline"} size={22} color="#64748B" />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between py-2 border-t border-neutral-100 dark:border-neutral-700 mt-2 pt-3">
        <View className="flex-1">
          <Text className="text-sm text-neutral-500">Mot de passe</Text>
          <Text className="text-base text-neutral-900 dark:text-neutral-50 mt-0.5">
            {showPassword ? "MonMotDePasse123!" : "••••••••••••"}
          </Text>
        </View>
        <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#64748B" />
        </Pressable>
      </View>
    </View>
  );
}