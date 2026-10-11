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
      {/* Button row — always stays on bg-bg; only the open button bridges down
          to the panel via its own narrow tab (no full-row grey wash). */}
      <View className="flex-row items-center justify-between px-4 py-3 gap-3">
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

        {/* Filter — open: button stays a full pill; a narrow stadium tab drops
            from inside the button into the card below, flanked by two
            background-coloured fillets that round the concave junction. */}
        <View className="relative shrink-0">
          <PressableScale
            onPress={onFilterPress}
            scaleOnPress={0.9}
            scaleOnHover={1.06}
            accessibilityRole="button"
            accessibilityLabel={t('feed.filter')}
            className={cn(
              'relative w-11 h-11 items-center justify-center shrink-0 transition-colors duration-150',
              'bg-neutral-100 dark:bg-neutral-800 rounded-full active:bg-neutral-200 dark:active:bg-neutral-700',
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
          {filterOpen && panelOpen ? (
            <>
              <View
                pointerEvents="none"
                aria-hidden
                className="bg-neutral-100 dark:bg-neutral-800"
                style={{ position: 'absolute', top: 30, left: 8, right: 8, height: 36, zIndex: 10 }}
              />
              {/* Left fillet: bg-bg square hugging the card top; grey quadrant
                  tucked at its top-right so the curve opens concave left. */}
              <View
                pointerEvents="none"
                aria-hidden
                className="bg-bg dark:bg-bg-dark overflow-hidden"
                style={{ position: 'absolute', top: 44, left: 8, width: 12, height: 12, zIndex: 11 }}
              >
                <View
                  aria-hidden
                  className="bg-neutral-100 dark:bg-neutral-800 rounded-full"
                  style={{ position: 'absolute', left: 0, top: -12, width: 24, height: 24 }}
                />
              </View>
              {/* Right fillet: mirrored — grey quadrant at top-left, concave right. */}
              <View
                pointerEvents="none"
                aria-hidden
                className="bg-bg dark:bg-bg-dark overflow-hidden"
                style={{ position: 'absolute', top: 44, left: 24, width: 12, height: 12, zIndex: 11 }}
              >
                <View
                  aria-hidden
                  className="bg-neutral-100 dark:bg-neutral-800 rounded-full"
                  style={{ position: 'absolute', left: -12, top: -12, width: 24, height: 24 }}
                />
              </View>
            </>
          ) : null}
        </View>

        {/* Sort — same connected behaviour */}
        <View className="relative shrink-0">
          <PressableScale
            onPress={onSortPress}
            scaleOnPress={0.9}
            scaleOnHover={1.06}
            accessibilityRole="button"
            accessibilityLabel={t('feed.sort')}
            className={cn(
              'relative w-11 h-11 items-center justify-center shrink-0 transition-colors duration-150',
              'bg-neutral-100 dark:bg-neutral-800 rounded-full active:bg-neutral-200 dark:active:bg-neutral-700',
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
          {sortOpen && panelOpen ? (
            <>
              <View
                pointerEvents="none"
                aria-hidden
                className="bg-neutral-100 dark:bg-neutral-800"
                style={{ position: 'absolute', top: 30, left: 8, right: 8, height: 36, zIndex: 10 }}
              />
              {/* Left fillet: grey quadrant tucked top-right, concave opening left. */}
              <View
                pointerEvents="none"
                aria-hidden
                className="bg-bg dark:bg-bg-dark overflow-hidden"
                style={{ position: 'absolute', top: 44, left: 8, width: 12, height: 12, zIndex: 11 }}
              >
                <View
                  aria-hidden
                  className="bg-neutral-100 dark:bg-neutral-800 rounded-full"
                  style={{ position: 'absolute', left: 0, top: -12, width: 24, height: 24 }}
                />
              </View>
              {/* Right fillet: mirrored, concave opening right. */}
              <View
                pointerEvents="none"
                aria-hidden
                className="bg-bg dark:bg-bg-dark overflow-hidden"
                style={{ position: 'absolute', top: 44, left: 24, width: 12, height: 12, zIndex: 11 }}
              >
                <View
                  aria-hidden
                  className="bg-neutral-100 dark:bg-neutral-800 rounded-full"
                  style={{ position: 'absolute', left: -12, top: -12, width: 24, height: 24 }}
                />
              </View>
            </>
          ) : null}
        </View>

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

      {/* Expanding slot: inset card — same px-4 width as the header row,
          rounded-2xl like the app's popover cards, clipped so the panel
          content follows the card radius. Mounted only while open. */}
      {panelOpen ? (
        <View className="px-4 pb-2">
          <View className={cn('w-full overflow-hidden rounded-2xl', PANEL_GREY)}>{activePanel}</View>
        </View>
      ) : null}
    </View>
  );
}
