import React from 'react';
import { View } from 'react-native';
import { StatTile, type StatTileProps } from './EventSharedUI';

export interface StatData {
  icon: StatTileProps['icon'];
  label: string;
  value: string;
  onPress?: 'participants' | undefined;
}

interface EventStatTilesProps {
  stats: StatData[];
  isWide: boolean;
  isMd: boolean;
  onParticipantsPress?: () => void;
}

/** Responsive grid of stat tiles (participants, favorites, price/spots). */
export function EventStatTiles({ stats, isWide, isMd, onParticipantsPress }: EventStatTilesProps) {
  return (
    <View className='flex-row flex-wrap gap-3 px-4 mb-5'>
      {stats.map((s) => (
        <StatTile
          key={s.label}
          icon={s.icon}
          label={s.label}
          value={s.value}
          minWidth={isMd ? 150 : 132}
          growBasis={isWide ? '23%' : '47%'}
          onPress={s.onPress === 'participants' ? onParticipantsPress : undefined}
        />
      ))}
    </View>
  );
}
