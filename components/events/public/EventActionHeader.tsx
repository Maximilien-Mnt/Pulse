import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BackButton } from '@/components/ui/BackButton';
import { IconButton } from '@/components/ui/IconButton';
import { Text as PulseText } from '@/components/ui/Text';
import { t } from '@/hooks/useTranslation';

interface EventActionHeaderProps {
  eventId: string;
  canManage: boolean;
  /** Optional right-side actions. Overrides the default creator settings icon. */
  right?: React.ReactNode;
}

/** Top header: back button, title, and settings (for managers). */
export function EventActionHeader({ eventId, canManage, right }: EventActionHeaderProps) {
  const router = useRouter();

  const fallback = canManage ? (
    <IconButton
      icon="Settings"
      iconSize={22}
      label={t("events.settings")}
      testID="event-detail-settings-button"
      onPress={() => router.push(`/(tabs)/events/${eventId}/settings`)}
    />
  ) : null;

  return (
    <View className='flex-row items-center gap-2 px-4 py-2 border-b border-neutral-100 dark:border-neutral-800'>
      <BackButton useInAppSession fallbackRoute='/(tabs)/events' />
      <PulseText variant='h2' className='flex-1' numberOfLines={1}>
        {t('events.title')}
      </PulseText>
      {right ?? fallback}
    </View>
  );
}
