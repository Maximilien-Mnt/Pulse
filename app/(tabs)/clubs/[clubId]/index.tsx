import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Share, View, Text, ActivityIndicator, FlatList, useWindowDimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import { SafeScreen } from '@/components/shared/SafeScreen';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@/stores/authStore';
import { queryClient } from '@/lib/queryClient';
import { usePostHog } from 'posthog-react-native';
import { getCountryDisplay } from '@/utils/countries';
import { SPORTS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { InvitationButton } from '@/components/shared/InvitationButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { BackButton } from '@/components/ui/BackButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { MembersListSheet, type Member } from '@/components/shared/MembersListSheet';
import { useClubMembers } from '@/hooks/useClubMembers';
import { useJoinRequestStatus } from '@/hooks/useJoinRequestStatus';
import { useLeaveClub } from '@/hooks/useLeaveClub';
import { LeaveClubSheet } from '@/components/clubs/LeaveClubSheet';
import { DeleteClubSheet } from '@/components/profile/DeleteClubSheet';
import { supabase } from '@/lib/supabase';
import type { Club, EventRow } from '@/types';
import { useTranslation, t } from '@/hooks/useTranslation';
import { ClubOpeningHoursDisplay } from '@/components/clubs/ClubOpeningHours';
import { EventCard } from '@/components/events/EventCard';
import { sanitizeOpeningHours } from '@/lib/openingHours';

const CARD = 'bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700';
const DIVIDER = 'border-b border-neutral-100 dark:border-neutral-700';

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
  const { data: allMembers = [], isLoading: loadingAllMembers } = useQuery({
    queryKey: ['club-all-members', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_members')
        .select('user_id')
        .eq('club_id', clubId!);
      if (error) throw error;
      const userIds = Array.from(
        new Set(
          (data ?? [])
            .map((row: any) => row.user_id)
            .filter((id: any): id is string => typeof id === 'string' && !!id)
        )
      );
      const profileMap = new Map<string, any>();
      if (userIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', userIds);
        if (profilesError) throw profilesError;
        (profiles ?? []).forEach((profile: any) => {
          profileMap.set(profile.id, profile);
        });
      }
      return (data ?? []).map((row: any) => {
        const profile = profileMap.get(row.user_id);
        return {
          user_id: row.user_id,
          full_name: profile?.full_name ?? t('common.userNotFound'),
          username: profile?.username ?? 'user',
          avatar_url: profile?.avatar_url ?? null,
        };
      }) as Member[];
    },
  });

  const [showMembersList, setShowMembersList] = useState(false);
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
  const { data: isFavorited } = useQuery({
    queryKey: ['club-favorite', clubId],
    enabled: !!userId && !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_favorites')
        .select('club_id')
        .eq('user_id', userId!)
        .eq('club_id', clubId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const { data: favoritesCount = 0 } = useQuery({
    queryKey: ['club-favorites-count', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('club_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId!);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 5000,
  });

  // Number of events linked to this club (shown in the stat tiles).
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

  // Upcoming events linked to this club (ordered by start_date ascending).
  const { data: clubEvents = [] } = useQuery({
    queryKey: ['club-events', clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('club_id', clubId!)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !clubId) return;
      if (isFavorited) {
        await supabase.from('club_favorites').delete().eq('user_id', userId).eq('club_id', clubId);
      } else {
        await supabase.from('club_favorites').insert({ user_id: userId, club_id: clubId });
      }
    },
    onMutate: async () => {
      const prevIsFav = queryClient.getQueryData(['club-favorite', clubId]);
      const prevCount = queryClient.getQueryData(['club-favorites-count', clubId]) as number | undefined;
      queryClient.setQueryData(['club-favorite', clubId], true);
      queryClient.setQueryData(['club-favorites-count', clubId], (prevCount ?? 0) + 1);
      return { prevIsFav, prevCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevIsFav !== undefined) {
        queryClient.setQueryData(['club-favorite', clubId], context.prevIsFav);
      }
      if (context?.prevCount !== undefined) {
        queryClient.setQueryData(['club-favorites-count', clubId], context.prevCount);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['club-favorite', clubId] });
      void queryClient.invalidateQueries({ queryKey: ['club-favorites-count', clubId] });
      void queryClient.invalidateQueries({ queryKey: ['clubs'] });
      void queryClient.invalidateQueries({ queryKey: ['club', clubId] });
    },
  });
  const handleToggle = () => {
    void toggleFavoriteMutation.mutate();
  };

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
          <View className='px-4 pt-4 gap-3'>
            <Skeleton className='w-full h-48 rounded-2xl' />
            <View className='flex-row items-center gap-3'>
              <Skeleton className='w-[72px] h-[72px] rounded-3xl' />
              <View className='flex-1 gap-2'>
                <Skeleton className='w-3/4 h-7 rounded-lg' />
                <Skeleton className='w-1/2 h-4 rounded-md' />
              </View>
            </View>
            <Skeleton className='w-full h-24 rounded-2xl' />
            <Skeleton className='w-full h-12 rounded-xl' />
          </View>
        </SafeScreen>
      );
    }
    return (
      <SafeScreen className='flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1C]'>
        <Icon name='AlertCircle' size={32} color='text-tertiary' />
        <PulseText variant='body' className='mt-3 text-neutral-500'>
          {t('clubs.notFound')}
        </PulseText>
        <Button title={t('clubs.back')} variant='secondary' className='mt-4' onPress={() => router.back()} />
      </SafeScreen>
    );
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
  const levelRows = sports
    .map((s) => ({ sport: s, level: levels[s] ?? (sports.length === 1 ? club.required_level : undefined) }))
    .filter((r): r is { sport: string; level: string } => !!r.level);

  // Short description is always shown under the title: fall back to the long one.
  const shortDesc =
    club.short_description ||
    (club.description ? club.description.replace(/\s+/g, ' ').trim().slice(0, 180) : null);

  const stats = [
    { icon: 'Users', label: 'Membres', value: String(club.member_count ?? 0), onPress: 'members' },
    { icon: 'Heart', label: 'Favoris', value: String(favoritesCount) },
    { icon: 'Calendar', label: 'Événements', value: String(eventsCount) },
    { icon: 'Inbox', label: 'Demandes', value: '0' },
  ];

  const linkRows = [
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
  ].filter((r): r is { icon: string; label: string; value: string; url: string } => !!r);

  return (
    <SafeScreen className='flex-1 bg-neutral-50 dark:bg-[#0A0F1C]' edges={['top']}>
      {/* ---- Header: back arrow + "Club" label (+ settings for the creator) ---- */}
      <View className='flex-row items-center gap-2 px-4 py-2 border-b border-neutral-100 dark:border-neutral-800'>
        <BackButton useInAppSession fallbackRoute="/(tabs)/profile" />
        <PulseText variant='h2' className='flex-1' numberOfLines={1}>
          {t('clubs.public')}
        </PulseText>
        {isCreator ? (
          <PressableScale
            onPress={() => router.push(`/(tabs)/clubs/${clubId}/settings`)}
            hitSlop={8}
            scaleOnPress={0.9}
            scaleOnHover={1.08}
            className='w-11 h-11 rounded-full bg-primary/10 items-center justify-center active:bg-primary/20'
            accessibilityRole='button'
            accessibilityLabel={t('clubs.edit')}
          >
            <Icon name='Settings' size={22} color='primary' />
          </PressableScale>
        ) : null}
      </View>

      <ScrollView
        className='flex-1'
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: '100%', maxWidth: contentMax, alignSelf: 'center' }}
      >
        {/* ---- Hero cover (like & share straddle its bottom-right edge) ---- */}
        <View className='px-4 pt-3'>
          <View className='relative'>
            {cover ? (
              <Image source={{ uri: cover }} className='w-full rounded-2xl' style={{ height: coverH }} contentFit='cover' />
            ) : (
              <View
                className='w-full rounded-2xl bg-neutral-200 dark:bg-neutral-700 items-center justify-center'
                style={{ height: coverH - 40 }}
              >
                <Icon name='Image' size={32} color='text-tertiary' />
              </View>
            )}
            {/* Big, clear like & share buttons — far right, on the cover/content limit */}
            <View className='absolute right-3 -bottom-6 flex-row items-center gap-2'>
              <View>
                <PressableScale
                  onPress={handleToggle}
                  scaleOnPress={0.85}
                  scaleOnHover={1.1}
                  disabled={toggleFavoriteMutation.isPending}
                  accessibilityRole='button'
                  accessibilityLabel={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  accessibilityState={{ selected: !!isFavorited, disabled: toggleFavoriteMutation.isPending }}
                  hitSlop={6}
                  className='w-12 h-12 rounded-full bg-white dark:bg-neutral-800 items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm active:bg-primary/15'
                >
                  <Icon name='Heart' size={24} color={isFavorited ? 'primary' : 'text-secondary'} active={!!isFavorited} />
                </PressableScale>
                {favoritesCount > 0 ? (
                  <View
                    className='absolute -bottom-1 -right-1 rounded-full bg-primary items-center justify-center border-2 border-white dark:border-[#0A0F1C]'
                    style={{ minWidth: 20, height: 20, paddingHorizontal: 4 }}
                  >
                    <PulseText variant='caption' className='text-white font-semibold tabular-nums' style={{ fontSize: 10 }} numberOfLines={1}>
                      {favoritesCount > 99 ? '99+' : favoritesCount}
                    </PulseText>
                  </View>
                ) : null}
              </View>
              <PressableScale
                onPress={handleShare}
                scaleOnPress={0.85}
                scaleOnHover={1.1}
                accessibilityRole='button'
                accessibilityLabel='Partager'
                hitSlop={6}
                className='w-12 h-12 rounded-full bg-white dark:bg-neutral-800 items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm active:bg-primary/15'
              >
                <Icon name='Share2' size={22} color='primary' />
              </PressableScale>
            </View>
          </View>
        </View>

        {/* ---- Identity: logo, title, short description, badges + big action buttons ---- */}
        <View className='px-5 mb-5'>
          <View className='-mt-10 self-start'>
            {club.logo_url ? (
              <PressableScale scaleOnHover={1.08} hoverOnly>
                <Image
                  source={{ uri: club.logo_url }}
                  className='w-20 h-20 rounded-3xl bg-white dark:bg-neutral-800'
                  style={{ borderWidth: 4, borderColor: '#fff' }}
                  contentFit='cover'
                />
              </PressableScale>
            ) : (
              <PressableScale scaleOnHover={1.08} hoverOnly>
                <View
                  className='w-20 h-20 rounded-3xl bg-neutral-200 dark:bg-neutral-700 items-center justify-center'
                  style={{ borderWidth: 4, borderColor: '#fff' }}
                >
                  <Icon name='Trophy' size={24} color='text-tertiary' />
                </View>
              </PressableScale>
            )}
          </View>
          <View className='mt-2 flex-1 min-w-0'>
            <PulseText variant='h1' numberOfLines={2}>
              {club.name}
            </PulseText>
            {shortDesc ? (
              <PulseText variant='body' className='text-neutral-500 mt-1.5' numberOfLines={3}>
                {shortDesc}
              </PulseText>
            ) : null}
            <View className='flex-row flex-wrap gap-2 mt-3 items-center'>
              {sports.map((s) => (
                <SportBadge key={s} sport={s} />
              ))}
              <SourcePill isExternal={club.is_external} />
              {club.is_private != null ? (
                <Pill
                  icon={club.is_private ? 'Lock' : 'Globe'}
                  label={club.is_private ? 'Privé' : 'Public'}
                  color='#4A4F59'
                  bgClass='bg-neutral-100 dark:bg-neutral-700'
                />
              ) : null}
            </View>
          </View>
        </View>
        {/* ---- Stat tiles: responsive, wrap to any screen width ---- */}
        <View className='flex-row flex-wrap gap-3 px-4 mb-5'>
          {stats.map((s) => (
            <StatTile
              key={s.label}
              icon={s.icon}
              label={s.label}
              value={s.value}
              minWidth={isMd ? 150 : 132}
              growBasis={isWide ? '23%' : '47%'}
              onPress={s.onPress === 'members' ? () => setShowMembersList(true) : undefined}
            />
          ))}
        </View>

        {/* ---- Long description + founder ---- */}
        {club.description ? (
          <Section title='Description' className='px-4 mb-5'>
            <View className={'p-4 ' + CARD}>
              <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100 leading-relaxed'>
                {club.description}
              </PulseText>
              {creator ? (
                <PressableScale
                  className='flex-row items-center gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700 self-start'
                  scaleOnPress={0.97}
                  onPress={() => router.push(`/profile/${creator.id}`)}
                  accessibilityRole='button'
                  accessibilityLabel={`Fondé par ${creator.full_name}, voir le profil`}
                >
                  <Avatar uri={creator.avatar_url} size={28} />
                  <PulseText variant='caption' className='text-neutral-500'>
                    Fondé par{' '}
                    <PulseText variant='caption' className='text-primary font-semibold'>
                      {creator.full_name}
                    </PulseText>
                  </PulseText>
                </PressableScale>
              ) : null}
            </View>
          </Section>
        ) : null}

        {/* ---- Info sections: 1 column on phones, 2 columns on wide screens ---- */}
        <View className='flex-row flex-wrap gap-3 px-4 mb-5'>
          {/* Location */}
          {(club.city || club.country || club.address || club.postal_code) ? (
            <View style={{ flexGrow: 1, flexBasis: isWide ? '47%' : '100%' }} className={'p-4 ' + CARD}>
              <View className='flex-row items-center gap-2 mb-3'>
                <Icon name='MapPin' size={16} color='primary' />
                <PulseText variant='overline' className='text-neutral-400'>Localisation</PulseText>
              </View>
              <View className='flex-row items-center gap-2'>
                <Text className='text-base'>{club.country ? getCountryDisplay(club.country).split(' ')[0] : ''}</Text>
                <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100 font-medium'>
                  {[club.city, club.country ? getCountryDisplay(club.country).replace(/^[^A-Za-z]+/, '') : null]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </PulseText>
              </View>
              {club.address || club.postal_code ? (
                <PulseText variant='body' className='text-neutral-500 mt-1'>
                  {[club.address, club.postal_code].filter(Boolean).join(', ')}
                </PulseText>
              ) : null}
            </View>
          ) : null}

          {/* Ligue / Division */}
          {club.league ? (
            <View style={{ flexGrow: 1, flexBasis: isWide ? '47%' : '100%' }} className={'p-4 ' + CARD}>
              <View className='flex-row items-center gap-2 mb-2'>
                <Icon name='Trophy' size={16} color='primary' />
                <PulseText variant='overline' className='text-neutral-400'>{t('clubs.league')}</PulseText>
              </View>
              <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100 font-medium'>
                {club.league}
              </PulseText>
            </View>
          ) : null}

          {/* Foundation date */}
          {club.founded_date ? (
            <View style={{ flexGrow: 1, flexBasis: isWide ? '47%' : '100%' }} className={'p-4 ' + CARD}>
              <View className='flex-row items-center gap-2 mb-2'>
                <Icon name='Calendar' size={16} color='primary' />
                <PulseText variant='overline' className='text-neutral-400'>{t('clubs.foundedDate')}</PulseText>
              </View>
              <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100 font-medium'>
                {String(club.founded_date)}
              </PulseText>
            </View>
          ) : null}

          {/* Details — age range only */}
          {(club.age_min != null || club.age_max != null) ? (
            <View style={{ flexGrow: 1, flexBasis: isWide ? '47%' : '100%' }} className={'p-4 ' + CARD}>
              <View className='flex-row items-center gap-2 mb-1'>
                <Icon name='Info' size={16} color='primary' />
                <PulseText variant='overline' className='text-neutral-400'>{t('common.details')}</PulseText>
              </View>
              <InfoRow
                icon='Users'
                label={t('clubs.dashboard.ageRange')}
                value={`${club.age_min ?? '—'} – ${club.age_max ?? '—'} ans`}
              />
            </View>
          ) : null}
          {/* Required level per sport */}
          {levelRows.length > 0 ? (
            <View style={{ flexGrow: 1, flexBasis: isWide ? '47%' : '100%' }} className={'p-4 ' + CARD}>
              <View className='flex-row items-center gap-2 mb-2'>
                <Icon name='Activity' size={16} color='primary' />
                <PulseText variant='overline' className='text-neutral-400'>Niveau requis</PulseText>
              </View>
              {levelRows.map((r) => (
                <View key={r.sport} className='flex-row items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0'>
                  <SportBadge sport={r.sport} />
                  <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100 font-medium'>
                    {r.level}
                  </PulseText>
                </View>
              ))}
            </View>
          ) : null}

          {/* Opening hours */}
          {sanitizeOpeningHours(club.opening_hours).length > 0 ? (
            <View style={{ flexGrow: 1, flexBasis: '100%' }} className={'p-4 ' + CARD}>
              <View className='flex-row items-center gap-2 mb-2'>
                <Icon name='Clock' size={16} color='primary' />
                <PulseText variant='overline' className='text-neutral-400'>{t('clubs.hours.title')}</PulseText>
              </View>
              <ClubOpeningHoursDisplay slots={club.opening_hours ?? []} />
            </View>
          ) : null}
        </View>

        {/* ---- Contact & links (includes social networks) ---- */}
        {linkRows.length > 0 ? (
          <Section title='Contact & liens' className='px-4 mb-5'>
            <View className={CARD + ' overflow-hidden'}>
              {linkRows.map((row, i) => (
                <LinkRow
                  key={row.label}
                  icon={row.icon}
                  label={row.label}
                  value={row.value}
                  url={row.url}
                  isLast={i === linkRows.length - 1}
                />
              ))}
            </View>
          </Section>
        ) : null}

        {/* ---- Photo gallery ---- */}
        {club.hero_urls && club.hero_urls.length > 1 ? (
          <Section title='Galerie photo' className='px-4 mb-5'>
            <ClubPhotoGallery urls={club.hero_urls} itemWidth={galleryW} itemHeight={Math.min(Math.round(galleryW * 0.42), 200)} />
          </Section>
        ) : null}
        {/* ---- Members: card chips that wrap, creator highlighted, "see all" ---- */}
        {!club.is_external && members.length > 0 ? (
          <Section title={`Membres (${members.length})`} className='px-4 mb-5'>
            <View className='flex-row flex-wrap gap-2.5'>
              {members.map((m) => {
                const isCreatorItem = creator && m.user_id === creator.id;
                return (
                  <PressableScale
                    key={m.user_id}
                    onPress={() => router.push(`/profile/${m.user_id}`)}
                    scaleOnPress={0.95}
                    scaleOnHover={1.04}
                    accessibilityRole='button'
                    accessibilityLabel={`Voir le profil de ${m.full_name}`}
                    className={'flex-row items-center gap-2.5 py-2 pl-2 pr-3.5 rounded-full ' + CARD}
                  >
                    <View className='relative'>
                      <View className={isCreatorItem ? 'p-0.5 rounded-full bg-primary' : ''}>
                        <Avatar uri={m.avatar_url} size={36} />
                      </View>
                      {isCreatorItem ? (
                        <View className='absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-primary items-center justify-center' style={{ width: 18, height: 18 }}>
                          <Icon name='Star' size={10} color='white' filled />
                        </View>
                      ) : null}
                    </View>
                    <View className='min-w-0'>
                      <PulseText variant='caption' className='text-neutral-800 dark:text-neutral-100 font-medium' numberOfLines={1} style={{ maxWidth: 110 }}>
                        {m.full_name}
                      </PulseText>
                      {isCreatorItem ? (
                        <PulseText variant='caption' className='text-primary' numberOfLines={1}>
                          Fondateur
                        </PulseText>
                      ) : null}
                    </View>
                  </PressableScale>
                );
              })}
            </View>
            <PressableScale
              onPress={() => setShowMembersList(true)}
              scaleOnPress={0.97}
              scaleOnHover={1.03}
              accessibilityRole='button'
              accessibilityLabel='Voir tous les membres'
              className='flex-row items-center gap-2 mt-3 self-start px-4 py-2.5 rounded-full bg-primary/10 dark:bg-primary/15 active:bg-primary/25'
            >
              <Icon name='Users' size={16} color='primary' />
              <PulseText variant='body' className='text-primary font-medium'>
                Voir tous les membres
              </PulseText>
              <Icon name='ChevronRight' size={16} color='primary' />
            </PressableScale>
          </Section>
        ) : null}

        {!club.is_external && loadingAllMembers ? (
          <View className='px-4 mb-5 items-center py-3'>
            <ActivityIndicator size='small' color='#3358FF' />
          </View>
        ) : null}

        {/* ---- Actions ---- */}
        <View className='px-4 mb-8 gap-3'>
          {/* External club: source link */}
          {club.is_external && club.source_url ? (
            <PressableScale
              className={'flex-row items-center gap-2 py-3 px-4 ' + CARD}
              scaleOnPress={0.98}
              onPress={() => void WebBrowser.openBrowserAsync(club.source_url!)}
            >
              <Icon name='Globe' size={16} color='primary' />
              <PulseText variant='body' className='text-primary font-medium flex-1'>
                {club.source_name ?? club.source_url}
              </PulseText>
              <Icon name='ArrowRight' size={16} color='text-secondary' />
            </PressableScale>
          ) : null}

          {/* Invitation link for creator of private clubs */}
          <InvitationButton type='club' targetId={club.id} visible={!!isCreator && !!club.is_private} />

          {/* Main action row: copy link + join/quit */}
          <View className='flex-row flex-wrap gap-3'>
            {/* Left: copy invitation link */}
            <View style={{ flex: 1, minWidth: 150 }}>
              <Button
                title={t('clubs.copyInviteLink')}
                icon='Share2'
                variant='secondary'
                className='w-full'
                onPress={async () => {
                  const link = `https://pulse.app/club/${club.id}`;
                  try {
                    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
                      await navigator.clipboard.writeText(link);
                    } else {
                      await Clipboard.setStringAsync(link);
                    }
                    Toast.show({ type: 'success', text1: t('clubs.linkCopied') });
                  } catch {
                    Toast.show({ type: 'error', text1: t('common.error') });
                  }
                }}
              />
            </View>

            {/* Right: join / demand / quit or delete for creator */}
            <View style={{ flex: 1, minWidth: 150 }}>
              {isCreator ? (
                <Button
                  title={t('clubs.dashboard.deleteClub')}
                  variant='destructive'
                  icon='Trash2'
                  className='w-full'
                  onPress={() => setShowDeleteSheet(true)}
                />
              ) : joinStatus?.isMember ? (
                <Button
                  title={t('clubs.leave')}
                  variant='destructive'
                  className='w-full'
                  onPress={() => setShowLeaveSheet(true)}
                />
              ) : joinStatus?.isPending ? (
                <Button
                  title={t('clubJoin.requestSent')}
                  variant='secondary'
                  className='w-full'
                  onPress={() => {}}
                  disabled
                />
              ) : (
                <Button
                  title={club.is_private ? t('clubs.joinRequest') : t('clubs.join')}
                  className='w-full'
                  onPress={() => joinMut.mutate()}
                  loading={joinMut.isPending}
                />
              )}
            </View>
          </View>
        </View>

        {/* ---- Upcoming events (limited height, scrollable) ---- */}
        {clubEvents.length > 0 ? (
          <Section title={t('clubs.upcomingEvents')} className='px-4 mb-8'>
            <View style={{ maxHeight: 320 }}>
              <FlatList
                data={clubEvents}
                keyExtractor={(item) => item.id}
                scrollEnabled
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View className='mb-3'>
                    <EventCard event={item} compact />
                  </View>
                )}
              />
            </View>
          </Section>
        ) : null}
      </ScrollView>
      <MembersListSheet
        visible={showMembersList}
        onClose={() => setShowMembersList(false)}
        members={allMembers}
        type='club'
        targetId={club.id}
        createdBy={club.created_by}
        currentUserId={userId}
      />
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

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={className}>
      <PulseText variant='overline' className='text-neutral-400 mb-2'>
        {title}
      </PulseText>
      {children}
    </View>
  );
}

