import { supabase } from "@/lib/supabase";
import type { Conversation, Profile } from "@/types";
import { useQuery } from "@tanstack/react-query";

export type ConversationListItem = {
  conversation: Conversation;
  pinned: boolean;
  unread: number;
  other: Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;
};

/**
 * Liste des conversations 1:1 pour l'utilisateur courant.
 */
export function useConversations(userId: string | null) {
  return useQuery({
    queryKey: ["conversations", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ConversationListItem[]> => {
      const { data: mine, error: e1 } = await supabase
        .from("conversation_participants")
        .select("conversation_id, pinned, unread_count, last_read_at")
        .eq("user_id", userId!)
        .is("left_at", null);
      if (e1) throw e1;
      const convIds = (mine ?? []).map((m) => m.conversation_id);
      if (!convIds.length) return [];
      const { data: convs, error: e2 } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convIds);
      if (e2) throw e2;
      const { data: others, error: e3 } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds)
        .neq("user_id", userId!);
      if (e3) throw e3;
      const otherUserIds = [...new Set((others ?? []).map((o) => o.user_id))];
      const { data: profs, error: e4 } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", otherUserIds);
      if (e4) throw e4;
      const profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p as Profile]));
      const otherByConv: Record<string, string> = {};
      for (const row of others ?? []) {
        otherByConv[row.conversation_id] = row.user_id;
      }
      const mineMap = Object.fromEntries((mine ?? []).map((m) => [m.conversation_id, m]));
      const items: ConversationListItem[] = (convs ?? [])
        .filter((c) => !!otherByConv[c.id])
        .map((c) => {
          const oid = otherByConv[c.id]!;
          const other = profMap[oid] ?? {
            id: oid,
            full_name: "Utilisateur",
            username: "inconnu",
            avatar_url: null,
          };
        const meta = mineMap[c.id];
        return {
          conversation: c as Conversation,
          pinned: meta?.pinned ?? false,
          unread: meta?.unread_count ?? 0,
          other,
        };
      });
      items.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const ta = a.conversation.last_message_at ?? a.conversation.updated_at;
        const tb = b.conversation.last_message_at ?? b.conversation.updated_at;
        return new Date(tb).getTime() - new Date(ta).getTime();
      });
      return items;
    },
  });
}
