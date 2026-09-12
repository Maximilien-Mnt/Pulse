import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useClubMembers, type ClubMember } from '@/hooks/useClubMembers';
import { useJoinRequestStatus, type JoinRequestStatus } from '@/hooks/useJoinRequestStatus';
import { useToggleFavorite } from '@/hooks/useToggleFavorite';
import type { Club, EventRow } from '@/types';
import Toast from 'react-native-toast-message';
import { t } from '@/hooks/useTranslation';

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
  club: Club | null | undefined;
  clubLoading: boolean;
  creator: CreatorProfile | undefined;
  members: ClubMember[];
  upcomingEvents: EventRow[];
  pastEvents: EventRow[];
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
  const queryClient = useQueryClient();

  const { data: club, isLoading: clubLoading } = useQuery({
    queryKey: ['club', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId!)
        .maybeSingle();
      if (error) throw error;
      return data as Club | null;
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
        .select('*')
        .eq('club_id', clubId!)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const now = useMemo(() => new Date(), []);
  const upcomingEvents = useMemo(
    () => events.filter((e) => new Date(e.start_date) >= now),
    [events, now],
  );
  const pastEvents = useMemo(
    () => events.filter((e) => new Date(e.start_date) < now),
    [events, now],
  );

  const { data: joinStatus } = useJoinRequestStatus('club', clubId ?? null);

  const {
    isFavorited,
    favCount,
    isPending: isFavPending,
    toggle: toggleFavorite,
  } = useToggleFavorite({
    entityType: 'club',
    id: clubId ?? '',
    includeCount: true,
  });

  const isCreator = useMemo(
    () => !!userId && !!club?.created_by && userId === club.created_by,
    [userId, club?.created_by],
  );
  const isMember = useMemo(() => !!joinStatus?.isMember, [joinStatus?.isMember]);

  const joinMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('auth');
      if (club?.is_private) {
        const { error } = await supabase.from('club_join_requests').insert({
          club_id: clubId!,
          user_id: userId,
          status: 'pending',
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('club_members').insert({
          club_id: clubId!,
          user_id: userId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['join-request-status', 'club', clubId] });
      void queryClient.invalidateQueries({ queryKey: ['club-members', clubId] });
      void queryClient.invalidateQueries({ queryKey: ['club-all-members', clubId] });
      void queryClient.invalidateQueries({ queryKey: ['club', clubId] });
      Toast.show({
        type: 'success',
        text1: club?.is_private ? t('clubJoin.requestSent') : t('clubs.joinSuccess'),
      });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: t('common.error') });
    },
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
    isFavorited,
    favCount,
    isFavPending,
    toggleFavorite,
    joinMut: {
      mutate: joinMut.mutate,
      isPending: joinMut.isPending,
    },
  };
}
