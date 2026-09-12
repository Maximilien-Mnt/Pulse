import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { Section, CARD } from './ClubSharedUI';
import type { ClubMember } from '@/hooks/useClubMembers';
import type { ClubDetailRow } from '@/hooks/clubProjections';

interface CreatorProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

interface ClubMembersPreviewProps {
  club: ClubDetailRow;
  creator: CreatorProfile | undefined;
  members: ClubMember[];
}

/** Club members that wrap as chips, creator highlighted, with a see-all button. */
export function ClubMembersPreview({ club, creator, members }: ClubMembersPreviewProps) {
  const router = useRouter();

  if (club.is_external || members.length === 0) return null;

  return (
    <Section title={`Membres (${members.length})`} className='px-4 mb-5'>
      <View className='flex-row flex-wrap gap-2.5'>
        {members.map((m) => {
          const isCreatorItem = !!creator && m.user_id === creator.id;
          return (
            <PressableScale
              key={m.user_id}
              onPress={() => router.push(`/profile/${m.user_id}`)}
              scaleOnPress={0.95}
              scaleOnHover={1.04}
              accessibilityRole='button'
              accessibilityLabel={`Voir le profil de ${m.full_name}`}
              className={'flex-row items-center gap-2.5 py-2 pl-2 pr-3.5 rounded-full ' + CARD}
            >
              <View className='relative'>
                <View className={isCreatorItem ? 'p-0.5 rounded-full bg-primary' : ''}>
                  <Avatar uri={m.avatar_url} size={36} />
                </View>
                {isCreatorItem ? (
                  <View className='absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-primary items-center justify-center' style={{ width: 18, height: 18 }}>
                    <Icon name='Star' size={10} color='white' filled />
                  </View>
                ) : null}
              </View>
              <View className='min-w-0'>
                <PulseText variant='caption' className='text-neutral-800 dark:text-neutral-100 font-medium' numberOfLines={1} style={{ maxWidth: 110 }}>
                  {m.full_name}
                </PulseText>
                {isCreatorItem ? (
                  <PulseText variant='caption' className='text-primary' numberOfLines={1}>
                    Fondateur
                  </PulseText>
                ) : null}
              </View>
            </PressableScale>
          );
        })}
      </View>
      <PressableScale
        onPress={() => router.push(`/(tabs)/clubs/${club.id}/members`)}
        scaleOnPress={0.97}
        scaleOnHover={1.03}
        accessibilityRole='button'
        accessibilityLabel='Voir tous les membres'
        className='flex-row items-center gap-2 mt-3 self-start px-4 py-2.5 rounded-full bg-primary/10 dark:bg-primary/15 active:bg-primary/25'
      >
        <Icon name='Users' size={16} color='primary' />
        <PulseText variant='body' className='text-primary font-medium'>
          Voir tous les membres
        </PulseText>
        <Icon name='ChevronRight' size={16} color='primary' />
      </PressableScale>
    </Section>
  );
}
