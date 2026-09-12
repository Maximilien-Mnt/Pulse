import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { t } from '@/hooks/useTranslation';
import type { ClubDetailRow } from '@/hooks/clubProjections';
import type { JoinRequestStatus } from '@/hooks/useJoinRequestStatus';

interface FavoriteToggleContract {
  mutate: () => void;
  isPending: boolean;
}

interface ClubHeroBarProps {
  club: ClubDetailRow;
  cover: string | null | undefined;
  coverH: number;
  isFavorited: boolean;
  favCount: number;
  isFavPending: boolean;
  onToggle: () => void;
  onShare: () => void;
  isCreator: boolean;
  joinStatus: JoinRequestStatus | undefined;
  joinMut: FavoriteToggleContract;
  onCreatorAction: () => void;
}

/** Hero cover image with floating like / share / join buttons overlay. */
export function ClubHeroBar({
  club,
  cover,
  coverH,
  isFavorited,
  favCount,
  isFavPending,
  onToggle,
  onShare,
  isCreator,
  joinStatus,
  joinMut,
  onCreatorAction,
}: ClubHeroBarProps) {
  const handleActionPress = () => {
    if (isCreator) {
      onCreatorAction();
    } else if (!joinStatus?.isMember && !joinStatus?.isPending) {
      joinMut.mutate();
    }
  };

  return (
    <View className='px-4 pt-3'>
      <View className='relative'>
        {cover ? (
          <Image source={{ uri: cover }} className='w-full rounded-2xl' style={{ height: coverH }} contentFit='cover' />
        ) : (
          <View
            className='w-full rounded-2xl bg-neutral-200 dark:bg-neutral-700 items-center justify-center'
            style={{ height: coverH - 40 }}
          >
            <Icon name='Image' size={32} color='text-tertiary' />
          </View>
        )}
        {/* Like & share buttons — far right, on the cover/content limit */}
        <View className='absolute right-3 -bottom-6 flex-row items-center gap-2'>
          <View>
            <PressableScale
              onPress={onToggle}
              scaleOnPress={0.85}
              scaleOnHover={1.1}
              disabled={isFavPending}
              accessibilityRole='button'
              accessibilityLabel={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              accessibilityState={{ selected: !!isFavorited, disabled: isFavPending }}
              hitSlop={6}
              className='w-12 h-12 rounded-full bg-white dark:bg-neutral-800 items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm active:bg-primary/15'
            >
              <Icon name='Heart' size={24} color={isFavorited ? 'primary' : 'text-secondary'} active={!!isFavorited} />
            </PressableScale>
            {favCount > 0 ? (
              <View
                className='absolute -bottom-1 -right-1 rounded-full bg-primary items-center justify-center border-2 border-white dark:border-[#0A0F1C]'
                style={{ minWidth: 20, height: 20, paddingHorizontal: 4 }}
              >
                <PulseText variant='caption' className='text-white font-semibold tabular-nums' style={{ fontSize: 10 }} numberOfLines={1}>
                  {favCount > 99 ? '99+' : favCount}
                </PulseText>
              </View>
            ) : null}
          </View>
          <PressableScale
            onPress={onShare}
            scaleOnPress={0.85}
            scaleOnHover={1.1}
            accessibilityRole='button'
            accessibilityLabel='Partager'
            hitSlop={6}
            className='w-12 h-12 rounded-full bg-white dark:bg-neutral-800 items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm active:bg-primary/15'
          >
            <Icon name='Share2' size={22} color='primary' />
          </PressableScale>
          <PressableScale
            onPress={handleActionPress}
            disabled={joinStatus?.isPending || joinMut.isPending}
            scaleOnPress={0.85}
            scaleOnHover={1.1}
            accessibilityRole='button'
            accessibilityLabel={isCreator ? 'Supprimer' : joinStatus?.isPending ? 'Demande envoyée' : 'Rejoindre'}
            hitSlop={6}
            className={`h-12 rounded-full items-center justify-center border shadow-sm px-5 ${isCreator ? 'bg-red-500 border-red-500' : joinStatus?.isPending ? 'bg-neutral-200 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-700' : 'bg-primary border-primary'}`}
          >
            <PulseText variant='body' className={`font-semibold ${isCreator || joinStatus?.isPending ? 'text-white dark:text-neutral-300' : 'text-white'}`}>
              {isCreator ? t('clubs.dashboard.deleteClub') : joinStatus?.isPending ? t('clubJoin.requestSent') : club.is_private ? t('clubs.joinRequest') : t('clubs.join')}
            </PulseText>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}
