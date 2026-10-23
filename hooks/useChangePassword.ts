import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import Toast from "react-native-toast-message";
import { t } from "@/hooks/useTranslation";
import { logger } from "@/lib/reporting/logger";
import { reportError } from "@/lib/reporting/errorReport";
import { userFacingMessageFor } from "@/lib/reporting/userMessage";

/**
 * Hook to change the user's password.
 * Updates the password in Supabase (which updates the bcrypt hash).
 *
 * NOTE: The previous implementation also stored the plaintext password
 * locally in SecureStore (see `lib/passwordStorage.ts` which was deleted).
 * Reversible plaintext storage has been removed for security; users must
 * use "Forgot password" if they forget their credential.
 */
export function useChangePassword() {
  const userId = useAuthStore((s) => s.userId);
  const [isLoading, setIsLoading] = useState(false);

  const changePassword = async (newPassword: string): Promise<boolean> => {
    if (!userId) {
      Toast.show({ type: "error", text1: t("auth.mustBeSignedIn") });
      return false;
    }

    setIsLoading(true);

    try {
      // Update password in Supabase (this updates the hash)
      const { error: supabaseError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (supabaseError) {
        reportError(supabaseError, { operation: "auth.changePassword" });
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: userFacingMessageFor(supabaseError),
        });
        setIsLoading(false);
        return false;
      }

      Toast.show({ type: "success", text1: t("actions.changePassword.success") });
      setIsLoading(false);
      return true;
    } catch (error) {
      reportError(error, { operation: "auth.changePassword" });
      Toast.show({ type: "error", text1: t("common.error"), text2: userFacingMessageFor(error) });
      setIsLoading(false);
      return false;
    }
  };

  return {
    changePassword,
    isLoading,
  };
}
