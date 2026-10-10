import React from 'react';
import { View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { CARD, InfoRow, SportBadge } from './EventSharedUI';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateLong, formatTime } from '@/utils/date';
import type { EventRow } from '@/types';

export type LevelRow = { sport: string; label: string; level: string };

interface EventInfoGridProps {
  event: EventRow;
  isWide: boolean;
  levelRows: LevelRow[];
  /** Full place string (address, postal code, city, country). */
  placeValue: string;
  /** "Places" value, or null when the row must be hidden (imported rows). */
  placesLabel: string | null;
}

/** Responsive grid of info cards: when, where, then the details list. */
export function EventInfoGrid({
  event,
  isWide,
  levelRows,
  placeValue,
  placesLabel,
}: EventInfoGridProps) {
  const { t } = useTranslation();

  return (
    <View className='px-4 mb-5 gap-3'>
      {/* When — date & time, always shown */}
      <View style={{ flexGrow: 1, flexBasis: isWide ? '47%' : '100%' }} className={CARD + ' p-4'}>
        <View className='flex-row items-center gap-2 mb-2'>
          <Icon name='Clock' size={16} color='primary' />
          <PulseText variant='overline' className='text-neutral-400'>{t('events.date')}</PulseText>
        </View>
        <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100 font-medium'>
          {formatDateLong(event.start_date)}
        </PulseText>
        <PulseText variant='caption' className='text-neutral-500 mt-0.5'>
          {formatTime(event.start_date)}
          {event.end_date ? ` → ${formatDateLong(event.end_date)} · ${formatTime(event.end_date)}` : ''}
        </PulseText>
      </View>

      {/* Where — location, when known */}
      {placeValue ? (
        <View style={{ flexGrow: 1, flexBasis: isWide ? '47%' : '100%' }} className={CARD + ' p-4'}>
          <View className='flex-row items-center gap-2 mb-2'>
            <Icon name='MapPinned' size={16} color='primary' />
            <PulseText variant='overline' className='text-neutral-400'>{t('events.venue')}</PulseText>
          </View>
          <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100 font-medium'>
            {placeValue}
          </PulseText>
        </View>
      ) : null}

      {/* Details list — places, levels, league, contact, registration */}
      <View style={{ flexGrow: 1, flexBasis: '100%' }} className={CARD + ' p-4'}>
        <View className='flex-row items-center gap-2 mb-1'>
          <Icon name='Info' size={16} color='primary' />
          <PulseText variant='overline' className='text-neutral-400'>{t('common.details')}</PulseText>
        </View>
        {placesLabel != null ? <InfoRow icon='Users' label='Places' value={placesLabel} /> : null}
        {levelRows.length > 0
          ? levelRows.map((r) => (
              <View key={r.sport} className='flex-row items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0'>
                <View className='flex-row items-center gap-2'>
                  <Icon name='Shield' size={15} color='text-secondary' />
                  <PulseText variant='caption' className='text-neutral-400'>
                    {t('create.event.requiredLevel')}
                  </PulseText>
                </View>
                <View className='flex-row items-center gap-2'>
                  <SportBadge sport={r.sport} />
                  <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100 font-medium'>
                    {r.level}
                  </PulseText>
                </View>
              </View>
            ))
          : event.required_level ? (
              <InfoRow icon='Shield' label={t('events.requiredLevel')} value={event.required_level} />
            ) : null}
        {event.league ? <InfoRow icon='Trophy' label={t('forms.league')} value={event.league} /> : null}
        {(event.age_min != null || event.age_max != null) ? (
          <InfoRow
            icon='Users'
            label={t('common.ageRange')}
            value={`${event.age_min ?? '—'} – ${event.age_max ?? '—'} ans`}
          />
        ) : null}
        {event.contact_email ? <InfoRow icon='Mail' label={t('create.event.contactEmailShort')} value={event.contact_email} /> : null}
      </View>
    </View>
  );
}
