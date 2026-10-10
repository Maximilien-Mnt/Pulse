import React from 'react';
import { View } from 'react-native';
import { Text as PulseText } from '@/components/ui/Text';
import { Section, CARD } from './EventSharedUI';

interface EventDescriptionCardProps {
  description: string | null;
}

/** Long description card. */
export function EventDescriptionCard({ description }: EventDescriptionCardProps) {
  if (!description) return null;

  return (
    <Section title='Description' className='px-4 mb-5'>
      <View className={'p-4 ' + CARD}>
        <PulseText variant='body' className='text-neutral-800 dark:text-neutral-100 leading-relaxed'>
          {description}
        </PulseText>
      </View>
    </Section>
  );
}

