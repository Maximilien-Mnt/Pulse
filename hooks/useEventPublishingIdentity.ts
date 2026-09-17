import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { fetchEventPublishingClubs } from "@/lib/eventIdentity";

export function useEventPublishingIdentity(userId: string | null, initialClubId?: string) {
  const [publisherClubId, setPublisherClubId] = useState<string | null>(null);
  const initialized = useRef(false);
  const query = useQuery({
    queryKey: ["event-publishing-clubs", userId],
    enabled: !!userId,
    queryFn: fetchEventPublishingClubs,
    staleTime: 0,
  });
  useEffect(() => {
    if (!query.data || initialized.current) return;
    initialized.current = true;
    if (initialClubId && query.data.some((c) => c.id === initialClubId)) setPublisherClubId(initialClubId);
  }, [query.data, initialClubId]);
  const clubs = query.data ?? [];
  const selectedClub = clubs.find((club) => club.id === publisherClubId);
  return {
    ...query, clubs, publisherClubId, setPublisherClubId, selectedClub,
    isValid: !!userId && !query.isPending && !query.isError && (!publisherClubId || !!selectedClub),
  };
}
