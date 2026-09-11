import React from 'react';
import { View } from 'react-native';
import { StatTile, type StatTileProps } from './ClubSharedUI';

export interface StatData {
  icon: StatTileProps['icon'];
  label: string;
  value: string;
  onPress?: 'members' | undefined;
}

interface ClubStatTilesProps {
  stats: StatData[];
  isWide: boolean;
  isMd: boolean;
  onMembersPress: () => void;
}

/** Responsive grid of stat tiles (members, favorites, events, requests). */
export function ClubStatTiles({ stats, isWide, isMd, onMembersPress }: ClubStatTilesProps) {
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
          onPress={s.onPress === 'members' ? onMembersPress : undefined}
        />
      ))}
    </View>
  );
}
