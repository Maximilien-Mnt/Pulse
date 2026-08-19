import { useRouter } from "expo-router";
import { useCreateConversation } from "./useCreateConversation";

/**
 * Hook to start a conversation with a user.
 * Creates or retrieves a 1:1 conversation and navigates to it.
 */
export function useStartConversationWith() {
  const router = useRouter();
  const createConversation = useCreateConversation();

  const startConversation = async (otherUserId: string) => {
    const conversationId = await createConversation.mutateAsync(otherUserId);
    router.push(`/(tabs)/conversations/${conversationId}`);
  };

  return {
    startConversation,
    isPending: createConversation.isPending,
  };
}
