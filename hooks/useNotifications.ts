import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/types";
import { t } from "@/hooks/useTranslation";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

type GetNotificationsParams = {
  limit?: number;
  offset?: number;
  status?: "pending" | "processed" | "all";
};

const JOIN_REQUEST_TYPES = new Set(["club_join_request", "event_join_request"]);

export function useNotifications({ limit = 50, offset = 0, status = "all" }: GetNotificationsParams = {}) {
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ["notifications", userId, limit, offset, status],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      let filtered = data ?? [];
      if (status !== "all") {
        filtered = filtered.filter((n) => {
          const isPending = n.read_at === null && JOIN_REQUEST_TYPES.has(n.type);
          return status === "pending" ? isPending : !isPending;
        });
      }

      return filtered;
    },
  });
}

export function useUnreadNotificationsCount() {
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ["notifications-unread-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);

      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

type JoinRequestAction = "accept" | "refuse";

export function useJoinRequestAction() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  return useMutation({
    mutationFn: async ({
      action,
      requestId,
      type,
      targetId,
      requesterId,
      message,
    }: {
      action: JoinRequestAction;
      requestId: string;
      type: "club" | "event";
      targetId: string;
      requesterId: string;
      /** Optional explanation shown to the requester when refusing */
      message?: string;
    }) => {
      if (!userId) throw new Error("auth");

      const table = type === "club" ? "club_join_requests" : "event_join_requests";
      const status = action === "accept" ? "accepted" : "refused";

      const { error } = await supabase
        .from(table)
        .update({ status })
        .eq("id", requestId)
        .eq("status", "pending");

      if (error) throw error;

      // If accepted, add the user as member/participant
      if (action === "accept") {
        if (type === "club") {
          const { error: memberErr } = await supabase
            .from("club_members")
            .upsert({ club_id: targetId, user_id: requesterId, role: "member" }, { onConflict: "club_id,user_id" });
          if (memberErr) throw memberErr;
        } else {
          const { error: partErr } = await supabase
            .from("event_participants")
            .upsert({ event_id: targetId, user_id: requesterId, status: "going" }, { onConflict: "event_id,user_id" });
          if (partErr) throw partErr;
        }
      }

      // Notify the requester
      const notifType = type === "club" ? "club_join_request_response" : "event_join_request_response";
      const title = action === "accept"
        ? t("notifications.toast.accepted")
        : t("notifications.toast.refused");
      const bodyText = action === "accept"
        ? t("invitations.acceptedBody")
        : message?.trim()
          ? message.trim()
          : t("invitations.refusedBody");

      // Build notification data - include owner_id for refused so user can contact them
      const notificationData: Record<string, string> = {
        request_id: requestId,
        target_id: targetId,
        type,
      };
      if (action === "refuse") {
        notificationData.owner_id = userId;
        // Preserve the optional explanation so the requester can read it from the notification
        if (message?.trim()) {
          notificationData.message = message.trim();
        }
      }

      const { error: notifErr } = await supabase.from("notifications").insert({
        user_id: requesterId,
        type: `${notifType}_${action}`,
        title,
        body: bodyText,
        data: notificationData as any,
        read_at: null,
      });

      if (notifErr) throw notifErr;

      return { ok: true };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}
