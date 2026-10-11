// ---------------------------------------------------------------------------
// PULSE FEED - Filter & Sort Bar + full-width expanding panel
// ---------------------------------------------------------------------------
// Header row: [Logo] [SearchBar] [Filter] [Sort] [View toggle]
//
// When filter/sort is tapped the bar reserves a NEW in-flow block directly
// below the row (full width, same grey as the buttons). The block pushes the
// list down so it can never hide behind other elements, grows/shrinks with
// the panel's collapsible sections, and shares one continuous grey surface
// with the button that opened it (no border, no gap).
// ---------------------------------------------------------------------------

import { View } from 'react-native';
import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { t } from '@/hooks/useTranslation';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { SearchBar } from '@/components/shared/SearchBar';
import { cn } from '@/utils/format';

const PANEL_GREY = 'bg-neutral-100 dark:bg-neutral-800';

export interface FeedFilterSortBarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSearchClear: () => void;
  onSubmitSearch: () => void;
  filterActive: boolean;
  onFilterPress: () => void;
  sortActive: boolean;
  onSortPress: () => void;
  isGridAvailable: boolean;
  viewMode: 'list' | 'grid';
  onToggleViewMode: () => void;
  filterOpen: boolean;
  sortOpen: boolean;
  filterPanel?: ReactNode;
  sortPanel?: ReactNode;
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
  filterOpen,
  sortOpen,
  filterPanel,
  sortPanel,
}: FeedFilterSortBarProps) {
  const activePanel = filterOpen ? filterPanel : sortOpen ? sortPanel : null;
  const panelOpen = activePanel != null && (filterOpen || sortOpen);

  return (
    <View className="w-full bg-bg dark:bg-bg-dark">
      {/* Button row — turns the panel grey while open so row + panel read as one body */}
      <View
        className={cn(
          'flex-row items-center justify-between px-4 py-3 gap-3',
          panelOpen && PANEL_GREY,
        )}
      >
        <View className="w-10 h-10 rounded-xs bg-primary items-center justify-center overflow-hidden shrink-0">
          <Image
            source={require('@/assets/logo/pulse-logo-10-v3-20260828.png')}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        </View>

        <View className="flex-1 min-w-0">
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

        {/* Filter — open: square bottom corners melt into the panel below */}
        <PressableScale
          onPress={onFilterPress}
          scaleOnPress={0.9}
          scaleOnHover={1.06}
          accessibilityRole="button"
          accessibilityLabel={t('feed.filter')}
          className={cn(
            'relative w-11 h-11 items-center justify-center shrink-0 transition-colors duration-150',
            filterOpen
              ? 'bg-neutral-100 dark:bg-neutral-800 rounded-t-full rounded-b-none'
              : 'bg-neutral-100 dark:bg-neutral-800 rounded-full active:bg-neutral-200 dark:active:bg-neutral-700',
          )}
        >
          <Icon
            name="ListFilter"
            size={20}
            color={filterActive ? 'primary' : 'text-secondary'}
          />
          {filterActive ? (
            <View className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
          ) : null}
        </PressableScale>

        {/* Sort — same connected behaviour */}
        <PressableScale
          onPress={onSortPress}
          scaleOnPress={0.9}
          scaleOnHover={1.06}
          accessibilityRole="button"
          accessibilityLabel={t('feed.sort')}
          className={cn(
            'relative w-11 h-11 items-center justify-center shrink-0 transition-colors duration-150',
            sortOpen
              ? 'bg-neutral-100 dark:bg-neutral-800 rounded-t-full rounded-b-none'
              : 'bg-neutral-100 dark:bg-neutral-800 rounded-full active:bg-neutral-200 dark:active:bg-neutral-700',
          )}
        >
          <Icon
            name="ArrowUpDown"
            size={20}
            color={sortActive ? 'primary' : 'text-secondary'}
          />
          {sortActive ? (
            <View className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
          ) : null}
        </PressableScale>

        {isGridAvailable ? (
          <IconButton
            icon={viewMode === 'list' ? 'PanelLeft' : 'PanelBottom'}
            iconSize={20}
            size="md"
            tone="neutral"
            label={viewMode === 'list' ? t('common.viewList') : t('common.viewGrid')}
            onPress={onToggleViewMode}
          />
        ) : null}
      </View>

      {/* Expanding slot: full width, in-flow, same grey, no border. Mounted only
          while open — reserves space (pushes content down) and collapses fully
          on close; height follows the panel's own collapsible sections. */}
      {panelOpen ? (
        <View className={cn('w-full', PANEL_GREY)}>{activePanel}</View>
      ) : null}
    </View>
  );
}
