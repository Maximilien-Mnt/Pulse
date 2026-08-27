import { useState } from 'react';
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
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SourceBadge } from '@/components/shared/SourceBadge';
import { InvitationButton } from '@/components/shared/InvitationButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { BackButton } from '@/components/ui/BackButton';
import { MembersListSheet, type Member } from '@/components/shared/MembersListSheet';
import { EditClubEventSheet } from '@/components/shared/EditClubEventSheet';
import { ClubMembersStrip } from '@/components/clubs/ClubMembersStrip';
import { useClubMembers } from '@/hooks/useClubMembers';
import { useJoinRequestStatus } from '@/hooks/useJoinRequestStatus';
import { useUpdateClub } from '@/hooks/useUpdateClub';
import { supabase } from '@/lib/supabase';
import type { Club } from '@/types';

export default function ClubDetailScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const posthog = usePostHog();
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
          full_name: profile?.full_name ?? 'Utilisateur',
          username: profile?.username ?? 'utilisateur',
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
      Toast.show({ type: 'success', text1: 'Demande envoyée au créateur' });
      void queryClient.invalidateQueries({ queryKey: ['club', clubId] });
      void queryClient.invalidateQueries({
        queryKey: ['join-request-status', 'club', clubId],
      });
    },
    onError: () =>
      Toast.show({ type: 'error', text1: "Impossible d'envoyer la demande" }),
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
        <Icon name='AlertCircle' size={48} color='text-tertiary' />
        <PulseText variant='body' className='mt-3 text-neutral-500'>
          Club introuvable
        </PulseText>
        <Button
          title='Retour'
          variant='secondary'
          className='mt-4'
          onPress={() => router.back()}
        />
      </SafeScreen>
    );
  }

  const hero = club.hero_urls?.[0] ?? club.logo_url;

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
                <Icon name='Settings' size={22} color='text-secondary' />
              </Pressable>
            ) : null,
        }}
      />

      <View className='flex-row items-center px-3 py-2'>
        <BackButton />
        <PulseText variant='h2' className='flex-1 text-center' numberOfLines={1}>
          {club.name}
        </PulseText>
      </View>

      <ScrollView className='flex-1' showsVerticalScrollIndicator={false}>
        <View className='px-4'>
          {club.hero_urls && club.hero_urls.length > 0 ? (
            <FlatList
              horizontal
              data={club.hero_urls}
              keyExtractor={(u) => u}
              showsHorizontalScrollIndicator={false}
              className='py-2 mb-2'
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  className='w-[320px] h-[200px] rounded-2xl mr-3'
                  contentFit='cover'
                />
              )}
            />
          ) : hero ? (
            <Image
              source={{ uri: hero }}
              className='w-full h-48 rounded-2xl mb-4'
              contentFit='cover'
            />
          ) : (
            <View className='w-full h-36 rounded-2xl mb-4 bg-neutral-200 dark:bg-neutral-700 items-center justify-center'>
              <Icon name='Image' size={44} color='text-tertiary' />
            </View>
          )}
        </View>

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
                <Icon name='Trophy' size={30} color='text-tertiary' />
              </View>
            )}

            <View className='flex-1 pt-0.5'>
              <View className='flex-row items-start justify-between gap-2'>
                <View className='flex-1'>
                  <PulseText variant='h1' numberOfLines={2}>
                    {club.name}
                  </PulseText>
                  <View className='flex-row flex-wrap gap-2 mt-3 items-center'>
                    <Badge>{club.sport}</Badge>
                    <SourceBadge isExternal={club.is_external} />
                  </View>
                  <View className='flex-row items-center gap-1.5 mt-2'>
                    <Icon name='MapPinned' size={15} color='text-secondary' />
                    <PulseText variant='caption' className='text-neutral-500'>
                      {club.city}, {getCountryDisplay(club.country)}
                    </PulseText>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className='mx-4 mb-5'>
          <PulseText variant='overline' className='text-neutral-400 mb-2'>
            Créateur
          </PulseText>
          {creator ? (
            <Pressable
              className='flex-row items-center gap-3 p-3.5 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 active:opacity-90'
              onPress={() => router.push(`/profile/${creator.id}`)}
            >
              <Avatar size={48} uri={creator.avatar_url} />
              <View className='flex-1'>
                <PulseText
                  variant='body'
                  className='font-semibold text-neutral-900 dark:text-neutral-50'
                  numberOfLines={1}
                >
                  {creator.full_name}
                </PulseText>
                <PulseText
                  variant='caption'
                  className='text-neutral-500'
                  numberOfLines={1}
                >
                  @{creator.username}
                </PulseText>
              </View>
              <View className='px-2.5 py-1 rounded-full bg-primary/10'>
                <PulseText variant='overline' className='text-primary'>
                  Créateur
                </PulseText>
              </View>
            </Pressable>
          ) : (
            <View className='p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700'>
              <View className='flex-row items-center gap-3'>
                <Skeleton className='w-12 h-12 rounded-full' />
                <View className='flex-1 gap-2'>
                  <Skeleton className='w-3/4 h-5 rounded-lg' />
                  <Skeleton className='w-1/2 h-4 rounded-md' />
                </View>
              </View>
            </View>
          )}
        </View>

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

        <InfoSection title='Détails' className='mx-4 mb-5'>
          <InfoRow icon='MapPinned' label='Adresse' value={club.address ?? '—'} />
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
          <InfoRow icon='Users' label='Membres' value={`${club.member_count}`} />
        </InfoSection>

        {!club.is_external && members.length > 0 ? (
          <View className='mx-4 mb-5'>
            <PulseText variant='overline' className='text-neutral-400 mb-2'>
              Membres ({members.length})
            </PulseText>
            <View className='px-1'>
              <ClubMembersStrip members={members} />
            </View>
          </View>
        ) : null}

        {!club.is_external && members.length > 0 ? (
          <View className='mx-4 mb-5'>
            <Button
              variant='secondary'
              leadingIcon='Users'
              title='Voir tous les membres'
              onPress={() => setShowMembersList(true)}
            />
          </View>
        ) : null}

        {!club.is_external && loadingAllMembers ? (
          <View className='mx-4 mb-5 items-center py-3'>
            <ActivityIndicator size='small' color='#3358FF' />
          </View>
        ) : null}

        {club.is_external && club.source_url ? (
          <View className='mx-4 mb-4'>
            <Pressable
              className='flex-row items-center gap-2'
              onPress={() => void WebBrowser.openBrowserAsync(club.source_url!)}
            >
              <Icon name='Globe' size={16} color='primary' />
              <PulseText variant='caption' className='text-primary font-medium'>
                {club.source_name ?? club.source_url}
              </PulseText>
            </Pressable>
          </View>
        ) : null}

        <View className='mx-4 mb-10 gap-2.5'>
          <View className='flex-row gap-3'>
            <View className='flex-1'>
              <Button
                title='Partager'
                variant='secondary'
                onPress={() => void Share.share({ message: club.name })}
                leadingIcon='Share2'
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
        <Icon name={icon as any} size={18} color='text-secondary' />
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
