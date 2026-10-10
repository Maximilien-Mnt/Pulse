import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { EventMembersStrip } from '@/components/events/EventMembersStrip';
import { Section } from './EventSharedUI';
import { useTranslation } from '@/hooks/useTranslation';

export type Participant = {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
};

interface EventParticipantsSectionProps {
  participants: Participant[];
  count: number;
  loading: boolean;
  onSeeAll: () => void;
}

/** Participants strip (avatar stack) with a "see all" affordance. */
export function EventParticipantsSection({ participants, count, loading, onSeeAll }: EventParticipantsSectionProps) {
  const { t } = useTranslation();

  if (count <= 0 && !loading) return null;

  return (
    <Section title={`${t('events.participants')} (${count})`} className='px-4 mb-5'>
      {loading ? (
        <View className='p-4 items-center bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700' testID='event-detail-participants-loading'>
          <ActivityIndicator size='small' color='#3358FF' />
        </View>
      ) : (
        <EventMembersStrip participants={participants} count={count} onSeeAll={onSeeAll} />
      )}
    </Section>
  );
}
