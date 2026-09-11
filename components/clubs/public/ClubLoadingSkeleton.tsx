import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';

/** Loading skeleton shown while the club data is being fetched. */
export function ClubLoadingSkeleton() {
  return (
    <View className='px-4 pt-4 gap-3'>
      <Skeleton className='w-full h-48 rounded-2xl' />
      <View className='flex-row items-center gap-3'>
        <Skeleton className='w-[72px] h-[72px] rounded-3xl' />
        <View className='flex-1 gap-2'>
          <Skeleton className='w-3/4 h-7 rounded-lg' />
          <Skeleton className='w-1/2 h-4 rounded-md' />
        </View>
      </View>
      <Skeleton className='w-full h-24 rounded-2xl' />
      <Skeleton className='w-full h-12 rounded-xl' />
    </View>
  );
}
