import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { supabase } from "@/lib/supabase";
import { safeIdSegment } from "@/utils/links";
import type { Message } from "@/types";

/**
 * Reads the full message history for a conversation, builds a
 * JSON-lines file, writes it to cache, and opens the native share sheet.
 */
export async function exportConversationToJsonl(conversationId: string): Promise<void> {
  // conversationId reaches the cache filename below: reject path separators
  // (`../`, `/`, `\`) so the export cannot escape the cache directory.
  const safeId = safeIdSegment(conversationId);
  if (!safeId) throw new Error("Invalid conversation id.");
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", safeId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const messages = (data ?? []) as Message[];

  // Build JSON-lines content
  const lines = messages.map((m) =>
    JSON.stringify({
      type: "message",
      id: m.id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      body: m.body,
      created_at: m.created_at,
      is_deleted: m.is_deleted,
    })
  );

  const content = lines.join("\n");

  // Use the validated id in the filename so `../`/`/`/`\` can never escape
  // the cache directory (safeIdSegment already rejected path separators).
  const uri = `${FileSystem.cacheDirectory}pulse-conversation-${safeId}.jsonl`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/jsonl",
      dialogTitle: "Exporter la conversation",
    });
  } else {
    throw new Error("Le partage n’est pas disponible sur cet appareil.");
  }
}