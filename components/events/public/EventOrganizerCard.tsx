import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text as PulseText } from '@/components/ui/Text';
import { Section, CARD } from './EventSharedUI';
import { useTranslation } from '@/hooks/useTranslation';
import type { EventCreator } from '@/lib/eventIdentity';

interface EventOrganizerCardProps {
  organizer: EventCreator | undefined;
  loading?: boolean;
}

/** Organizer card (person or club) shown above the description. */
export function EventOrganizerCard({ organizer, loading }: EventOrganizerCardProps) {
  const router = useRouter();
  const { t } = useTranslation();

  if (!organizer && !loading) return null;

  return (
    <Section title={t('events.organizer')} className='px-4 mb-5'>
      {organizer ? (
        <PressableScale
          onPress={() => router.push(organizer.kind === 'club' ? `/(tabs)/clubs/${organizer.id}` : `/profile/${organizer.id}`)}
          scaleOnPress={0.98}
          className={'flex-row items-center gap-3 p-4 ' + CARD + ' active:opacity-90'}
          accessibilityRole='button'
          accessibilityLabel={`${t('events.organizer')} ${organizer.full_name}`}
        >
          <Avatar size={48} uri={organizer.avatar_url} />
          <View className='flex-1'>
            <PulseText variant='body' className='font-semibold text-neutral-900 dark:text-neutral-50' numberOfLines={1}>
              {organizer.full_name}
            </PulseText>
            <PulseText variant='caption' className='text-neutral-500' numberOfLines={1}>
              {organizer.kind === 'club' ? t('create.event.clubAccount') : `@${organizer.username}`}
            </PulseText>
          </View>
          <View className='px-2.5 py-1 rounded-full bg-primary/10'>
            <PulseText variant='overline' className='text-primary'>
              {t('members.creator')}
            </PulseText>
          </View>
        </PressableScale>
      ) : (
        <View className={'p-4 ' + CARD}>
          <View className='flex-row items-center gap-3'>
            <Skeleton className='w-12 h-12 rounded-full' />
            <View className='flex-1 gap-2'>
              <Skeleton className='w-3/4 h-5 rounded-lg' />
              <Skeleton className='w-1/2 h-4 rounded-md' />
            </View>
          </View>
        </View>
      )}
    </Section>
  );
}
