import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";

/**
 * Crée ou récupère une conversation 1:1 avec gestion des listes privées/publiques.
 */
export function useContactUser() {
  const userId = useAuthStore((s) => s.userId);

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!userId) throw new Error("auth");
      if (userId === otherUserId) throw new Error("self");

      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("is_public_profile")
        .eq("id", otherUserId)
        .maybeSingle();

      const otherIsPublicList = targetProfile?.is_public_profile ?? false;

      // Use stored procedure to bypass RLS on both conversations (SELECT
      // policy blocks RETURNING) and conversation_participants (INSERT
      // policy requires the caller to already be a participant).
      const { data: convId, error: ce } = await supabase.rpc("create_direct_conversation", {
        p_other_user_id: otherUserId,
        p_other_is_public_list: otherIsPublicList,
      });
      if (ce || !convId) throw ce ?? new Error("conv");
      return convId as string;
    },
    onSuccess: () => {
      // Invalidate all conversation queries to ensure the new conversation appears
      // Use broader invalidation since query key includes publicList filter
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
