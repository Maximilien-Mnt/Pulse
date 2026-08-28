import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Share, View, Text, ActivityIndicator, FlatList } from 'react-native';
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
import { InvitationButton } from '@/components/shared/InvitationButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { Ionicons } from '@expo/vector-icons';
import { Text as PulseText } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { BackButton } from '@/components/ui/BackButton';
import { MembersListSheet, type Member } from '@/components/shared/MembersListSheet';
import { EditClubEventSheet } from '@/components/shared/EditClubEventSheet';
import { useClubMembers } from '@/hooks/useClubMembers';
import { useJoinRequestStatus } from '@/hooks/useJoinRequestStatus';
import { useUpdateClub } from '@/hooks/useUpdateClub';
import { supabase } from '@/lib/supabase';
import type { Club } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

export default function ClubDetailScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);

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
          full_name: profile?.full_name ?? t("common.userNotFound"),
          username: profile?.username ?? 'user',
          avatar_url: profile?.avatar_url ?? null,
        };
      }) as Member[];
    },
  });

  const [showMembersList, setShowMembersList] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const updateClub = useUpdateClub();

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
    onError: () =>
      Toast.show({ type: 'error', text1: t('error.clubJoin') }),
  });

  const isCreator = !!userId && club?.created_by === userId;

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

  return (
    <SafeScreen className='flex-1 bg-neutral-50 dark:bg-[#0A0F1C]' edges={['top']}>
      <Stack.Screen
        options={{
          title: club.name,
          headerRight: () =>
            isCreator ? (
              <Pressable
                onPress={() => setShowEditSheet(true)}
                hitSlop={8}
                className='mr-2'
              >
                <Icon name='Settings' size={24} color='text-secondary' />
              </Pressable>
            ) : null,
        }}
      />

      <View className='flex-row items-center px-3 py-2'>
        <BackButton useInAppSession />
        <PulseText variant='h2' className='flex-1 text-center' numberOfLines={1}>
          {club.name}
        </PulseText>
      </View>

      <ScrollView className='flex-1' showsVerticalScrollIndicator={false}>
        {/* Single cover image */}
        <View className='px-4'>
          {cover ? (
            <Image
              source={{ uri: cover }}
              className='w-full h-48 rounded-2xl mb-4'
              contentFit='cover'
            />
          ) : (
            <View className='w-full h-36 rounded-2xl mb-4 bg-neutral-200 dark:bg-neutral-700 items-center justify-center'>
              <Icon name='Image' size={32} color='text-tertiary' />
            </View>
          )}
        </View>

        {/* Identity card */}
        <View className='px-5 mb-6'>
          <View className='flex-row items-start gap-4'>
            {club.logo_url ? (
              <Image
                source={{ uri: club.logo_url }}
                className='w-[72px] h-[72px] rounded-3xl bg-neutral-100 dark:bg-neutral-700'
                contentFit='cover'
              />
            ) : (
              <View className='w-[72px] h-[72px] rounded-3xl bg-neutral-200 dark:bg-neutral-700 items-center justify-center'>
                <Icon name='Trophy' size={24} color='text-tertiary' />
              </View>
            )}

            <View className='flex-1 pt-0.5'>
              <View className='flex-row items-start justify-between gap-2'>
                <View className='flex-1'>
                  <PulseText variant='h1' numberOfLines={2}>
                    {club.name}
                  </PulseText>
                  <View className='flex-row flex-wrap gap-2 mt-3 items-center'>
                    <SportBadge sport={club.sport} />
                    <SourceBadge isExternal={club.is_external} />
                  </View>
                </View>
                <View className='items-center px-2.5 py-1.5 rounded-full bg-primary/10 self-start'>
                  <View className='flex-row items-center gap-1'>
                    <Ionicons name='people-outline' size={14} color={'#3358FF'} />
                    <PulseText variant='caption' className='text-primary font-semibold'>
                      {club.member_count}
                    </PulseText>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        <View className='mx-4 mb-5'>
          <PulseText variant='overline' className='text-neutral-400 mb-2'>
            Description
          </PulseText>
          <View className='p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700'>
            <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100 leading-relaxed'>
              {club.description}
            </PulseText>
          </View>
        </View>

        {/* Links section */}
        {(club.registration_url || club.website_url || club.contact_email) ? (
          <View className='mx-4 mb-6'>
            <PulseText variant='overline' className='text-neutral-400 mb-3'>
              Liens
            </PulseText>
            <View className='bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden'>
              {club.registration_url ? (
                <Pressable
                  className='flex-row items-center gap-3 p-4 border-b border-neutral-100 dark:border-neutral-700 active:bg-neutral-50 dark:active:bg-neutral-700/50'
                  onPress={() => void WebBrowser.openBrowserAsync(club.registration_url!)}
                >
                  <View className='w-10 h-10 rounded-full bg-primary/10 items-center justify-center'>
                    <Ionicons name='person-add-outline' size={20} color={'#3358FF'} />
                  </View>
                  <View className='flex-1'>
                    <PulseText variant='body' className='font-medium text-neutral-900 dark:text-neutral-50'>
                      S'inscrire
                    </PulseText>
                    <PulseText variant='caption' className='text-neutral-500' numberOfLines={1}>
                      {club.registration_url}
                    </PulseText>
                  </View>
                  <Icon name='ArrowRight' size={20} color='text-secondary' />
                </Pressable>
              ) : null}
              {club.website_url ? (
                <Pressable
                  className='flex-row items-center gap-3 p-4 border-b border-neutral-100 dark:border-neutral-700 active:bg-neutral-50 dark:active:bg-neutral-700/50'
                  onPress={() => void WebBrowser.openBrowserAsync(club.website_url!)}
                >
                  <View className='w-10 h-10 rounded-full bg-primary/10 items-center justify-center'>
                    <Icon name='Globe' size={20} color='primary' />
                  </View>
                  <View className='flex-1'>
                    <PulseText variant='body' className='font-medium text-neutral-900 dark:text-neutral-50'>
                      Site web
                    </PulseText>
                    <PulseText variant='caption' className='text-neutral-500' numberOfLines={1}>
                      {club.website_url}
                    </PulseText>
                  </View>
                  <Icon name='ArrowRight' size={20} color='text-secondary' />
                </Pressable>
              ) : null}
              {club.contact_email ? (
                <Pressable
                  className='flex-row items-center gap-3 p-4 active:bg-neutral-50 dark:active:bg-neutral-700/50'
                  onPress={() => {
                    const subject = encodeURIComponent(`Question sur ${club.name}`);
                    const url = `mailto:${club.contact_email}?subject=${subject}`;
                    void WebBrowser.openBrowserAsync(url);
                  }}
                >
                  <View className='w-10 h-10 rounded-full bg-primary/10 items-center justify-center'>
                    <Icon name='Mail' size={20} color='primary' />
                  </View>
                  <View className='flex-1'>
                    <PulseText variant='body' className='font-medium text-neutral-900 dark:text-neutral-50'>
                      Contact
                    </PulseText>
                    <PulseText variant='caption' className='text-neutral-500' numberOfLines={1}>
                      {club.contact_email}
                    </PulseText>
                  </View>
                  <Icon name='ArrowRight' size={20} color='text-secondary' />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Club photo gallery */}
        {club.hero_urls && club.hero_urls.length > 1 ? (
          <View className='mx-4 mb-6'>
            <PulseText variant='overline' className='text-neutral-400 mb-3'>
              Galerie photo
            </PulseText>
            <ClubPhotoGallery urls={club.hero_urls} />
          </View>
        ) : null}

        <View className='mx-4 mb-5'>
          <PulseText variant='overline' className='text-neutral-400 mb-2'>
            Localisation
          </PulseText>
          <View className='p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700'>
            <LocationSection country={club.country} city={club.city} address={club.address} />
          </View>
        </View>

        <InfoSection title='Détails' className='mx-4 mb-5'>
          {club.founded_date ? (
            <InfoRow
              icon='Calendar'
              label='Date de fondation'
              value={club.founded_date}
            />
          ) : null}
          {club.league ? (
            <InfoRow icon='Trophy' label='Ligue / Division' value={club.league} />
          ) : null}
          {(club.age_min != null || club.age_max != null) && (
            <InfoRow
              icon='Users'
              label="Tranche d'âge"
              value={`${club.age_min ?? '—'} – ${club.age_max ?? '—'} ans`}
            />
          )}
          {club.required_level ? (
            <InfoRow icon='Activity' label='Niveau requis' value={club.required_level} />
          ) : null}
          {club.contact_email ? (
            <InfoRow icon='Mail' label='Contact' value={club.contact_email} />
          ) : null}
        </InfoSection>

        {!club.is_external && members.length > 0 ? (
          <View className='mx-4 mb-5'>
            <View className='flex-row items-center justify-between mb-2'>
              <PulseText variant='overline' className='text-neutral-400'>
                Membres ({members.length})
              </PulseText>
            </View>
            <View className='relative'>
              <FlatList
                horizontal
                data={members}
                keyExtractor={(m) => m.user_id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isCreatorItem = creator && item.user_id === creator.id;
                  return (
                    <Pressable
                      className='items-center mr-4'
                      onPress={() => router.push(`/profile/${item.user_id}`)}
                      onLongPress={
                        isCreatorItem
                          ? () =>
                              Toast.show({
                                type: 'info',
                                text1: 'Créateur',
                              })
                          : undefined
                      }
                    >
                      <View className='relative'>
                        <View className={isCreatorItem ? 'p-0.5 rounded-full bg-primary' : ''}>
                          <Avatar uri={item.avatar_url} size={48} />
                        </View>
                        {isCreatorItem ? (
                          <Pressable
                            className='absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary items-center justify-center'
                            onPress={(e) => {
                              e.stopPropagation();
                              Toast.show({
                                type: 'info',
                                text1: 'Créateur',
                              });
                            }}
                            hitSlop={4}
                          >
                            <Ionicons name='star' size={10} color='white' />
                          </Pressable>
                        ) : null}
                      </View>
                      <PulseText
                        variant='caption'
                        className='text-xs text-neutral-500 mt-1'
                        numberOfLines={1}
                        style={{ maxWidth: 64 }}
                      >
                        {item.full_name}
                      </PulseText>
                    </Pressable>
                  );
                }}
                ListFooterComponent={
                  <Pressable
                    className='items-center justify-center ml-2'
                    style={{ width: 48, height: 48 }}
                    onPress={() => setShowMembersList(true)}
                  >
                    <View className='w-12 h-12 rounded-full bg-primary/10 items-center justify-center'>
                      <Icon name='ChevronRight' size={20} color='primary' />
                    </View>
                  </Pressable>
                }
              />
            </View>
          </View>
        ) : null}

        {!club.is_external && loadingAllMembers ? (
          <View className='mx-4 mb-5 items-center py-3'>
            <ActivityIndicator size='small' color='#3358FF' />
          </View>
        ) : null}

        <View className='mx-4 mb-6 gap-3'>
          <View className='flex-row gap-3'>
            <View className='flex-1'>
              <Button
                title='Partager'
                variant='secondary'
                onPress={() => void Share.share({ message: club.name })}
                icon='Share2'
              />
            </View>
            {isCreator ? null : (
              <View className='flex-1'>
                {joinStatus?.isMember ? (
                  <Button
                    title='Membre'
                    variant='secondary'
                    onPress={() => {}}
                    disabled
                  />
                ) : joinStatus?.isPending ? (
                  <Button
                    title='Demande envoyée'
                    variant='secondary'
                    onPress={() => {}}
                    disabled
                  />
                ) : (
                  <Button
                    title={
                      club.is_private
                        ? 'Demander à rejoindre'
                        : 'Rejoindre le club'
                    }
                    onPress={() => joinMut.mutate()}
                    loading={joinMut.isPending}
                  />
                )}
              </View>
            )}
          </View>

          {club.is_external && club.source_url ? (
            <Pressable
              className='flex-row items-center gap-2 py-3 px-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 active:opacity-90'
              onPress={() => void WebBrowser.openBrowserAsync(club.source_url!)}
            >
              <Icon name='Globe' size={16} color='primary' />
              <PulseText variant='body' className='text-primary font-medium flex-1'>
                {club.source_name ?? club.source_url}
              </PulseText>
              <Icon name='ArrowRight' size={16} color='text-secondary' />
            </Pressable>
          ) : null}

          <InvitationButton
            type='club'
            targetId={club.id}
            visible={!!isCreator && !!club.is_private}
          />
        </View>
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

      <EditClubEventSheet
        visible={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        type='club'
        data={club}
        onSave={(updateData) => {
          void updateClub.mutate(
            { clubId: club.id, data: updateData, oldData: club },
            { onSuccess: () => setShowEditSheet(false) }
          );
        }}
        isLoading={updateClub.isPending}
      />
    </SafeScreen>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className='flex-row items-start gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0'>
      <View className='pt-0.5'>
        <Icon name={icon as any} size={16} color='text-secondary' />
      </View>
      <View className='flex-1 gap-0.5'>
        <PulseText variant='overline' className='text-neutral-400'>
          {label}
        </PulseText>
        <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100'>
          {value}
        </PulseText>
      </View>
    </View>
  );
}

function InfoSection({
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
      <PulseText variant='overline' className='text-neutral-400 mb-3'>
        {title}
      </PulseText>
      <View className='p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700'>
        {children}
      </View>
    </View>
  );
}

function SportBadge({ sport }: { sport: string }) {
  const definition = SPORTS.find((s) => s.id === sport);
  const iconName = definition?.icon ?? 'trophy-outline';
  const color = definition?.color ?? '#3358FF';
  const label = definition?.label ?? sport;

  return (
    <View
      className='flex-row items-center gap-1.5 px-3 py-1.5 rounded-full self-start'
      style={{ backgroundColor: `${color}15` }}
    >
      <Ionicons name={iconName as any} size={16} color={color} />
      <PulseText variant='caption' className='font-semibold' style={{ color }}>
        {label}
      </PulseText>
    </View>
  );
}

function LocationSection({ country, city, address }: { country?: string | null; city?: string | null; address?: string | null }) {
  const flagEmoji = country ? getCountryDisplay(country).split(' ')[0] : '';

  return (
    <View className='flex-row items-center gap-2 py-2'>
      <Text className='text-base'>{flagEmoji}</Text>
      <PulseText variant='body' className='text-neutral-700 dark:text-neutral-300'>
        {[city, country].filter(Boolean).join(', ')}
      </PulseText>
      {address ? (
        <>
          <Text className='text-neutral-400'>·</Text>
          <PulseText variant='caption' className='text-neutral-400' numberOfLines={1}>
            {address}
          </PulseText>
        </>
      ) : null}
    </View>
  );
}

function ClubPhotoGallery({ urls }: { urls: string[] }) {
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(0);

  const go = (dir: -1 | 1) => {
    setIndex((prev) => {
      const next = Math.max(0, Math.min(urls.length - 1, prev + dir));
      listRef.current?.scrollToIndex({ index: next, animated: true });
      return next;
    });
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
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            className='w-[300px] h-[180px] rounded-2xl mr-3'
            contentFit='cover'
          />
        )}
      />
      {urls.length > 1 ? (
        <>
          {index > 0 ? (
            <Pressable
              className='absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-neutral-900/90 items-center justify-center shadow-sm border border-neutral-200 dark:border-neutral-700'
              onPress={() => go(-1)}
            >
              <Icon name='ChevronLeft' size={20} color='text-primary' />
            </Pressable>
          ) : null}
          {index < urls.length - 1 ? (
            <Pressable
              className='absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-neutral-900/90 items-center justify-center shadow-sm border border-neutral-200 dark:border-neutral-700'
              onPress={() => go(1)}
            >
              <Icon name='ChevronRight' size={20} color='text-primary' />
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