function StatTile({
  icon,
  label,
  value,
  minWidth,
  growBasis,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  minWidth: number;
  growBasis: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{ flexGrow: 1, flexBasis: growBasis as never, minWidth }}
      className={'p-3.5 rounded-2xl border ' + (onPress ? 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700' : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700')}
    >
      <View className='flex-row items-center gap-2'>
        <View className='w-8 h-8 rounded-full bg-primary/10 items-center justify-center'>
          <Icon name={icon as any} size={15} color='primary' />
        </View>
        <View className='flex-1 min-w-0'>
          <PulseText variant='stat' className='text-neutral-900 dark:text-neutral-50' numberOfLines={1}>
            {value}
          </PulseText>
          <PulseText variant='caption' className='text-neutral-400' numberOfLines={1}>
            {label}
          </PulseText>
        </View>
        {onPress ? <Icon name='ChevronRight' size={16} color='text-tertiary' /> : null}
      </View>
    </Pressable>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className='flex-row items-start gap-3 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0'>
      <View className='pt-1'>
        <Icon name={icon as any} size={15} color='text-secondary' />
      </View>
      <View className='flex-1 gap-0.5'>
        <PulseText variant='caption' className='text-neutral-400'>
          {label}
        </PulseText>
        <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100'>
          {value}
        </PulseText>
      </View>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  value,
  url,
  isLast,
}: {
  icon: string;
  label: string;
  value: string;
  url: string;
  isLast?: boolean;
}) {
  return (
    <PressableScale
      className={'flex-row items-center gap-3 p-4 active:bg-neutral-50 dark:active:bg-neutral-700/50 ' + (isLast ? '' : DIVIDER)}
      scaleOnPress={0.98}
      scaleOnHover={1.02}
      onPress={() => void WebBrowser.openBrowserAsync(url)}
      accessibilityRole='link'
      accessibilityLabel={`${label} : ${value}`}
    >
      <View className='w-10 h-10 rounded-full bg-primary/10 items-center justify-center'>
        <Icon name={icon as any} size={18} color='primary' />
      </View>
      <View className='flex-1 min-w-0'>
        <PulseText variant='body' className='font-medium text-neutral-900 dark:text-neutral-50'>
          {label}
        </PulseText>
        <PulseText variant='caption' className='text-neutral-500' numberOfLines={1}>
          {value}
        </PulseText>
      </View>
      <Icon name='ArrowRight' size={18} color='text-secondary' />
    </PressableScale>
  );
}

