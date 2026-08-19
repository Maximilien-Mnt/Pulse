import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  getStoredPassword,
  setStoredPassword,
  clearStoredPassword,
} from "@/lib/passwordStorage";

/**
 * Hook to manage user password storage and retrieval.
 *
 * Note: Supabase doesn't store actual passwords (only hashes), so we store
 * the password locally (in SecureStore on native) during signup, when it's
 * changed, and on sign-in so the user can view it again in Settings.
 */
export function usePassword() {
  const userId = useAuthStore((s) => s.userId);
  const [password, setPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load password from secure storage
  const loadPassword = useCallback(async () => {
    if (!userId) {
      setPassword(null);
      setIsLoading(false);
      return;
    }

    try {
      const storedPassword = await getStoredPassword(userId);
      setPassword(storedPassword);
    } catch (error) {
      console.error("Failed to load password:", error);
      setPassword(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Load password on mount or when userId changes
  useEffect(() => {
    loadPassword();
  }, [loadPassword]);

  // Store password (used after signup or password change)
  const storePassword = useCallback(
    async (newPassword: string) => {
      if (!userId) return false;
      const success = await setStoredPassword(userId, newPassword);
      if (success) {
        setPassword(newPassword);
      }
      return success;
    },
    [userId]
  );

  // Clear password (for logout)
  const clearPassword = useCallback(async () => {
    await clearStoredPassword(userId);
    setPassword(null);
  }, [userId]);

  return {
    password,
    isLoading,
    storePassword,
    clearPassword,
    reloadPassword: loadPassword,
  };
}