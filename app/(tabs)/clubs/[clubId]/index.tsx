import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeScreen } from '@/components/shared/SafeScreen';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@/stores/authStore';
import { usePostHog } from 'posthog-react-native';
import { useClubMembers } from '@/hooks/useClubMembers';
import { useJoinRequestStatus } from '@/hooks/useJoinRequestStatus';
import { useToggleFavorite } from '@/hooks/useToggleFavorite';
import { LeaveClubSheet } from '@/components/clubs/LeaveClubSheet';
import { DeleteClubSheet } from '@/components/profile/DeleteClubSheet';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { Club, EventRow } from '@/types';
import { useTranslation, t } from '@/hooks/useTranslation';
import { ClubActionHeader } from '@/components/clubs/public/ClubActionHeader';
import { ClubHeroBar } from '@/components/clubs/public/ClubHeroBar';
import { ClubIdentity } from '@/components/clubs/public/ClubIdentity';
import { ClubStatTiles, type StatData } from '@/components/clubs/public/ClubStatTiles';
import { ClubDescriptionCard } from '@/components/clubs/public/ClubDescriptionCard';
import { ClubInfoGrid, type LevelRow } from '@/components/clubs/public/ClubInfoGrid';
import { ClubEventsSection } from '@/components/clubs/public/ClubEventsSection';
import { ClubContactLinks } from '@/components/clubs/public/ClubContactLinks';
import { ClubPhotoGallery } from '@/components/clubs/public/ClubPhotoGallery';
import { ClubMembersPreview } from '@/components/clubs/public/ClubMembersPreview';
import { ClubLoadingSkeleton } from '@/components/clubs/public/ClubLoadingSkeleton';
import { ClubNotFoundState } from '@/components/clubs/public/ClubNotFoundState';
import type { LinkRowData } from '@/components/clubs/public/ClubSharedUI';