function SportBadge({ sport }: { sport: string }) {
  const definition = SPORTS.find((s) => s.id === sport);
  const iconName = definition?.icon ?? 'Trophy';
  const color = definition?.color ?? '#3358FF';
  const label = definition?.label ?? sport;

  return (
    <Pill icon={iconName} label={label} color={color} bgStyle={{ backgroundColor: `${color}15` }} />
  );
}

/**
 * Uniform pill used for sport / source / visibility chips:
 * same height, same padding, same icon size and text style for all.
 */
function Pill({
  icon,
  label,
  color,
  bgClass,
  bgStyle,
}: {
  icon: string;
  label: string;
  color: string;
  bgClass?: string;
  bgStyle?: { backgroundColor: string };
}) {
  return (
    <View
      className={'flex-row items-center gap-1.5 px-3 rounded-full self-start ' + (bgClass ?? '')}
      style={[{ height: 30 }, bgStyle]}
    >
      <Icon name={icon as any} size={14} color={color} />
      <PulseText variant='caption' className='font-semibold' style={{ color }} numberOfLines={1}>
        {label}
      </PulseText>
    </View>
  );
}

/** Source chip (in-app vs external), rendered with the uniform Pill format. */
function SourcePill({ isExternal }: { isExternal?: boolean }) {
  return isExternal ? (
    <Pill icon='Globe' label='Source externe' color='#F59E0B' bgClass='bg-warning/15' />
  ) : (
    <Pill icon='Smartphone' label={t('source.inApp')} color='#3358FF' bgClass='bg-primary/10' />
  );
}

