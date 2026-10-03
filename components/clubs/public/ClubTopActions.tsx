import React, { createContext, useContext, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { IconButton, type IconButtonTone } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { cn } from '@/utils/format';

type IconTone = 'default' | 'primary' | 'danger';

/** Width threshold in px below which pill buttons collapse to icon-only circles. */
const COMPACT_MAX_W = 220;

/** When true, pill buttons collapse to icon-only circles. Provided by ClubTopActions via onLayout. */
const ClubTopCompactCtx = createContext(false);
export function useClubTopCompact() {
  return useContext(ClubTopCompactCtx);
}

/**
 * Round icon button for club top headers — matches the like/share
 * floating chips and the existing header settings circle.
 */
export function ClubTopIconButton({
  icon,
  onPress,
  label,
  tone = 'default',
  disabled,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  tone?: IconTone;
  disabled?: boolean;
}) {
  // Rendered through the canonical <IconButton> so these header circles share
  // the exact hover/focus lift + spring timing of every other icon button in
  // the app (see components/ui/IconButton.tsx). `tone` maps onto its token
  // families; the dark-mode `*-dark` variants come from the token classes.
  const iconButtonTone: IconButtonTone =
    tone === 'primary' ? 'solid' : tone === 'danger' ? 'danger' : 'neutral';
  return (
    <IconButton
      icon={icon}
      label={label}
      onPress={onPress}
      disabled={disabled}
      tone={iconButtonTone}
      iconSize={20}
      className='w-11 h-11'
    />
  );
}
type PillTone = 'primary' | 'secondary' | 'ghost';

const pillClass: Record<PillTone, string> = {
  primary: 'bg-primary dark:bg-primary-dark active:opacity-85',
  secondary: 'bg-primary/10 dark:bg-primary/15 active:bg-primary/20',
  ghost: 'bg-neutral-100 dark:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700',
};

/** Compact-tone mapping so the icon button looks right when a pill collapses. */
const pillToIconTone: Record<PillTone, IconButtonTone> = {
  primary: 'solid',
  secondary: 'primary',
  ghost: 'neutral',
};

/**
 * Rounded pill text button for the club top header — used for the single
 * primary CTA (Join / Request sent / Member / Edit) so it reads as one
 * tap target next to the round icon buttons.
 *
 * When the action bar is too narrow, `compact` drops the text label
 * and renders an icon-only circle instead of a text pill.
 */
export function ClubTopPillButton({
  label,
  icon,
  onPress,
  tone = 'primary',
  disabled,
  loading,
  compact,
}: {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  tone?: PillTone;
  disabled?: boolean;
  loading?: boolean;
  /** Force icon-only mode regardless of width. */
  compact?: boolean;
}) {
  const ctxCompact = useClubTopCompact();
  const isCompact = compact ?? ctxCompact;
  const isDisabled = disabled || loading;

  if (isCompact && icon) {
    // Collapse to icon-only circle matching ClubTopIconButton.
    return (
      <IconButton
        icon={icon}
        label={label}
        onPress={onPress}
        disabled={isDisabled}
        tone={loading ? 'neutral' : pillToIconTone[tone]}
        iconSize={20}
        className='w-11 h-11'
      />
    );
  }

  const darkText = tone !== 'primary';
  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={6}
      scaleOnPress={0.96}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityState={isDisabled ? { disabled: true } : undefined}
      className={cn(
        'h-11 rounded-full px-4 flex-row items-center justify-center gap-1.5 shrink-0',
        pillClass[tone],
        isDisabled && 'opacity-70',
      )}
    >
      {loading ? (
        <ActivityIndicator size='small' color={darkText ? '#3358FF' : '#fff'} />
      ) : icon ? (
        <Icon
          name={icon}
          size={17}
          color={darkText ? 'primary' : 'white'}
        />
      ) : null}
      <PulseText
        variant='buttonLabel'
        numberOfLines={1}
        className={darkText ? 'text-primary dark:text-primary-dark' : 'text-white'}
      >
        {label}
      </PulseText>
    </PressableScale>
  );
}
/** Right-aligned cluster for header actions — icons + optional pill. */
export function ClubTopActions({ children }: { children: React.ReactNode }) {
  const [compact, setCompact] = useState(false);
  return (
    <ClubTopCompactCtx.Provider value={compact}>
      <View
        testID='club-top-actions'
        className='flex-row items-center gap-2 shrink-0 max-w-[70%]'
        onLayout={(e) => setCompact(e.nativeEvent.layout.width < COMPACT_MAX_W)}
      >
        {children}
      </View>
    </ClubTopCompactCtx.Provider>
  );
}