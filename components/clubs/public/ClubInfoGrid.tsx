import React from 'react';
import { View, Text } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { SportBadge, InfoRow } from './ClubSharedUI';
import { type Club } from '@/types';
import { sanitizeOpeningHours } from '@/lib/openingHours';
import { getCountryDisplay } from '@/utils/countries';
import { ClubOpeningHoursDisplay } from '@/components/clubs/ClubOpeningHours';
import { t } from '@/hooks/useTranslation';

export type LevelRow = { sport: string; level: string };

const CARD =
  'bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700';

interface ClubInfoGridProps {
  club: Club;
  isWide: boolean;
  levelRows: LevelRow[];
}

/** Responsive grid of info cards: location, league, founding, age, levels, hours. */
export function ClubInfoGrid({ club, isWide, levelRows }: ClubInfoGridProps) {
  return (
    <View className='flex-row flex-wrap gap-3 px-4 mb-5'>
      {/* Location */}
      {(club.city || club.country || club.address || club.postal_code) ? (
        <View style={{ flexGrow: 1, flexBasis: isWide ? '47%' : '100%' }} className={CARD + ' p-4'}>
          <View className='flex-row items-center gap-2 mb-3'>
            <Icon name='MapPin' size={16} color='primary' />
            <PulseText variant='overline' className='text-neutral-400'>Localisation</PulseText>
          </View>
          <View className='flex-row items-center gap-2'>
            <Text className='text-base'>
              {club.country ? getCountryDisplay(club.country).split(' ')[0] : ''}
            </Text>
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
        <View style={{ flexGrow: 1, flexBasis: isWide ? '47%' : '100%' }} className={CARD + ' p-4'}>
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
        <View style={{ flexGrow: 1, flexBasis: isWide ? '47%' : '100%' }} className={CARD + ' p-4'}>
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
        <View style={{ flexGrow: 1, flexBasis: isWide ? '47%' : '100%' }} className={CARD + ' p-4'}>
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
        <View style={{ flexGrow: 1, flexBasis: isWide ? '47%' : '100%' }} className={CARD + ' p-4'}>
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
        <View style={{ flexGrow: 1, flexBasis: '100%' }} className={CARD + ' p-4'}>
          <View className='flex-row items-center gap-2 mb-2'>
            <Icon name='Clock' size={16} color='primary' />
            <PulseText variant='overline' className='text-neutral-400'>{t('clubs.hours.title')}</PulseText>
          </View>
          <ClubOpeningHoursDisplay slots={club.opening_hours ?? []} />
        </View>
      ) : null}
    </View>
  );
}