export default function ClubDetailScreen() {
  const params = useLocalSearchParams<{ clubId: string; public?: string }>();
  const { clubId } = params;
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const { width: winWidth } = useWindowDimensions();

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

  const [eventsTab, setEventsTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showLeaveSheet, setShowLeaveSheet] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const { data: joinStatus } = useJoinRequestStatus('club', clubId ?? null);

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
  const { isFavorited, favCount, isPending, toggle } = useToggleFavorite({
    entityType: 'club',
    id: clubId ?? '',
    enabled: !!userId && !!clubId,
    optimisticToggle: true,
    extraInvalidationKeys: [['club', clubId]],
  });

  const { data: eventsCount = 0 } = useQuery({
    queryKey: ['club-events-count', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // All events linked to this club (ordered by start_date ascending).
  // Split client-side into upcoming (soonest first) and past (most recent first).
  const { data: allClubEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['club-events', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('club_id', clubId!)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data as EventRow[];
    },
  });
  const nowIso = new Date().toISOString();
  const upcomingEvents = allClubEvents.filter((e) => e.start_date >= nowIso);
  const pastEvents = allClubEvents
    .filter((e) => e.start_date < nowIso)
    .slice()
    .reverse();

  // If the Upcoming tab is empty but past events exist, show Past by default.
  useEffect(() => {
    if (!eventsLoading && eventsTab === 'upcoming' && upcomingEvents.length === 0 && pastEvents.length > 0) {
      setEventsTab('past');
    }
  }, [eventsLoading, eventsTab, upcomingEvents.length, pastEvents.length]);

  const handleToggle = () => void toggle();

  const handleShare = () => {
    void Share.share({ message: club ? club.name : '' });
  };

  const isCreator = !!userId && club?.created_by === userId;

  // Club owners are sent to their dashboard instead of the public detail page,
  // unless they explicitly asked for the public view (?public=true).
  useEffect(() => {
    if (club && !clubLoading && isCreator && !params.public) {
      router.replace(`/(tabs)/clubs/${clubId}/dashboard`);
    }
  }, [club, clubLoading, isCreator, params.public, clubId, router]);

  if (!club) {
    if (clubLoading) {
      return (
        <SafeScreen className='flex-1 bg-neutral-50 dark:bg-[#0A0F1C]'>
          <ClubLoadingSkeleton />
        </SafeScreen>
      );
    }
    return <ClubNotFoundState onBack={() => router.back()} />;
  }
  // ---- Responsive layout ----
  const isWide = winWidth >= 760;   // tablet / landscape: 2-column info grid
  const isMd = winWidth >= 520;     // larger phones
  const contentMax = 920;
  const coverH = isWide ? 280 : winWidth >= 400 ? 220 : 180;
  const galleryW = Math.min(winWidth - 48, 420);

  // ---- Derived data ----
  const cover = club.cover_url ?? club.hero_urls?.[0] ?? club.logo_url;
  const sports: string[] =
    Array.isArray(club.sports) && club.sports.length > 0
      ? club.sports
      : club.sport
        ? [club.sport]
        : [];
  const levels = (club.required_levels ?? {}) as Record<string, string>;
  const levelRows: LevelRow[] = sports
    .map((s) => ({ sport: s, level: levels[s] ?? (sports.length === 1 ? club.required_level : undefined) }))
    .filter((r): r is LevelRow => !!r.level);

  // Short description is always shown under the title: fall back to the long one.
  const shortDesc =
    club.short_description ||
    (club.description ? club.description.replace(/\s+/g, ' ').trim().slice(0, 180) : null);

  const stats: StatData[] = [
    { icon: 'Users', label: 'Membres', value: String(club.member_count ?? 0), onPress: 'members' },
    { icon: 'Heart', label: 'Favoris', value: String(favCount) },
    { icon: 'Calendar', label: 'Événements', value: String(eventsCount) },
    { icon: 'Inbox', label: 'Demandes', value: '0' },
  ];

  const linkRows: LinkRowData[] = [
    club.registration_url && { icon: 'UserPlus', label: "S'inscrire", value: club.registration_url, url: club.registration_url },
    club.website_url && { icon: 'Globe', label: 'Site web', value: club.website_url, url: club.website_url },
    club.contact_email && {
      icon: 'Mail',
      label: 'Email',
      value: club.contact_email,
      url: `mailto:${club.contact_email}?subject=${encodeURIComponent(`Question sur ${club.name}`)}`,
    },
    club.phone_number && { icon: 'Smartphone', label: 'Téléphone', value: club.phone_number, url: `tel:${club.phone_number}` },
    club.instagram_url && { icon: 'Instagram', label: 'Instagram', value: club.instagram_url, url: club.instagram_url },
    club.facebook_url && { icon: 'Facebook', label: 'Facebook', value: club.facebook_url, url: club.facebook_url },
    club.tiktok_url && { icon: 'Music', label: 'TikTok', value: club.tiktok_url, url: club.tiktok_url },
    club.extra_link && { icon: 'Share2', label: 'Autre lien', value: club.extra_link, url: club.extra_link },
  ].filter((r): r is LinkRowData => !!r);

  return (
    <SafeScreen className='flex-1 bg-neutral-50 dark:bg-[#0A0F1C]' edges={['top']}>
      {/* ---- Header: back arrow + "Club" label (+ settings for the creator) ---- */}
      <ClubActionHeader clubId={clubId ?? ''} isCreator={isCreator} />

      <ScrollView
        className='flex-1'
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: '100%', maxWidth: contentMax, alignSelf: 'center' }}
      >
        {/* ---- Hero cover (like & share straddle its bottom-right edge) ---- */}
        <ClubHeroBar
          club={club}
          cover={cover}
          coverH={coverH}
          isFavorited={!!isFavorited}
          favCount={favCount ?? 0}
          isFavPending={isPending}
          onToggle={handleToggle}
          onShare={handleShare}
          isCreator={isCreator}
          joinStatus={joinStatus}
          joinMut={joinMut}
          onCreatorAction={() => setShowDeleteSheet(true)}
        />

        {/* ---- Identity: logo, title, short description, badges ---- */}
        <ClubIdentity club={club} shortDesc={shortDesc} sports={sports} />

        {/* ---- Stat tiles: responsive, wrap to any screen width ---- */}
        <ClubStatTiles
          stats={stats}
          isWide={isWide}
          isMd={isMd}
          onMembersPress={() => router.push(`/(tabs)/clubs/${clubId}/members`)}
        />

        {/* ---- Long description + founder ---- */}
        <ClubDescriptionCard club={club} creator={creator} />

        {/* ---- Info sections: 1 column on phones, 2 columns on wide screens ---- */}
        <ClubInfoGrid club={club} isWide={isWide} levelRows={levelRows} />

        {/* ---- Events: always visible, Upcoming / Past tabs, scrollable list ---- */}
        <ClubEventsSection
          upcomingEvents={upcomingEvents}
          pastEvents={pastEvents}
          eventsTab={eventsTab}
          setEventsTab={setEventsTab}
          eventsLoading={eventsLoading}
        />

        {/* ---- Contact & links (includes social networks) ---- */}
        <ClubContactLinks linkRows={linkRows} />

        {/* ---- Photo gallery ---- */}
        {club.hero_urls && club.hero_urls.length > 1 ? (
          <ClubPhotoGallery
            urls={club.hero_urls}
            itemWidth={galleryW}
            itemHeight={Math.min(Math.round(galleryW * 0.42), 200)}
          />
        ) : null}

        {/* ---- Members: card chips that wrap, creator highlighted, "see all" ---- */}
        <ClubMembersPreview club={club} creator={creator} members={members} />
      </ScrollView>
      <LeaveClubSheet
        visible={showLeaveSheet}
        onClose={() => setShowLeaveSheet(false)}
        clubId={club.id}
        clubName={club.name}
        creatorId={club.created_by ?? ''}
      />
      <DeleteClubSheet
        visible={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        clubId={club.id}
        clubName={club.name}
      />
    </SafeScreen>
  );
}