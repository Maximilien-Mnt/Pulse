import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { Pressable, Text, View, Modal, TextInput, Alert, ActivityIndicator } from "react-native";
import { useChangePassword } from "@/hooks/useChangePassword";
import { usePassword } from "@/hooks/usePassword";

type Props = {
  email: string;
};

/**
 * Collapsible showing email + password with show/hide eye toggles.
 * Also allows changing the password.
 *
 * The password is stored securely on-device (SecureStore) during signup,
 * on sign-in, and on password change so the user can always reveal it
 * here in Settings.
 */
export function SecuritySection({ email }: Props) {
  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { password: storedPassword, isLoading: isLoadingPassword, reloadPassword } = usePassword();

  // Change password modal state
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { changePassword, isLoading: isChangingPassword } = useChangePassword();

  // Reload password when change modal closes (to get updated password)
  useEffect(() => {
    if (!showChangeModal) {
      reloadPassword();
    }
  }, [showChangeModal, reloadPassword]);

  const handleChangePassword = async () => {
    // Validate passwords
    if (newPassword.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }

    const success = await changePassword(newPassword);
    if (success) {
      setShowChangeModal(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const canShowPassword = storedPassword !== null && storedPassword.length > 0;

  return (
    <View className="mt-4 p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
      <Text className="text-lg font-semibold mb-3 text-neutral-900 dark:text-neutral-50">Sécurité</Text>

      {/* Email Row */}
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

      {/* Password Row */}
      <View className="flex-row items-center justify-between py-2 border-t border-neutral-100 dark:border-neutral-700 mt-2 pt-3">
        <View className="flex-1">
          <Text className="text-sm text-neutral-500">Mot de passe</Text>
          {isLoadingPassword ? (
            <ActivityIndicator size="small" className="mt-1" />
          ) : canShowPassword ? (
            <Text className="text-base text-neutral-900 dark:text-neutral-50 mt-0.5">
              {showPassword ? storedPassword : "••••••••••••"}
            </Text>
          ) : (
            <Text className="text-base text-neutral-400 dark:text-neutral-500 mt-0.5">
              Connectez-vous une fois pour rendre votre mot de passe visible ici
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          {canShowPassword && (
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#64748B" />
            </Pressable>
          )}
          <Pressable onPress={() => setShowChangeModal(true)} hitSlop={8}>
            <Ionicons name="pencil-outline" size={20} color="#64748B" />
          </Pressable>
        </View>
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={showChangeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowChangeModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-neutral-800 rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                Changer le mot de passe
              </Text>
              <Pressable onPress={() => setShowChangeModal(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            {/* New Password Input */}
            <Text className="text-sm text-neutral-500 mb-2">Nouveau mot de passe</Text>
            <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-700 rounded-lg px-3 mb-4">
              <TextInput
                className="flex-1 py-3 text-neutral-900 dark:text-neutral-50"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                placeholder="Entrez le nouveau mot de passe"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowNewPassword(!showNewPassword)} hitSlop={8}>
                <Ionicons 
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#64748B" 
                />
              </Pressable>
            </View>

            {/* Confirm Password Input */}
            <Text className="text-sm text-neutral-500 mb-2">Confirmer le mot de passe</Text>
            <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-700 rounded-lg px-3 mb-6">
              <TextInput
                className="flex-1 py-3 text-neutral-900 dark:text-neutral-50"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                placeholder="Confirmez le mot de passe"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={8}>
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#64748B" 
                />
              </Pressable>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleChangePassword}
              disabled={isChangingPassword}
              className="bg-primary py-3 rounded-lg items-center"
            >
              {isChangingPassword ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Enregistrer</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}
