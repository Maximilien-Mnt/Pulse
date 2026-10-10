import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { Text as PulseText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { SafeScreen } from '@/components/shared/SafeScreen';
import { t } from '@/hooks/useTranslation';

interface EventNotFoundStateProps {
  onBack: () => void;
}

/** Full-screen not-found state when the event doesn't exist. */
export function EventNotFoundState({ onBack }: EventNotFoundStateProps) {
  return (
    <SafeScreen className='flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1C]'>
      <Icon name='Calendar' size={32} color='text-tertiary' />
      <PulseText variant='body' className='mt-3 text-neutral-500'>
        {t('events.notFound')}
      </PulseText>
      <Button title={t('common.back')} variant='secondary' className='mt-4' onPress={onBack} />
    </SafeScreen>
  );
}
