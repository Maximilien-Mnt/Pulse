import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { Section, CARD } from './ClubSharedUI';
import { EventCard } from '@/components/events/EventCard';
import { t } from '@/hooks/useTranslation';
import type { EventRow } from '@/types';

interface ClubEventsSectionProps {
  upcomingEvents: EventRow[];
  pastEvents: EventRow[];
  eventsTab: 'upcoming' | 'past';
  setEventsTab: (tab: 'upcoming' | 'past') => void;
  eventsLoading: boolean;
}

/** Upcoming / Past events section with tab toggle and scrollable list. */
export function ClubEventsSection({
  upcomingEvents,
  pastEvents,
  eventsTab,
  setEventsTab,
  eventsLoading,
}: ClubEventsSectionProps) {
  const tabEvents = eventsTab === 'upcoming' ? upcomingEvents : pastEvents;

  return (
    <Section title={t('clubs.upcomingEvents')} className='px-4 mb-5'>
      {eventsLoading ? (
        <View className={'p-4 items-center ' + CARD}>
          <ActivityIndicator size='small' color='#3358FF' />
        </View>
      ) : (
        <View>
          {/* Tab toggle: Upcoming / Past (with counts) */}
          <View className='flex-row gap-2 mb-3'>
            {(['upcoming', 'past'] as const).map((tabKey) => {
              const count = tabKey === 'upcoming' ? upcomingEvents.length : pastEvents.length;
              const active = eventsTab === tabKey;
              return (
                <PressableScale
                  key={tabKey}
                  onPress={() => setEventsTab(tabKey)}
                  scaleOnPress={0.96}
                  accessibilityRole='button'
                  accessibilityLabel={t(tabKey === 'upcoming' ? 'events.upcoming' : 'events.past')}
                  className={'flex-row items-center gap-1.5 px-3 rounded-full ' + (active ? 'bg-primary/15' : 'bg-neutral-100 dark:bg-neutral-800')}
                  style={{ height: 30 }}
                >
                  <Icon name={tabKey === 'upcoming' ? 'Calendar' : 'Clock'} size={14} color={active ? 'primary' : 'text-secondary'} />
                  <PulseText variant='caption' className={'font-semibold ' + (active ? 'text-primary' : 'text-neutral-500')}>
                    {t(tabKey === 'upcoming' ? 'events.upcoming' : 'events.past')} ({count})
                  </PulseText>
                </PressableScale>
              );
            })}
          </View>
          {/* Scrollable, height-limited event list (or empty state) */}
          {tabEvents.length > 0 ? (
            <ScrollView
              style={{ maxHeight: 320 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              className={CARD + ' overflow-hidden'}
            >
              <View className='p-2 gap-2'>
                {tabEvents.map((item) => (
                  <EventCard key={item.id} event={item} compact />
                ))}
              </View>
            </ScrollView>
          ) : (
            <View className={CARD + ' p-6 items-center'}>
              <Icon name='Calendar' size={24} color='text-tertiary' />
              <PulseText variant='body' className='text-neutral-500 mt-2 text-center'>
                {eventsTab === 'upcoming' ? t('events.emptyUpcoming') : t('events.emptyPast')}
              </PulseText>
            </View>
          )}
        </View>
      )}
    </Section>
  );
}