function ClubPhotoGallery({ urls, itemWidth, itemHeight }: { urls: string[]; itemWidth: number; itemHeight: number }) {
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(0);
  // Natural aspect ratios, so each photo exactly fits the gallery height.
  const [ratios, setRatios] = useState<Record<number, number>>({});

  const go = (dir: -1 | 1) => {
    setIndex((prev) => {
      const next = Math.max(0, Math.min(urls.length - 1, prev + dir));
      listRef.current?.scrollToIndex({ index: next, animated: true });
      return next;
    });
  };

  const widthFor = (i: number) => {
    const ratio = ratios[i];
    if (!ratio) return Math.round(itemWidth * 0.55);
    return Math.round(Math.max(120, Math.min(itemWidth, itemHeight * ratio)));
  };

  return (
    <View className='relative'>
      <FlatList
        ref={listRef}
        horizontal
        data={urls}
        keyExtractor={(u, i) => `${u}-${i}`}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          const w = e.nativeEvent.layoutMeasurement.width;
          setIndex(Math.round(x / w));
        }}
        renderItem={({ item, index: i }) => (
          <Image
            source={{ uri: item }}
            style={{ width: widthFor(i), height: itemHeight }}
            className='rounded-2xl mr-3'
            contentFit='cover'
            onLoad={(e: any) => {
              const w = e?.nativeEvent?.source?.width;
              const h = e?.nativeEvent?.source?.height;
              if (w && h) {
                setRatios((prev) => (prev[i] ? prev : { ...prev, [i]: w / h }));
              }
            }}
          />
        )}
      />
      {urls.length > 1 ? (
        <>
          {index > 0 ? (
            <PressableScale
              className='absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-neutral-900/90 items-center justify-center shadow-sm border border-neutral-200 dark:border-neutral-700'
              scaleOnPress={0.85}
              scaleOnHover={1.1}
              onPress={() => go(-1)}
              accessibilityRole='button'
              accessibilityLabel='Photo précédente'
            >
              <Icon name='ChevronLeft' size={20} color='text-primary' />
            </PressableScale>
          ) : null}
          {index < urls.length - 1 ? (
            <PressableScale
              className='absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-neutral-900/90 items-center justify-center shadow-sm border border-neutral-200 dark:border-neutral-700'
              scaleOnPress={0.85}
              scaleOnHover={1.1}
              onPress={() => go(1)}
              accessibilityRole='button'
              accessibilityLabel='Photo suivante'
            >
              <Icon name='ChevronRight' size={20} color='text-primary' />
            </PressableScale>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

