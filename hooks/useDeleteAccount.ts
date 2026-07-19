import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";
import Toast from "react-native-toast-message";

/**
 * Password re-auth → soft delete profiles.deleted_at = now().
 * The auth user deletion is handled server-side via a trigger or admin.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (password: string) => {
      // 1. Re-authenticate with password
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Utilisateur non trouvé");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (signInError) throw new Error("Mot de passe incorrect");

      // 2. Soft-delete the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", user.id);
      if (profileError) throw profileError;
    },
    onError: (error: Error) => {
      Toast.show({ type: "error", text1: error.message });
    },
  });
}
