import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { Pill, SportBadge, SourcePill } from './ClubSharedUI';
import { type Club } from '@/types';

interface ClubIdentityProps {
  club: Club;
  shortDesc: string | null;
  sports: string[];
}

/** Logo, title, short description, sport labels, source pill, and privacy pill. */
export function ClubIdentity({ club, shortDesc, sports }: ClubIdentityProps) {
  return (
    <View className='px-5 mb-5'>
      {/* Overlapping logo above the card */}
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
  );
}
