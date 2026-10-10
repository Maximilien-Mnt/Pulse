// ---------------------------------------------------------------------------
// PULSE FEED - Filter & Sort Bar
// ---------------------------------------------------------------------------
// Separates the search bar from filter/sort controls into a clean row:
//
//   [Logo]  [SearchBar (flex-1)]  [Filter]  [Sort]  [View toggle]
//
// The SearchBar retains its default hover (tint + glyph nudge) and click
// (blue border + one-step height grow) animations - these are built into
// the shared <SearchBar> component and triggered by pointer events, so no
// special wiring is needed here.
// ---------------------------------------------------------------------------

import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation, t } from '@/hooks/useTranslation';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { SearchBar } from '@/components/shared/SearchBar';
import type { SearchOptions } from '@/components/feed/SearchPanel';

export interface FeedFilterSortBarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSearchClear: () => void;
  onSearchPress: () => void;
  onSearchCollapse: () => void;
  onSubmitSearch: () => void;
  searchExpanded: boolean;
  /** Active filter/sort options from the SearchPanel - used to show dots. */
  searchOptions: SearchOptions;
  onFilterPress: () => void;
  onSortPress: () => void;
  isGridAvailable: boolean;
  viewMode: 'list' | 'grid';
  onToggleViewMode: () => void;
}

export function FeedFilterSortBar({
  searchValue,
  onSearchChange,
  onSearchClear,
  onSearchPress,
  onSearchCollapse,
  onSubmitSearch,
  searchExpanded,
  searchOptions,
  onFilterPress,
  onSortPress,
  isGridAvailable,
  viewMode,
  onToggleViewMode,
}: FeedFilterSortBarProps) {
  const hasActiveFilters =
    searchOptions.formats.length > 0 ||
    searchOptions.tag.trim() !== '' ||
    searchOptions.scopes.length > 2;

  const hasActiveSort = searchOptions.sort !== 'relevance';

  return (
    <View className='flex-row items-center justify-between px-4 py-3 bg-bg dark:bg-bg-dark gap-3'>
      {/* Logo mark - Activity icon in rounded square */}
      <View className='w-10 h-10 rounded-xs bg-primary items-center justify-center overflow-hidden shrink-0'>
        <Image
          source={require('@/assets/logo/pulse-logo-10-v3-20260828.png')}
          style={{ width: '100%', height: '100%' }}
          contentFit='cover'
        />
      </View>

      {/* Search bar - flex-1, takes all remaining horizontal space.
          Hover + click animations live inside <SearchBar>. */}
      <View className='flex-1 min-w-0'>
        <SearchBar
          value={searchValue}
          onChangeText={onSearchChange}
          onClear={onSearchClear}
          onCollapse={onSearchCollapse}
          onPress={onSearchPress}
          expanded={searchExpanded}
          onSubmitEditing={onSubmitSearch}
          placeholder={t('feed.searchPlaceholder')}
        />
      </View>

      {/* - Filter button - */}
      <PressableScale
        onPress={onFilterPress}
        scaleOnPress={0.9}
        scaleOnHover={1.06}
        accessibilityRole='button'
        accessibilityLabel={t('feed.filter')}
        className='relative w-11 h-11 rounded-full items-center justify-center shrink-0 bg-neutral-100 dark:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors duration-150'
      >
        <Icon
          name='ListFilter'
          size={20}
          color={hasActiveFilters ? 'primary' : 'text-secondary'}
        />
        {hasActiveFilters ? (
          <View className='absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary' />
        ) : null}
      </PressableScale>

      {/* - Sort button - */}
      <PressableScale
        onPress={onSortPress}
        scaleOnPress={0.9}
        scaleOnHover={1.06}
        accessibilityRole='button'
        accessibilityLabel={t('feed.sort')}
        className='relative w-11 h-11 rounded-full items-center justify-center shrink-0 bg-neutral-100 dark:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors duration-150'
      >
        <Icon
          name='ArrowUpDown'
          size={20}
          color={hasActiveSort ? 'primary' : 'text-secondary'}
        />
        {hasActiveSort ? (
          <View className='absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary' />
        ) : null}
      </PressableScale>

      {/* - View mode toggle (grid available only) - */}
      {isGridAvailable ? (
        <IconButton
          icon={viewMode === 'list' ? 'PanelLeft' : 'PanelBottom'}
          iconSize={20}
          size='md'
          tone='neutral'
          label={viewMode === 'list' ? t('common.viewList') : t('common.viewGrid')}
          onPress={onToggleViewMode}
        />
      ) : null}
    </View>
  );
}
