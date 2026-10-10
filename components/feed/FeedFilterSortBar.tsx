// ---------------------------------------------------------------------------
// PULSE FEED - Filter & Sort Bar
// ---------------------------------------------------------------------------
// A single header row:
//
//   [Logo]  [SearchBar (flex-1)]  [Filter]  [Sort]  [View toggle]
//
// The SearchBar is a plain, always-expanded field — exactly like the explore
// screen's. It filters the feed live as you type and opens NO panel. Its
// default hover (tint + glyph nudge) and click (blue border + one-step
// height grow) animations live inside the shared <SearchBar> and are driven
// by pointer events, so nothing special is wired here.
//
// The Filter and Sort buttons open their own inline panels (FeedFilterPanel /
// FeedSortPanel) via the callbacks below; the parent owns the open state.
// ---------------------------------------------------------------------------

import { View } from 'react-native';
import { Image } from 'expo-image';
import { t } from '@/hooks/useTranslation';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { SearchBar } from '@/components/shared/SearchBar';

export interface FeedFilterSortBarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSearchClear: () => void;
  onSubmitSearch: () => void;
  /** Whether the filter button shows its active dot. */
  filterActive: boolean;
  onFilterPress: () => void;
  /** Whether the sort button shows its active dot. */
  sortActive: boolean;
  onSortPress: () => void;
  isGridAvailable: boolean;
  viewMode: 'list' | 'grid';
  onToggleViewMode: () => void;
}

export function FeedFilterSortBar({
  searchValue,
  onSearchChange,
  onSearchClear,
  onSubmitSearch,
  filterActive,
  onFilterPress,
  sortActive,
  onSortPress,
  isGridAvailable,
  viewMode,
  onToggleViewMode,
}: FeedFilterSortBarProps) {
  return (
    <View className='flex-row items-center justify-between px-4 py-3 bg-bg dark:bg-bg-dark gap-3'>
      {/* Logo mark */}
      <View className='w-10 h-10 rounded-xs bg-primary items-center justify-center overflow-hidden shrink-0'>
        <Image
          source={require('@/assets/logo/pulse-logo-10-v3-20260828.png')}
          style={{ width: '100%', height: '100%' }}
          contentFit='cover'
        />
      </View>

      {/* Plain search bar — flex-1, no panel on press. */}
      <View className='flex-1 min-w-0'>
        <SearchBar
          value={searchValue}
          onChangeText={onSearchChange}
          onClear={onSearchClear}
          expanded
          autoFocus={false}
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
          color={filterActive ? 'primary' : 'text-secondary'}
        />
        {filterActive ? (
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
          color={sortActive ? 'primary' : 'text-secondary'}
        />
        {sortActive ? (
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
