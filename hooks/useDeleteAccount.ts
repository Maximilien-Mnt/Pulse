import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";
import Toast from "react-native-toast-message";

/**
 * Password-gated HARD delete of the caller's account.
 *
 * Delegates to the SECURITY DEFINER RPC `delete_my_account` so the password
 * is verified server-side and the `auth.users` row is deleted (cascading to
 * all user data). After the RPC succeeds we sign out explicitly, because
 * deleting the auth user server-side does not emit a client auth event — the
 * current session must be invalidated locally so the user is logged out
 * immediately.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.rpc("delete_my_account", {
        p_password: password,
      });
      if (error) throw new Error(error.message);
      // Invalidate the current session right away. The onAuthStateChange
      // listener in useAuth clears the auth store, and AuthGuard redirects
      // to sign-in. This is best-effort: the account is already deleted
      // server-side, so a sign-out failure must not surface as a deletion
      // error.
      await supabase.auth.signOut().catch(() => {});
    },
    onError: (error: Error) => {
      Toast.show({ type: "error", text1: error.message });
    },
  });
}