import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { setStoredPassword } from "@/lib/passwordStorage";
import { useAuthStore } from "@/stores/authStore";
import Toast from "react-native-toast-message";
import { t } from "@/hooks/useTranslation";
import { logger } from "@/lib/reporting/logger";
import { reportError } from "@/lib/reporting/errorReport";
import { userFacingMessageFor } from "@/lib/reporting/userMessage";

/**
 * Hook to change the user's password.
 * Updates both Supabase (which updates the hash) and local storage.
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

      // Update secure local storage with the new password
      try {
        await setStoredPassword(userId, newPassword);
      } catch (storageError) {
        logger.warn("auth", "failed to update secure password storage");
        // Don't fail the operation if storage fails - password is still changed in Supabase
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
