import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BackButton } from '@/components/ui/BackButton';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { t } from '@/hooks/useTranslation';

interface ClubActionHeaderProps {
  clubId: string;
  isCreator: boolean;
  /** Optional right-side actions (round icons / rounded pill). Overrides the default creator settings icon. */
  right?: React.ReactNode;
}

/** Top header: back button, title, and settings (for creators). */
export function ClubActionHeader({ clubId, isCreator, right }: ClubActionHeaderProps) {
  const router = useRouter();

  const fallback = isCreator ? (
        <PressableScale
          onPress={() => router.push(`/(tabs)/clubs/${clubId}/settings`)}
          hitSlop={8}
          scaleOnPress={0.9}
          scaleOnHover={1.08}
          className='w-11 h-11 rounded-full bg-primary/10 items-center justify-center active:bg-primary/20'
          accessibilityRole='button'
          accessibilityLabel={t('clubs.edit')}
        >
          <Icon name='Settings' size={22} color='primary' />
        </PressableScale>
      ) : null;

  return (
    <View className='flex-row items-center gap-2 px-4 py-2 border-b border-neutral-100 dark:border-neutral-800'>
      <BackButton useInAppSession fallbackRoute='/(tabs)/profile' />
      <PulseText variant='h2' className='flex-1' numberOfLines={1}>
        {t('clubs.public')}
      </PulseText>
      {right ?? fallback}
    </View>
  );
}
