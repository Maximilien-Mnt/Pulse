import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InvitationButton } from '@/components/shared/InvitationButton';
import { Text as PulseText } from '@/components/ui/Text';

interface EventActionsBarProps {
  /** The primary CTA node (join / register / participant / pending / full). */
  action: React.ReactNode;
  /** True when a primary CTA should render at all. */
  actionVisible: boolean;
  /** Show the invite button (private event owned by the creator). */
  canInvite: boolean;
  eventId: string;
  /** Caption shown under the CTA (e.g. "no more places"). */
  caption?: string | null;
}

/**
 * Sticky bottom action bar: the primary event CTA (join / register / …) plus the
 * private-event invite button. Pinned below the scroll area with a top hairline
 * and bottom safe-area padding so it is always reachable. Favorite and share
 * live as floating chips on the hero cover (see EventHeroBar), mirroring the
 * club detail screen; this bar carries only the participation action.
 */
export function EventActionsBar({
  action,
  actionVisible,
  canInvite,
  eventId,
  caption,
}: EventActionsBarProps) {
  const insets = useSafeAreaInsets();

  if (!actionVisible && !canInvite) return null;

  return (
    <View
      className='border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-[#0A0F1C] px-4 pt-3 gap-2.5'
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {actionVisible ? action : null}

      {caption ? (
        <PulseText variant='caption' className='text-center text-error'>
          {caption}
        </PulseText>
      ) : null}

      <InvitationButton type='event' targetId={eventId} visible={canInvite} />
    </View>
  );
}

