import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";

/**
 * Creates a new 1:1 conversation with another user.
 * Returns the conversation ID on success.
 */
export function useCreateConversation() {
  const userId = useAuthStore((s) => s.userId);

  return useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      if (!userId) throw new Error("not_authenticated");
      if (userId === otherUserId) throw new Error("cannot_message_self");

      // Check if the other user is blocked
      // (never let a blocked_users failure block conversation creation)
      let blockedData: { blocker_id: string } | null = null;
      try {
        const res = await supabase
          .from("blocked_users")
          .select("blocker_id")
          .eq("blocker_id", userId)
          .eq("blocked_id", otherUserId)
          .maybeSingle();
        if (!res.error) blockedData = res.data;
      } catch {
        blockedData = null;
      }

      if (blockedData) {
        throw new Error("cannot_message_blocked_user");
      }

      // Always create a new conversation to avoid resurrecting deleted ones.
      // The conversation list will still show any active existing conversation,
      // but starting a new chat from a profile always creates fresh history.

      // Get the other user's profile to check if they have a public list
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("is_public_profile")
        .eq("id", otherUserId)
        .single();

      const otherIsPublicList = targetProfile?.is_public_profile ?? false;

      // Create new conversation using the RPC function
      const { data: conversationId, error: createError } = await supabase.rpc(
        "create_direct_conversation",
        {
          p_other_user_id: otherUserId,
          p_other_is_public_list: otherIsPublicList,
        }
      );

      if (createError || !conversationId) {
        console.error("Failed to create conversation:", createError);
        throw createError ?? new Error("failed_to_create_conversation");
      }

      return conversationId as string;
    },
    onSuccess: (conversationId: string) => {
      // Clear all conversation queries to force fresh fetch
      queryClient.removeQueries({ queryKey: ["conversations"] });
      
      // Also trigger a global refetch
      queryClient.invalidateQueries();
      
      console.log("Conversation created successfully:", conversationId);
    },
    onError: (error: Error) => {
      console.error("Error creating conversation:", error);
    },
  });
}
