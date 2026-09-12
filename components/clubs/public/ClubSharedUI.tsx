import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon, ICON_MAP } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { SPORTS } from '@/lib/constants';
import type { SportDefinition } from '@/lib/constants';
import { t } from '@/hooks/useTranslation';

/**
 * Runtime-safe icon-name check. The design system's <Icon> silently falls back
 * to `Info` for unknown names; this reproduces that contract for callers that
 * hold plain strings (e.g. link rows built from club fields).
 */
const isIconName = (name: string): name is IconName => name in ICON_MAP;

export function resolveIconName(name: string): IconName {
  return isIconName(name) ? name : 'Info';
}

const CARD =
  'bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700';

export { CARD };

/** Section wrapper with an overline title. */
export function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={className}>
      <PulseText variant='overline' className='text-neutral-400 mb-2'>
        {title}
      </PulseText>
      {children}
    </View>
  );
}

/**
 * Uniform pill used for sport / source / visibility chips:
 * same height, same padding, same icon size and text style for all.
 */
export function Pill({
  icon,
  label,
  color,
  bgClass,
  bgStyle,
}: {
  icon: IconName;
  label: string;
  color: string;
  bgClass?: string;
  bgStyle?: { backgroundColor: string };
}) {
  return (
    <View
      className={'flex-row items-center gap-1.5 px-3 rounded-full self-start ' + (bgClass ?? '')}
      style={[{ height: 30 }, bgStyle]}
    >
      <Icon name={icon} size={14} color={color} />
      <PulseText variant='caption' className='font-semibold' style={{ color }} numberOfLines={1}>
        {label}
      </PulseText>
    </View>
  );
}

/** Sport badge rendered using the shared Pill component. */
export function SportBadge({ sport }: { sport: string }) {
  const definition: SportDefinition | undefined = SPORTS.find((s) => s.id === sport);
  const iconName: IconName = definition?.icon ?? 'Trophy';
  const color = definition?.color ?? '#3358FF';
  const label = definition?.label ?? sport;

  return (
    <Pill icon={iconName} label={label} color={color} bgStyle={{ backgroundColor: `${color}15` }} />
  );
}

/** Source chip (in-app vs external), rendered with the uniform Pill format. */
export function SourcePill({ isExternal }: { isExternal?: boolean }) {
  return isExternal ? (
    <Pill icon='Globe' label='Source externe' color='#F59E0B' bgClass='bg-warning/15' />
  ) : (
    <Pill icon='Smartphone' label={t('source.inApp')} color='#3358FF' bgClass='bg-primary/10' />
  );
}

// ---------------------------------------------------------------------------
// StatTile
// ---------------------------------------------------------------------------

export interface StatTileProps {
  /** Icon name; unknown names render as `Info` (same as <Icon>'s fallback). */
  icon: string;
  label: string;
  value: string;
  minWidth: number;
  growBasis: string;
  onPress?: () => void;
}

export function StatTile({ icon, label, value, minWidth, growBasis, onPress }: StatTileProps) {
  const resolvedIcon = resolveIconName(icon);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{ flexGrow: 1, flexBasis: growBasis, minWidth }}
      className={
        'p-3.5 rounded-2xl border ' +
        'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'
      }
    >
      <View className='flex-row items-center gap-2'>
        <View className='w-8 h-8 rounded-full bg-primary/10 items-center justify-center'>
          <Icon name={resolvedIcon} size={15} color='primary' />
        </View>
        <View className='flex-1 min-w-0'>
          <PulseText variant='stat' className='text-neutral-900 dark:text-neutral-50' numberOfLines={1}>
            {value}
          </PulseText>
          <PulseText variant='caption' className='text-neutral-400' numberOfLines={1}>
            {label}
          </PulseText>
        </View>
        {onPress ? <Icon name='ChevronRight' size={16} color='text-tertiary' /> : null}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// InfoRow
// ---------------------------------------------------------------------------

export interface InfoRowProps {
  /** Icon name; unknown names render as `Info` (same as <Icon>'s fallback). */
  icon: string;
  label: string;
  value: string;
}

export function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View className='flex-row items-start gap-3 py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0'>
      <View className='pt-1'>
        <Icon name={resolveIconName(icon)} size={15} color='text-secondary' />
      </View>
      <View className='flex-1 gap-0.5'>
        <PulseText variant='caption' className='text-neutral-400'>
          {label}
        </PulseText>
        <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100'>
          {value}
        </PulseText>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// LinkRow
// ---------------------------------------------------------------------------

export interface LinkRowData {
  /** Icon name; unknown names render as `Info` (same as <Icon>'s fallback). */
  icon: string;
  label: string;
  value: string;
  url: string;
}

export function LinkRow({
  icon,
  label,
  value,
  url,
  isLast = false,
}: LinkRowData & { isLast?: boolean }) {
  const DIVIDER = 'border-b border-neutral-100 dark:border-neutral-700';
  return (
    <PressableScale
      className={'flex-row items-center gap-3 p-4 active:bg-neutral-50 dark:active:bg-neutral-700/50 ' + (isLast ? '' : DIVIDER)}
      scaleOnPress={0.98}
      scaleOnHover={1.02}
      onPress={async () => {
        const { openBrowserAsync } = await import('expo-web-browser');
        await openBrowserAsync(url);
      }}
      accessibilityRole='link'
      accessibilityLabel={`${label} : ${value}`}
    >
      <View className='w-10 h-10 rounded-full bg-primary/10 items-center justify-center'>
        <Icon name={resolveIconName(icon)} size={18} color='primary' />
      </View>
      <View className='flex-1 min-w-0'>
        <PulseText variant='body' className='font-medium text-neutral-900 dark:text-neutral-50'>
          {label}
        </PulseText>
        <PulseText variant='caption' className='text-neutral-500' numberOfLines={1}>
          {value}
        </PulseText>
      </View>
      <Icon name='ArrowRight' size={18} color='text-secondary' />
    </PressableScale>
  );
}
