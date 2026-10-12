import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { safeHttpUrl } from '@/utils/links';
import { Pill, SportBadge, SourcePill } from './EventSharedUI';
import { useTranslation } from '@/hooks/useTranslation';
import type { EventRow } from '@/types';

interface EventIdentityProps {
  event: EventRow;
  shortDesc: string | null;
  sports: string[];
  /** Organizing club display name, when the event belongs to a club. */
  organizingClub?: string | null;
}

/** Logo, title, short description, sport labels, source pill, and privacy pill. */
export function EventIdentity({ event, shortDesc, sports, organizingClub }: EventIdentityProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const isExternal = !!event.is_external;

  return (
    <View className='px-5 mb-5'>
      {/* Overlapping logo above the card */}
      <View className='-mt-10 self-start'>
        {event.logo_url ? (
          <PressableScale scaleOnHover={1.08} hoverOnly>
            <Image
              source={{ uri: event.logo_url }}
              className='w-20 h-20 rounded-3xl bg-white dark:bg-neutral-800'
              style={{ borderWidth: 4, borderColor: '#fff' }}
              contentFit='cover'
            />
          </PressableScale>
        ) : (
          <PressableScale scaleOnHover={1.08} hoverOnly>
            <View
              className='w-20 h-20 rounded-3xl bg-neutral-200 dark:bg-neutral-700 items-center justify-center'
              style={{ borderWidth: 4, borderColor: '#fff' }}
            >
              <Icon name='Calendar' size={24} color='text-tertiary' />
            </View>
          </PressableScale>
        )}
      </View>
      <View className='mt-2 flex-1 min-w-0'>
        <PulseText variant='h1' numberOfLines={2}>
          {event.name}
        </PulseText>
        {shortDesc ? (
          <PulseText variant='body' className='text-neutral-500 mt-1.5' numberOfLines={3}>
            {shortDesc}
          </PulseText>
        ) : null}
        <View className='flex-row flex-wrap gap-2 mt-3 items-center'>
          {sports.map((s) => (
            <SportBadge key={s} sport={s} />
          ))}
          {event.category ? (
            <Pill icon='Tag' label={event.category} color='#4A4F59' bgClass='bg-neutral-100 dark:bg-neutral-700' />
          ) : null}
          <SourcePill isExternal={event.is_external} />
          {event.is_private != null ? (
            <Pill
              icon={event.is_private ? 'Lock' : 'Globe'}
              label={event.is_private ? t('events.private') : t('events.public')}
              color='#4A4F59'
              bgClass='bg-neutral-100 dark:bg-neutral-700'
            />
          ) : null}
        </View>
        {/* Imported external events point back to the source listing. */}
        {isExternal && event.source_url ? (
          <PressableScale
            scaleOnPress={0.98}
            onPress={async () => {
              // source_url is a stored third-party/imported string: http(s) only.
              const safe = event.source_url ? safeHttpUrl(event.source_url) : null;
              if (!safe) return;
              const { openBrowserAsync } = await import('expo-web-browser');
              await openBrowserAsync(safe);
            }}
            accessibilityRole='link'
            accessibilityLabel={`${event.source_name || 'External'} · ${t('events.viewOriginal')}`}
            className='flex-row items-center gap-1.5 mt-2 self-start'
          >
            <Icon name='ExternalLink' size={14} color='primary' />
            <PulseText variant='caption' className='text-primary font-medium'>
              {event.source_name || 'External'} · {t('events.viewOriginal')}
            </PulseText>
          </PressableScale>
        ) : null}
        {/* Organizing club quick link */}
        {event.club_id ? (
          <PressableScale
            scaleOnPress={0.98}
            onPress={() => router.push(`/(tabs)/clubs/${event.club_id}`)}
            accessibilityRole='link'
            accessibilityLabel={t('common.organizingClub')}
            className='flex-row items-center gap-1.5 mt-2 self-start'
          >
            <Icon name='Trophy' size={14} color='primary' />
            <PulseText variant='caption' className='text-primary font-medium'>
              {organizingClub ?? t('common.organizingClub')}
            </PulseText>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}
