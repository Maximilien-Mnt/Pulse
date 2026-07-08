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

      const { data: existing } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .eq("user_id", userId);
      const convIds = [...new Set((existing ?? []).map((e) => e.conversation_id))];

      if (convIds.length) {
        const { data: others } = await supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", convIds)
          .neq("user_id", userId);
        const { data: groupConvs } = await supabase
          .from("conversations")
          .select("id, is_group")
          .in("id", convIds);
        const nonGroupIds = new Set((groupConvs ?? []).filter((c) => !c.is_group).map((c) => c.id));
        const pair = others?.find((o) => o.user_id === otherUserId && nonGroupIds.has(o.conversation_id));
        if (pair) return pair.conversation_id;
      }

      const { data: conv, error: ce } = await supabase.from("conversations").insert({}).select("id").single();
      if (ce || !conv) throw ce ?? new Error("conv");

      const otherIsPublicList = targetProfile?.is_public_profile ?? false;
      const { error: e1 } = await supabase.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: userId, is_public_list: false },
        { conversation_id: conv.id, user_id: otherUserId, is_public_list: otherIsPublicList },
      ]);
      if (e1) throw e1;

      return conv.id as string;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
    },
  });
}
