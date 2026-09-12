import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text as PulseText } from '@/components/ui/Text';
import { Section, CARD } from './ClubSharedUI';
import type { ClubDetailRow } from '@/hooks/clubProjections';

interface CreatorProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

interface ClubDescriptionCardProps {
  club: ClubDetailRow;
  creator: CreatorProfile | undefined;
}

/** Long description card with optional founder attribution. */
export function ClubDescriptionCard({ club, creator }: ClubDescriptionCardProps) {
  const router = useRouter();

  if (!club.description) return null;

  return (
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
  );
}

