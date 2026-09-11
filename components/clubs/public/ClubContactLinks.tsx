import React from 'react';
import { View } from 'react-native';
import { Section, CARD, LinkRow, type LinkRowData } from './ClubSharedUI';

interface ClubContactLinksProps {
  linkRows: LinkRowData[];
}

/** Contact & links section (social networks, website, email, etc.). */
export function ClubContactLinks({ linkRows }: ClubContactLinksProps) {
  if (linkRows.length === 0) return null;

  return (
    <Section title='Contact & liens' className='px-4 mb-5'>
      <View className={CARD + ' overflow-hidden'}>
        {linkRows.map((row, i) => (
          <LinkRow
            key={row.label}
            icon={row.icon}
            label={row.label}
            value={row.value}
            url={row.url}
            isLast={i === linkRows.length - 1}
          />
        ))}
      </View>
    </Section>
  );
}
