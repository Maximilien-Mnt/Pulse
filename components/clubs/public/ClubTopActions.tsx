import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Icon, type IconColor, type IconName } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { cn } from '@/utils/format';

type IconTone = 'default' | 'primary' | 'danger';

const toneClass: Record<IconTone, string> = {
  default: 'bg-neutral-100 dark:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700',
  primary: 'bg-primary dark:bg-primary-dark active:opacity-80',
  danger: 'bg-error-600/10 dark:bg-error-dark/15 active:bg-error-600/20',
};

const toneIcon: Record<IconTone, IconColor> = {
  default: 'text-secondary',
  primary: 'white',
  danger: 'error-500',
};

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
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      scaleOnPress={0.9}
      scaleOnHover={1.08}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityState={disabled ? { disabled: true } : undefined}
      className={cn(
        'w-11 h-11 rounded-full items-center justify-center shrink-0',
        toneClass[tone],
        disabled && 'opacity-50',
      )}
    >
      <Icon name={icon} size={20} color={toneIcon[tone]} />
    </PressableScale>
  );
}

type PillTone = 'primary' | 'secondary' | 'ghost';

const pillClass: Record<PillTone, string> = {
  primary: 'bg-primary dark:bg-primary-dark active:opacity-85',
  secondary: 'bg-primary/10 dark:bg-primary/15 active:bg-primary/20',
  ghost: 'bg-neutral-100 dark:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700',
};

/**
 * Rounded pill text button for the club top header — used for the single
 * primary CTA (Join / Request sent / Member / Edit) so it reads as one
 * tap target next to the round icon buttons.
 */
export function ClubTopPillButton({
  label,
  icon,
  onPress,
  tone = 'primary',
  disabled,
  loading,
}: {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  tone?: PillTone;
  disabled?: boolean;
  loading?: boolean;
}) {
  const isDisabled = disabled || loading;
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
  return (
    <View className='flex-row items-center gap-2 shrink-0 max-w-[70%]'>
      {children}
    </View>
  );
}
