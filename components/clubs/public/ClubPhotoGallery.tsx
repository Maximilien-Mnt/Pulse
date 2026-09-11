import React, { useState, useRef } from 'react';
import { View, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';

import type { ImageLoadEventData } from 'expo-image';

interface ClubPhotoGalleryProps {
  urls: string[];
  itemWidth: number;
  itemHeight: number;
}

/** Horizontal photo gallery with prev/next navigation overlay. */
export function ClubPhotoGallery({ urls, itemWidth, itemHeight }: ClubPhotoGalleryProps) {
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(0);
  // Natural aspect ratios, so each photo exactly fits the gallery height.
  const [ratios, setRatios] = useState<Record<number, number>>({});

  const go = (dir: -1 | 1) => {
    setIndex((prev) => {
      const next = Math.max(0, Math.min(urls.length - 1, prev + dir));
      listRef.current?.scrollToIndex({ index: next, animated: true });
      return next;
    });
  };

  const widthFor = (i: number) => {
    const ratio = ratios[i];
    if (!ratio) return Math.round(itemWidth * 0.55);
    return Math.round(Math.max(120, Math.min(itemWidth, itemHeight * ratio)));
  };

  const handleLoad = (e: ImageLoadEventData, i: number) => {
    const w = e?.source?.width;
    const h = e?.source?.height;
    if (w && h) {
      setRatios((prev) => (prev[i] ? prev : { ...prev, [i]: w / h }));
    }
  };

  return (
    <View className='relative'>
        <FlatList
          ref={listRef}
          horizontal
          data={urls}
          keyExtractor={(u, i) => `${u}-${i}`}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            const w = e.nativeEvent.layoutMeasurement.width;
            setIndex(Math.round(x / w));
          }}
          renderItem={({ item, index: i }) => (
            <Image
              source={{ uri: item }}
              style={{ width: widthFor(i), height: itemHeight }}
              className='rounded-2xl mr-3'
              contentFit='cover'
              onLoad={(e: ImageLoadEventData) => handleLoad(e, i)}
            />
          )}
        />
        {urls.length > 1 ? (
          <>
            {index > 0 ? (
              <PressableScale
                className='absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-neutral-900/90 items-center justify-center shadow-sm border border-neutral-200 dark:border-neutral-700'
                scaleOnPress={0.85}
                scaleOnHover={1.1}
                onPress={() => go(-1)}
                accessibilityRole='button'
                accessibilityLabel='Photo précédente'
              >
                <Icon name='ChevronLeft' size={20} color='text-primary' />
              </PressableScale>
            ) : null}
            {index < urls.length - 1 ? (
              <PressableScale
                className='absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-neutral-900/90 items-center justify-center shadow-sm border border-neutral-200 dark:border-neutral-700'
                scaleOnPress={0.85}
                scaleOnHover={1.1}
                onPress={() => go(1)}
                accessibilityRole='button'
                accessibilityLabel='Photo suivante'
              >
                <Icon name='ChevronRight' size={20} color='text-primary' />
              </PressableScale>
            ) : null}
          </>
        ) : null}
      </View>
  );
}
