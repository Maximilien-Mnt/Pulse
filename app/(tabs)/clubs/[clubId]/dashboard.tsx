import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Share, Text, View, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { SafeScreen } from '@/components/shared/SafeScreen';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@/stores/authStore';
import { queryClient } from '@/lib/queryClient';
import { usePostHog } from 'posthog-react-native';
import { getCountryDisplay } from '@/utils/countries';
import { SPORTS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { SourceBadge } from '@/components/shared/SourceBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { BackButton } from '@/components/ui/BackButton';
import { MembersListSheet, type Member } from '@/components/shared/MembersListSheet';
import { DeleteClubSheet } from '@/components/profile/DeleteClubSheet';
import { InvitationButton } from '@/components/shared/InvitationButton';
import { RefuseJoinRequestSheet } from '@/components/shared/RefuseJoinRequestSheet';
import { useClubMembers } from '@/hooks/useClubMembers';
import { useClubEvents } from '@/hooks/useClubEvents';
import { useClubJoinRequests, type ClubJoinRequest } from '@/hooks/useClubJoinRequests';
import { useJoinRequestAction } from '@/hooks/useNotifications';
import { useUpdateClub } from '@/hooks/useUpdateClub';
import { supabase } from '@/lib/supabase';
import {
  ClubOpeningHoursDisplay,
  ClubOpeningHoursSheet,
} from '@/components/clubs/ClubOpeningHours';
import type { OpeningHourSlot } from '@/lib/openingHours';
import { sanitizeOpeningHours } from '@/lib/openingHours';
import type { Club } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { t } from '@/hooks/useTranslation';

const CARD =
  'bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700';

export default function ClubDashboardScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
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

  const { data: joinRequests = [], isLoading: loadingRequests } = useClubJoinRequests(
    clubId ?? null
  );

  const { data: clubEvents = [], isLoading: loadingEvents } = useClubEvents(clubId ?? null);

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
  });

  const [showMembersList, setShowMembersList] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showHoursSheet, setShowHoursSheet] = useState(false);
  const [refuseRequest, setRefuseRequest] = useState<ClubJoinRequest | null>(null);
  const updateClub = useUpdateClub();
  const joinRequestAction = useJoinRequestAction();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['club-join-requests', clubId] });
    void queryClient.invalidateQueries({ queryKey: ['club', clubId] });
    void queryClient.invalidateQueries({ queryKey: ['club-all-members', clubId] });
    void queryClient.invalidateQueries({ queryKey: ['clubs'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const handleRequestAction = useMutation({
    mutationFn: async ({
      action,
      request,
      message,
    }: {
      action: 'accept' | 'refuse';
      request: ClubJoinRequest;
      message?: string;
    }) => {
      await joinRequestAction.mutateAsync({
        action,
        requestId: request.id,
        type: 'club',
        targetId: clubId!,
        requesterId: request.user_id,
        message: action === 'refuse' ? message : undefined,
      });
    },
    onSuccess: (_data, { action }) => {
      posthog.capture('club_join_request_' + action, { club_id: clubId });
      Toast.show({
        type: 'success',
        text1:
          action === 'accept'
            ? t('clubs.dashboard.requestAccepted')
            : t('clubs.dashboard.requestRefused'),
      });
      invalidate();
    },
    onError: () => Toast.show({ type: 'error', text1: t('common.error') }),
  });

  const isCreator = !!userId && club?.created_by === userId;

  if (!club) {
    if (clubLoading) {
      return (
        <SafeScreen className='flex-1 bg-neutral-50 dark:bg-[#0A0F1C]'>
          <View className='px-4 pt-4 gap-3'>
            <Skeleton className='w-full h-40 rounded-2xl' />
            <Skeleton className='w-full h-20 rounded-2xl' />
            <Skeleton className='w-full h-32 rounded-2xl' />
            <Skeleton className='w-full h-24 rounded-2xl' />
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
        <Button
          title={t('clubs.back')}
          variant='secondary'
          className='mt-4'
          onPress={() => router.back()}
        />
      </SafeScreen>
    );
  }

  const cover = club.cover_url ?? club.hero_urls?.[0] ?? club.logo_url;
  const pendingRequests = joinRequests;

  // ---- Responsive layout (matches the public detail screen) ----
  const isWide = winWidth >= 760;
  const contentMax = 920;
  const coverH = isWide ? 280 : winWidth >= 400 ? 220 : 180;
  const statBasis = isWide ? '23%' : '47%';
  const infoBasis = isWide ? '47%' : '100%';

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

  return (
    <SafeScreen className='flex-1 bg-neutral-50 dark:bg-[#0A0F1C]' edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className='flex-row items-center px-3 py-2'>
        <BackButton useInAppSession />
        <PulseText variant='h2' className='flex-1 text-center' numberOfLines={1}>
          {t('clubs.dashboard.title')}
        </PulseText>
        <Pressable
          onPress={() => void Share.share({ message: club.name })}
          hitSlop={8}
          className='mr-2'
        >
          <Icon name='Share2' size={22} color='text-secondary' />
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(tabs)/clubs/${clubId}/settings`)}
          hitSlop={8}
          className='mr-3'
        >
          <Icon name='Settings' size={22} color='text-secondary' />
        </Pressable>
      </View>

      <ScrollView
        className='flex-1'
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: '100%', maxWidth: contentMax, alignSelf: 'center' }}
      >
        {/* ---- Hero cover ---- */}
        <View className='px-4 pt-1'>
          {cover ? (
            <Image
              source={{ uri: cover }}
              className='w-full rounded-2xl'
              style={{ height: coverH }}
              contentFit='cover'
            />
          ) : (
            <View
              className='w-full rounded-2xl bg-neutral-200 dark:bg-neutral-700 items-center justify-center'
              style={{ height: coverH - 40 }}
            >
              <Icon name='Image' size={32} color='text-tertiary' />
            </View>
          )}
        </View>

        {/* ---- Identity ---- */}
        <View className='px-5 mb-5'>
          <View className='-mt-10 self-start'>
            {club.logo_url ? (
              <Image
                source={{ uri: club.logo_url }}
                className='w-20 h-20 rounded-3xl bg-white dark:bg-neutral-800'
                style={{ borderWidth: 4, borderColor: '#fff' }}
                contentFit='cover'
              />
            ) : (
              <View
                className='w-20 h-20 rounded-3xl bg-neutral-200 dark:bg-neutral-700 items-center justify-center'
                style={{ borderWidth: 4, borderColor: '#fff' }}
              >
                <Icon name='Trophy' size={24} color='text-tertiary' />
              </View>
            )}
          </View>
          <View className='mt-2'>
            <PulseText variant='h1' numberOfLines={2}>
              {club.name}
            </PulseText>
            {club.short_description ? (
              <PulseText variant='body' className='text-neutral-500 mt-1.5' numberOfLines={2}>
                {club.short_description}
              </PulseText>
            ) : null}
            <View className='flex-row flex-wrap gap-2 mt-3 items-center'>
              {sports.map((s) => (
                <SportBadge key={s} sport={s} />
              ))}
              <SourceBadge isExternal={club.is_external} />
              {club.is_private ? (
                <View className='flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700'>
                  <Icon name='Lock' size={14} color='text-secondary' />
                  <PulseText variant='caption' className='font-semibold text-neutral-600 dark:text-neutral-300'>
                    {t('clubs.dashboard.private')}
                  </PulseText>
                </View>
              ) : null}
              <View className='flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10'>
                <Icon name='Settings' size={14} color='primary' />
                <PulseText variant='caption' className='font-semibold text-primary'>
                  {t('clubs.dashboard.title')}
                </PulseText>
              </View>
            </View>
          </View>
        </View>

        {/* ---- Stats row (admin: members / favorites / events / requests) ---- */}
        <View className='flex-row flex-wrap gap-3 px-4 mb-5'>
          <StatTile
            icon='Users'
            value={club.member_count}
            label={t('clubs.dashboard.members')}
            basis={statBasis}
            onPress={() => setShowMembersList(true)}
          />
          <StatTile icon='Heart' value={favoritesCount} label={t('clubs.dashboard.favorites')} basis={statBasis} />
          <StatTile icon='Calendar' value={clubEvents.length} label={t('clubs.dashboard.events')} basis={statBasis} />
          <StatTile
            icon='Inbox'
            value={pendingRequests.length}
            label={t('clubs.dashboard.requests')}
            basis={statBasis}
            highlight={pendingRequests.length > 0}
          />
        </View>

        {/* ---- Quick actions (admin shortcuts) ---- */}
        <View className='flex-row gap-3 px-4 mb-6'>
          <View className='flex-1'>
            <Button title={t('clubs.dashboard.editClub')} icon='Pen' variant='secondary' onPress={() => router.push(`/(tabs)/clubs/${clubId}/settings`)} />
          </View>
          <View className='flex-1'>
            <Button title={t('clubs.hours.title')} icon='Clock' variant='secondary' onPress={() => setShowHoursSheet(true)} />
          </View>
        </View>

        {/* Pending join requests */}
        {pendingRequests.length > 0 ? (
          <Section title={t('clubs.dashboard.requests')}>
            {loadingRequests ? (
              <ActivityIndicator size='small' color='#3358FF' className='py-3' />
            ) : (
              pendingRequests.map((request) => (
                <View
                  key={request.id}
                  className='flex-row items-center py-3 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0'
                >
                  <Avatar uri={request.avatar_url} size={44} />
                  <View className='flex-1 ml-3'>
                    <PulseText variant='body' className='font-medium' numberOfLines={1}>
                      {request.full_name}
                    </PulseText>
                    <PulseText variant='caption' className='text-neutral-500' numberOfLines={1}>
                      @{request.username}
                    </PulseText>
                  </View>
                  <Pressable
                    onPress={() => handleRequestAction.mutate({ action: 'accept', request })}
                    disabled={handleRequestAction.isPending}
                    className='w-10 h-10 rounded-full bg-primary/10 items-center justify-center ml-2'
                    hitSlop={4}
                  >
                    <Icon name='CheckCircle2' size={18} color='primary' />
                  </Pressable>
                  <Pressable
                    onPress={() => setRefuseRequest(request)}
                    disabled={handleRequestAction.isPending}
                    className='w-10 h-10 rounded-full bg-error-500/10 items-center justify-center ml-2'
                    hitSlop={4}
                  >
                    <Icon name='X' size={18} color='error-500' />
                  </Pressable>
                </View>
              ))
            )}
          </Section>
        ) : null}

        {/* Members */}
        <Section title={`${t('clubs.dashboard.members')} (${allMembers.length})`}>
          {loadingAllMembers ? (
            <ActivityIndicator size='small' color='#3358FF' className='py-3' />
          ) : allMembers.length === 0 ? (
            <PulseText variant='body' className='text-neutral-500 py-2'>
              {t('clubs.dashboard.noMembers')}
            </PulseText>
          ) : (
            <Pressable onPress={() => setShowMembersList(true)} className='active:opacity-80'>
              <View className='flex-row items-center py-1'>
                <View className='flex-row'>
                  {allMembers.slice(0, 6).map((member, index) => (
                    <View key={member.user_id} style={{ marginLeft: index === 0 ? 0 : -10 }}>
                      <Avatar uri={member.avatar_url} size={44} />
                    </View>
                  ))}
                </View>
                <View className='flex-1 ml-3'>
                  <PulseText variant='body' className='text-primary font-medium'>
                    {t('clubs.dashboard.manageMembers')}
                  </PulseText>
                  <PulseText variant='caption' className='text-neutral-500'>
                    {t('clubs.dashboard.manageMembersHint')}
                  </PulseText>
                </View>
                <Icon name='ChevronRight' size={18} color='text-tertiary' />
              </View>
            </Pressable>
          )}
        </Section>

        {/* Club events */}
        <Section title={t('clubs.dashboard.clubEvents')}>
          {loadingEvents ? (
            <ActivityIndicator size='small' color='#3358FF' className='py-3' />
          ) : clubEvents.length === 0 ? (
            <PulseText variant='body' className='text-neutral-500 py-2'>
              {t('clubs.dashboard.noEvents')}
            </PulseText>
          ) : (
            clubEvents.map((event) => (
              <Pressable
                key={event.id}
                className='flex-row items-center py-3 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0 active:opacity-80'
                onPress={() => router.push(`/(tabs)/events/${event.id}`)}
              >
                <View className='w-10 h-10 rounded-xl bg-primary/10 items-center justify-center'>
                  <Icon name='Calendar' size={18} color='primary' />
                </View>
                <View className='flex-1 ml-3'>
                  <PulseText variant='body' className='font-medium' numberOfLines={1}>
                    {event.name}
                  </PulseText>
                  <PulseText variant='caption' className='text-neutral-500'>
                    {new Date(event.start_date).toLocaleDateString()} · {event.city}
                  </PulseText>
                </View>
                <Icon name='ChevronRight' size={18} color='text-tertiary' />
              </Pressable>
            ))
          )}
        </Section>

        {/* ---- Info grid: 2 columns on wide screens ---- */}
        <View className='flex-row flex-wrap gap-3 mx-4 mb-5'>
          {/* Description */}
          {club.description ? (
            <View style={{ flexGrow: 1, flexBasis: '100%' }} className={'p-4 ' + CARD}>
              <View className='flex-row items-center gap-2 mb-2'>
                <Icon name='FileText' size={16} color='primary' />
                <PulseText variant='overline' className='text-neutral-400'>
                  {t('clubs.dashboard.description')}
                </PulseText>
              </View>
              <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100 leading-relaxed' numberOfLines={6}>
                {club.description}
              </PulseText>
            </View>
          ) : null}

          {/* Location */}
          {club.city || club.country || club.address || club.postal_code ? (
            <View style={{ flexGrow: 1, flexBasis: infoBasis }} className={'p-4 ' + CARD}>
              <View className='flex-row items-center gap-2 mb-3'>
                <Icon name='MapPin' size={16} color='primary' />
                <PulseText variant='overline' className='text-neutral-400'>
                  {t('clubs.dashboard.location')}
                </PulseText>
              </View>
              <View className='flex-row items-center gap-2'>
                <Text className='text-base'>{club.country ? getCountryDisplay(club.country).split(' ')[0] : ''}</Text>
                <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100 font-medium'>
                  {[club.city, club.country ? getCountryDisplay(club.country).replace(/^[^A-Za-z]+/, '') : null].filter(Boolean).join(', ') || '—'}
                </PulseText>
              </View>
              {club.address || club.postal_code ? (
                <PulseText variant='body' className='text-neutral-500 mt-1'>
                  {[club.address, club.postal_code].filter(Boolean).join(', ')}
                </PulseText>
              ) : null}
            </View>
          ) : null}
          {/* Details */}
          {club.founded_date || club.league || club.age_min !== null || club.age_max !== null ? (
            <View style={{ flexGrow: 1, flexBasis: infoBasis }} className={'p-4 ' + CARD}>
              <View className='flex-row items-center gap-2 mb-1'>
                <Icon name='Info' size={16} color='primary' />
                <PulseText variant='overline' className='text-neutral-400'>
                  {t('common.details')}
                </PulseText>
              </View>
              {club.founded_date ? <InfoRow icon='Calendar' label={t('forms.foundedDate')} value={String(club.founded_date)} /> : null}
              {club.league ? <InfoRow icon='Trophy' label={t('forms.league')} value={club.league} /> : null}
              {club.age_min !== null || club.age_max !== null ? (
                <InfoRow
                  icon='Users'
                  label={t('clubs.dashboard.ageRange')}
                  value={`${club.age_min ?? '?'} – ${club.age_max ?? '?'}`}
                />
              ) : null}
            </View>
          ) : null}

          {/* Required levels per sport */}
          {levelRows.length > 0 ? (
            <View style={{ flexGrow: 1, flexBasis: infoBasis }} className={'p-4 ' + CARD}>
              <View className='flex-row items-center gap-2 mb-2'>
                <Icon name='Activity' size={16} color='primary' />
                <PulseText variant='overline' className='text-neutral-400'>
                  {t('forms.requiredLevel')}
                </PulseText>
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

          {/* Contact & links */}
          {club.contact_email || club.phone_number || club.website_url ? (
            <View style={{ flexGrow: 1, flexBasis: infoBasis }} className={CARD + ' overflow-hidden px-3 py-1'}>
              {club.contact_email ? <InfoRow icon='Mail' label={t('clubs.dashboard.contactEmail')} value={club.contact_email} /> : null}
              {club.phone_number ? <InfoRow icon='Smartphone' label='Téléphone' value={club.phone_number} /> : null}
              {club.website_url ? (
                <Pressable
                  className='flex-row items-start gap-3 py-3 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0 active:opacity-80'
                  onPress={() => void WebBrowser.openBrowserAsync(club.website_url!)}
                >
                  <View className='pt-1'>
                    <Icon name='Globe' size={15} color='text-secondary' />
                  </View>
                  <View className='flex-1 gap-0.5'>
                    <PulseText variant='caption' className='text-neutral-400'>
                      {t('forms.website')}
                    </PulseText>
                    <PulseText variant='body' className='text-primary' numberOfLines={1}>
                      {club.website_url}
                    </PulseText>
                  </View>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Opening hours */}
          {sanitizeOpeningHours(club.opening_hours).length > 0 ? (
            <View style={{ flexGrow: 1, flexBasis: '100%' }} className={'p-4 ' + CARD}>
              <View className='flex-row items-center gap-2 mb-2'>
                <Icon name='Clock' size={16} color='primary' />
                <PulseText variant='overline' className='text-neutral-400'>
                  {t('clubs.hours.title')}
                </PulseText>
              </View>
              <ClubOpeningHoursDisplay slots={(club.opening_hours as OpeningHourSlot[] | undefined) ?? []} />
            </View>
          ) : null}
        </View>
        <Section title={t('clubs.dashboard.settings')}>
          <View className='gap-3 pt-1'>
            <InvitationButton type='club' targetId={club.id} visible={!!isCreator} />
            <Button
              title={t('clubs.dashboard.viewPublic')}
              icon='Eye'
              variant='ghost'
              onPress={() => router.push(`/(tabs)/clubs/${club.id}?public=true`)}
            />
            <Button
              title={t('clubs.dashboard.deleteClub')}
              icon='Trash2'
              variant='destructive'
              onPress={() => setShowDelete(true)}
            />
          </View>
        </Section>

        <View className='h-8' />
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

      <DeleteClubSheet
        visible={showDelete}
        onClose={() => setShowDelete(false)}
        clubId={club.id}
        clubName={club.name}
      />

      <ClubOpeningHoursSheet
        visible={showHoursSheet}
        onClose={() => setShowHoursSheet(false)}
        initialSlots={(club.opening_hours as OpeningHourSlot[] | undefined) ?? []}
        onSave={(hours) => {
          void updateClub.mutate(
            { clubId: club.id, data: { opening_hours: hours }, oldData: club },
            { onSuccess: () => setShowHoursSheet(false) }
          );
        }}
        saving={updateClub.isPending}
      />

      <RefuseJoinRequestSheet
        visible={!!refuseRequest}
        onClose={() => setRefuseRequest(null)}
        requesterName={refuseRequest?.full_name ?? ''}
        entityName={club.name}
        isPending={handleRequestAction.isPending}
        onConfirm={(reason) => {
          const target = refuseRequest;
          if (!target) return;
          setRefuseRequest(null);
          handleRequestAction.mutate({ action: 'refuse', request: target, message: reason });
        }}
      />
    </SafeScreen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className='mx-4 mb-5'>
      <PulseText variant='overline' className='text-neutral-400 mb-2'>
        {title}
      </PulseText>
      <View className='p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700'>
        {children}
      </View>
    </View>
  );
}

function StatTile({
  icon,
  value,
  label,
  basis,
  onPress,
  highlight,
}: {
  icon: string;
  value: number;
  label: string;
  basis?: string;
  onPress?: () => void;
  highlight?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={basis ? { flexGrow: 1, flexBasis: basis as never } : undefined}
      className={`p-3.5 rounded-2xl border ${
        highlight
          ? 'bg-primary/10 border-primary/30'
          : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'
      }`}
    >
      <View className='flex-row items-center gap-2.5'>
        <View
          className={`w-9 h-9 rounded-full items-center justify-center ${
            highlight ? 'bg-primary/15' : 'bg-primary/10'
          }`}
        >
          <Icon name={icon as any} size={16} color='primary' />
        </View>
        <View className='flex-1 min-w-0'>
          <PulseText variant='stat' className='font-semibold text-neutral-900 dark:text-neutral-50' numberOfLines={1}>
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
    <View className='flex-row items-start gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0'>
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

function SportBadge({ sport }: { sport: string }) {
  const definition = SPORTS.find((s) => s.id === sport);
  const iconName = definition?.icon ?? 'Trophy';
  const color = definition?.color ?? '#3358FF';
  const label = definition?.label ?? sport;

  return (
    <View
      className='flex-row items-center gap-1.5 px-3 py-1.5 rounded-full self-start'
      style={{ backgroundColor: `${color}15` }}
    >
      <Icon name={iconName} size={16} color={color} />
      <PulseText variant='caption' className='font-semibold' style={{ color }}>
        {label}
      </PulseText>
    </View>
  );
}








