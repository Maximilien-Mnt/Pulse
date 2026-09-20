import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Image } from 'expo-image';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ClubHeroBarProps {
  cover: string | null | undefined;
  coverH: number;
  isFavorited: boolean;
  favCount: number;
  isFavPending: boolean;
  onToggle: () => void;
  onShare: () => void;
}

/** Hero cover with small floating glass chips (favorite + share only). */
export function ClubHeroBar({
  cover,
  coverH,
  isFavorited,
  favCount,
  isFavPending,
  onToggle,
  onShare,
}: ClubHeroBarProps) {
  const reduceMotion = useReducedMotion();
  const pop = useRef(new Animated.Value(1)).current;
  const prevFav = useRef(isFavorited);

  // Heart pop on favorite toggle (borrowed spring feel, skipped on reduced motion).
  useEffect(() => {
    if (prevFav.current === isFavorited) return;
    prevFav.current = isFavorited;
    if (reduceMotion) {
      pop.setValue(1);
      return;
    }
    pop.setValue(isFavorited ? 0.6 : 1.3);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 320, useNativeDriver: true }).start();
  }, [isFavorited, pop, reduceMotion]);

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
        {/* Floating glass chips — top-right over the cover, compact, never overlapping content */}
        <View className='absolute right-3 top-3 flex-row items-center gap-2'>
          <View>
            <PressableScale
              onPress={onToggle}
              scaleOnPress={0.85}
              scaleOnHover={1.08}
              disabled={isFavPending}
              accessibilityRole='button'
              accessibilityLabel={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              accessibilityState={{ selected: !!isFavorited, disabled: isFavPending }}
              hitSlop={6}
              className='w-10 h-10 rounded-full bg-black/35 items-center justify-center border border-white/30 active:bg-black/50'
              style={{ opacity: isFavPending ? 0.6 : 1 }}
            >
              <Animated.View style={{ transform: [{ scale: pop }] }}>
                <Icon name='Heart' size={20} color='white' active={!!isFavorited} />
              </Animated.View>
            </PressableScale>
            {favCount > 0 ? (
              <View
                className='absolute -bottom-1.5 -right-1.5 rounded-full bg-primary items-center justify-center border-2 border-white dark:border-[#0A0F1C]'
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
            scaleOnHover={1.08}
            accessibilityRole='button'
            accessibilityLabel='Partager'
            hitSlop={6}
            className='w-10 h-10 rounded-full bg-black/35 items-center justify-center border border-white/30 active:bg-black/50'
          >
            <Icon name='Share2' size={19} color='white' />
          </PressableScale>
        </View>
      </View>
    </View>
  );
}
