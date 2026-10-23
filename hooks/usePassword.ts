import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { logger } from "@/lib/reporting/logger";

/**
 * Hook to manage user password display in Settings.
 *
 * NOTE: Supabase stores only password hashes in `auth.users.encrypted_password`
 * (bcrypt via pgcrypto). Reversible plaintext password storage has been removed
 * because it was an anti-pattern (see `lib/passwordStorage.ts` which was deleted).
 *
 * The password is NEVER stored, logged, or displayed locally. Users must use
 * "Forgot password" or "Change password" if they forget their credential.
 */
export function usePassword() {
  const userId = useAuthStore((s) => s.userId);
  const [isLoading, setIsLoading] = useState(true);

  // Load password from secure storage — now returns null always.
  // This hook is kept for API compatibility; it never reads passwords.
  const loadPassword = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      // Password is never stored locally. Clear any placeholder.
      setIsLoading(false);
    } catch (error) {
      logger.warn("password", "failed to load password");
      setIsLoading(false);
    }
  }, [userId]);

  // Load password on mount or when userId changes
  useEffect(() => {
    loadPassword();
  }, [loadPassword]);

  // Password is never stored locally.
  const storePassword = useCallback(
    async (newPassword: string) => {
      return false; // passwords are never stored locally
    },
    []
  );

  // Clear password — no-op, nothing is stored locally.
  const clearPassword = useCallback(async () => {
    // Nothing to clear
  }, []);

  return {
    password: null, // never stored locally
    isLoading,
    storePassword,
    clearPassword,
    reloadPassword: loadPassword,
  };
}