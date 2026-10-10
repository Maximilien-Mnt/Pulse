import React from 'react';
import { View } from 'react-native';
import { SafeScreen } from '@/components/shared/SafeScreen';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/hooks/useTranslation';

/** Loading skeleton shown while the event data is being fetched. */
export function EventLoadingSkeleton() {
  const { t } = useTranslation();
  return (
    <SafeScreen className='flex-1 bg-neutral-50 dark:bg-[#0A0F1C]'>
      <View className='px-4 pt-4 gap-3' testID='event-detail-skeleton' accessibilityLabel={t('common.loading')}>
        <Skeleton className='w-full h-48 rounded-2xl' />
        <View className='flex-row items-center gap-3'>
          <Skeleton className='w-[72px] h-[72px] rounded-3xl' />
          <View className='flex-1 gap-2'>
            <Skeleton className='w-3/4 h-7 rounded-lg' />
            <Skeleton className='w-1/2 h-4 rounded-md' />
          </View>
        </View>
        <Skeleton className='w-full h-24 rounded-2xl' />
        <Skeleton className='w-full h-32 rounded-2xl' />
        <Skeleton className='w-full h-12 rounded-xl' />
      </View>
    </SafeScreen>
  );
}

