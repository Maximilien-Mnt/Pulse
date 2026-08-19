import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";

export type JoinRequestStatus = {
  isMember: boolean;
  isPending: boolean;
};

export type MembershipStatus = "none" | "pending" | "member";

export function deriveStatus(isMember: boolean, isPending: boolean): MembershipStatus {
  if (isMember) return "member";
  if (isPending) return "pending";
  return "none";
}

/**
 * Hook to check if the current user is a member or has a pending request
 * for a club or event.
 */
export function useJoinRequestStatus(type: "club" | "event", targetId: string | null) {
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ["join-request-status", type, targetId, userId],
    enabled: !!userId && !!targetId,
    queryFn: async (): Promise<JoinRequestStatus> => {
      if (!userId || !targetId) {
        return { isMember: false, isPending: false };
      }

      if (type === "club") {
        // Check if user is already a member
        const { data: memberData } = await supabase
          .from("club_members")
          .select("*")
          .eq("club_id", targetId)
          .eq("user_id", userId)
          .maybeSingle();

        if (memberData) {
          return { isMember: true, isPending: false };
        }

        // Check if user has a pending join request
        const { data: requestData } = await supabase
          .from("club_join_requests")
          .select("*")
          .eq("club_id", targetId)
          .eq("user_id", userId)
          .eq("status", "pending")
          .maybeSingle();

        return { isMember: false, isPending: !!requestData };
      } else {
        // Check if user is already a participant
        const { data: memberData } = await supabase
          .from("event_participants")
          .select("*")
          .eq("event_id", targetId)
          .eq("user_id", userId)
          .maybeSingle();

        if (memberData) {
          return { isMember: true, isPending: false };
        }

        // Check if user has a pending join request
        const { data: requestData } = await supabase
          .from("event_join_requests")
          .select("*")
          .eq("event_id", targetId)
          .eq("user_id", userId)
          .eq("status", "pending")
          .maybeSingle();

        return { isMember: false, isPending: !!requestData };
      }
    },
  });
}
