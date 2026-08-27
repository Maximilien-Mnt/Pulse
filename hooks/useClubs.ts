import { supabase } from "@/lib/supabase";
import type { Club } from "@/types";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE = 20;

export type ClubListFilters = {
  sports: string[];
  location: string;
  requiredLevel: string;
  internalOnly: boolean;
  externalOnly: boolean;
  favoritesOnly: boolean;
  sort: string;
  radiusKm?: number;
  userLat?: number;
  userLon?: number;
};

const defaultFilters: ClubListFilters = {
  sports: [],
  location: "",
  requiredLevel: "",
  internalOnly: false,
  externalOnly: false,
  favoritesOnly: false,
  sort: "relevance",
  radiusKm: 10,
};

/**
 * Liste paginée des clubs avec filtres côté serveur (PostgREST) + client pour favoris.
 */
export function useClubs(filters: ClubListFilters, userId: string | null) {
  const f = filters ?? defaultFilters;
  return useInfiniteQuery<Club[]>({
    queryKey: ["clubs", f, userId],
    initialPageParam: 0 as number,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE ? undefined : allPages.length,
    queryFn: async ({ pageParam }): Promise<Club[]> => {
      const from = (pageParam as number) * PAGE;
      const to = from + PAGE - 1;

      // Handle "nearby" sort using RPC function
      if (f.sort === "nearby" && f.userLat && f.userLon) {
        try {
          const { data, error } = await (supabase.rpc as any)("get_nearby_clubs", {
            p_lat: f.userLat,
            p_lon: f.userLon,
            p_radius_km: f.radiusKm ?? 10,
            p_limit: PAGE,
            p_offset: from,
          });

          if (error) throw error;
          const rows = ((data ?? []) as any).map((row: any) => ({
            ...row,
            creator: row.creator
              ? {
                  id: row.creator.id,
                  full_name: row.creator.full_name ?? "Utilisateur",
                  username: row.creator.username ?? "utilisateur",
                  avatar_url: row.creator.avatar_url ?? null,
                }
              : undefined,
          })) as Club[];

          if (f.favoritesOnly && userId) {
            const ids = rows.map((c) => c.id);
            if (!ids.length) return rows;
            const { data: favs, error: fe } = await supabase
              .from("club_favorites")
              .select("club_id")
              .eq("user_id", userId)
              .in("club_id", ids);
            if (fe) throw fe;
            const set = new Set((favs ?? []).map((x) => x.club_id));
            return rows.filter((c) => set.has(c.id));
          }

          return rows;
        } catch (err) {
          console.warn("[useClubs] nearby fetch failed", err);
          return [];
        }
      }

      // Standard query with PostgREST
      let q = supabase
        .from("clubs")
        .select(
          `
          *
        `
        );

      if (f.sports.length) q = q.in("sport", f.sports);
      if (f.location.trim()) {
        const v = `%${f.location.trim()}%`;
        q = q.ilike("city", v);
      }
      if (f.requiredLevel.trim()) q = q.eq("required_level", f.requiredLevel);
      if (f.internalOnly && !f.externalOnly) q = q.eq("is_external", false);
      if (f.externalOnly && !f.internalOnly) q = q.eq("is_external", true);

      switch (f.sort) {
        case "name_asc":
          q = q.order("name", { ascending: true });
          break;
        case "name_desc":
          q = q.order("name", { ascending: false });
          break;
        case "members_desc":
          q = q.order("member_count", { ascending: false });
          break;
        case "members_asc":
          q = q.order("member_count", { ascending: true });
          break;
        case "recent":
          q = q.order("created_at", { ascending: false });
          break;
        case "oldest":
          q = q.order("created_at", { ascending: true });
          break;
        case "founded_desc":
          q = q.order("founded_date", { ascending: false });
          break;
        case "founded_asc":
          q = q.order("founded_date", { ascending: true });
          break;
        case "sport_asc":
          q = q.order("sport", { ascending: true });
          break;
        default:
          q = q.order("member_count", { ascending: false });
      }

      const { data, error } = await q.range(from, to);
      if (error) throw error;
      const creatorIds = Array.from(
        new Set((data ?? []).map((row: any) => row.created_by).filter((id: any): id is string => typeof id === "string" && !!id))
      );
      const creatorMap = new Map<string, any>();
      if (creatorIds.length) {
        const { data: creators, error: creatorsError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", creatorIds);
        if (creatorsError) throw creatorsError;
        (creators ?? []).forEach((profile: any) => {
          creatorMap.set(profile.id, {
            id: profile.id,
            full_name: profile.full_name ?? "Utilisateur",
            username: profile.username ?? "utilisateur",
            avatar_url: profile.avatar_url ?? null,
          });
        });
      }
      const rows = ((data ?? []) as any).map((row: any) => ({
        ...row,
        creator: row.created_by ? creatorMap.get(row.created_by) ?? undefined : undefined,
      })) as Club[];

      if (f.favoritesOnly && userId) {
        const ids = rows.map((c) => c.id);
        if (!ids.length) return rows;
        const { data: favs, error: fe } = await supabase
          .from("club_favorites")
          .select("club_id")
          .eq("user_id", userId)
          .in("club_id", ids);
        if (fe) throw fe;
        const set = new Set((favs ?? []).map((x) => x.club_id));
        return rows.filter((c) => set.has(c.id));
      }

      return rows;
    },
  });
}