import { useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { usePostHog } from 'posthog-react-native';
import Toast from 'react-native-toast-message';
import { useClubMembers, type ClubMember } from '@/hooks/useClubMembers';
import { useJoinRequestStatus, type JoinRequestStatus } from '@/hooks/useJoinRequestStatus';
import { useToggleFavorite } from '@/hooks/useToggleFavorite';
import {
  CLUB_DETAIL_SELECT,
  CLUB_EVENT_SELECT,
  type ClubDetailRow,
  type ClubEventRow,
} from '@/hooks/clubProjections';
import { t } from '@/hooks/useTranslation';
import { queryClient } from '@/lib/queryClient';

export interface CreatorProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

export interface JoinMutationContract {
  mutate: () => void;
  isPending: boolean;
}

export interface ClubDetailData {
  club: ClubDetailRow | null | undefined;
  clubLoading: boolean;
  creator: CreatorProfile | undefined;
  members: ClubMember[];
  upcomingEvents: ClubEventRow[];
  pastEvents: ClubEventRow[];
  eventsLoading: boolean;
  isCreator: boolean;
  isMember: boolean;
  joinStatus: JoinRequestStatus | undefined;
  isFavorited: boolean;
  favCount: number;
  isFavPending: boolean;
  toggleFavorite: () => void;
  joinMut: JoinMutationContract;
}

/**
 * Aggregates all data queries, mutations, and derived state for the public club
 * detail screen. The route file owns navigation and local UI state; this hook
 * owns the data layer with a clear input (clubId) / output (ClubDetailData) contract.
 */
export function useClubDetail(clubId: string | null): ClubDetailData {
  const userId = useAuthStore((s) => s.userId);
  const posthog = usePostHog();

  const { data: club, isLoading: clubLoading } = useQuery({
    queryKey: ['club', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        // Explicit projection for the club detail header (hooks/clubProjections.ts).
        .select(CLUB_DETAIL_SELECT)
        .eq('id', clubId!)
        .maybeSingle();
      if (error) throw error;
      return data as ClubDetailRow | null;
    },
  });

  const { data: creator } = useQuery({
    queryKey: ['club-creator', club?.created_by],
    enabled: !!club?.created_by,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', club!.created_by as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) return undefined;
      return {
        id: data.id,
        full_name: data.full_name ?? 'Utilisateur',
        username: data.username ?? 'utilisateur',
        avatar_url: data.avatar_url ?? null,
      };
    },
  });

  const { data: members = [] } = useClubMembers(clubId ?? null);

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['club-events', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        // Explicit projection for the events rendered in the club detail (EventCard).
        .select(CLUB_EVENT_SELECT)
        .eq('club_id', clubId!)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ClubEventRow[];
    },
  });

  const nowIso = new Date().toISOString();
  const upcomingEvents = events.filter((e) => e.start_date >= nowIso);
  const pastEvents = events
    .filter((e) => e.start_date < nowIso)
    .slice()
    .reverse();

  const { data: joinStatus } = useJoinRequestStatus('club', clubId ?? null);

  const {
    isFavorited,
    favCount,
    isPending: isFavPending,
    toggle: toggleFavorite,
  } = useToggleFavorite({
    entityType: 'club',
    id: clubId ?? '',
    extraInvalidationKeys: [['club', clubId ?? '']],
  });

  const isCreator = useMemo(
    () => !!userId && !!club?.created_by && userId === club.created_by,
    [userId, club?.created_by],
  );
  const isMember = useMemo(() => !!joinStatus?.isMember, [joinStatus?.isMember]);

  const joinMut = useMutation({
    mutationFn: async () => {
      if (!userId || !club) return;
      const { error } = await supabase
        .from('club_join_requests')
        .insert({ club_id: club.id, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      posthog.capture('club_join_requested', {
        club_id: club?.id ?? null,
        club_name: club?.name ?? null,
        club_sport: club?.sport ?? null,
        is_external: club?.is_external ?? null,
      });
      Toast.show({ type: 'success', text1: t('clubJoin.requestSent') });
      void queryClient.invalidateQueries({ queryKey: ['club', clubId] });
      void queryClient.invalidateQueries({
        queryKey: ['join-request-status', 'club', clubId],
      });
    },
    onError: () => Toast.show({ type: 'error', text1: t('error.clubJoin') }),
  });

  return {
    club,
    clubLoading,
    creator,
    members,
    upcomingEvents,
    pastEvents,
    eventsLoading,
    isCreator,
    isMember,
    joinStatus,
    isFavorited: isFavorited ?? false,
    favCount: favCount ?? 0,
    isFavPending,
    toggleFavorite,
    joinMut: {
      mutate: joinMut.mutate,
      isPending: joinMut.isPending,
    },
  };
}
