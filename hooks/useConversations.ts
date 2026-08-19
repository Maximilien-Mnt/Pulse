import { supabase } from "@/lib/supabase";
import type { Conversation, Profile } from "@/types";
import { useQuery } from "@tanstack/react-query";

export type ConversationListItem = {
  conversation: Conversation;
  pinned: boolean;
  pinned_at: string | null;
  unread: number;
  isPublicList: boolean;
  other: Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;
};

/**
 * Résultat brut du RPC get_my_conversations_full.
 */
type ConversationFullRow = {
  conversation_id: string;
  conversation_created_at: string;
  conversation_updated_at: string;
  conversation_last_message_at: string | null;
  conversation_last_message_preview: string | null;
  conversation_is_group: boolean;
  conversation_group_name: string | null;
  conversation_group_photo_url: string | null;
  pinned: boolean;
  pinned_at: string | null;
  unread_count: number;
  is_public_list: boolean;
  other_user_id: string | null;
  other_full_name: string | null;
  other_username: string | null;
  other_avatar_url: string | null;
};

function mapRow(row: ConversationFullRow): ConversationListItem {
  const conversation: Conversation = {
    id: row.conversation_id,
    created_at: row.conversation_created_at,
    updated_at: row.conversation_updated_at,
    last_message_at: row.conversation_last_message_at,
    last_message_preview: row.conversation_last_message_preview,
    is_group: row.conversation_is_group,
    group_name: row.conversation_group_name,
    group_photo_url: row.conversation_group_photo_url,
  };

  return {
    conversation,
    pinned: row.pinned ?? false,
    pinned_at: row.pinned_at ?? null,
    unread: row.unread_count ?? 0,
    isPublicList: row.is_public_list ?? false,
    other: {
      id: row.other_user_id ?? "",
      full_name: row.other_full_name ?? "Utilisateur",
      username: row.other_username ?? "inconnu",
      avatar_url: row.other_avatar_url ?? null,
    },
  };
}

/**
 * Liste des conversations 1:1 pour l'utilisateur courant.
 * @param publicList - false = privées, true = publiques, undefined = toutes
 */
export function useConversations(userId: string | null, publicList?: boolean) {
  return useQuery({
    queryKey: ["conversations", userId, publicList],
    enabled: !!userId,
    queryFn: async (): Promise<ConversationListItem[]> => {
      const { data, error } = await supabase.rpc("get_my_conversations_full", {
        p_is_public_list: publicList ?? null,
      });

      if (error) {
        console.log("Error fetching conversations via RPC:", error);
        throw error;
      }

      const rows = (data ?? []) as unknown as ConversationFullRow[];

      // Filter out rows without a valid conversation id (defensive)
      const items = rows
        .filter((r) => !!r.conversation_id)
        .map(mapRow);

      return items;
    },
  });
}