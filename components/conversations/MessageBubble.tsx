// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS - Message Bubble
// ---------------------------------------------------------------------------

import React, { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, View, Linking, Text as RNText } from 'react-native';
import { cn } from '@/utils/format';
import {Text} from '@/components/ui/Text';
import {Icon} from '@/components/ui/Icon';
import type {MessageType} from '@/types';
import {MessageMenu} from './MessageMenu';
import type {ActionMenuAnchor} from '@/components/shared/ActionMenuPopover';

interface MessageBubbleProps {
  text: string;
  isMine: boolean;
  type?: MessageType;
  isEdited?: boolean;
  canModify?: boolean;
  isDeleting?: boolean;
  className?: string;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function MessageBubble({
  text,
  isMine,
  type = 'text',
  isEdited,
  canModify = false,
  isDeleting = false,
  className,
  onCopy,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  // On-screen rect of the trigger (the "⋮" button, or the bubble on the
  // native long-press path), used to anchor the floating options menu next
  // to the message — the same pattern as the conversations tab.
  const [anchor, setAnchor] = useState<ActionMenuAnchor | null>(null);
  const [hovered, setHovered] = useState(false);
  const isWeb = Platform.OS === 'web';

  const optionsRef = useRef<View>(null);
  const bubbleRef = useRef<View>(null);

  // Measure a view's window rect and hand it to `cb`. Guarded so it degrades
  // gracefully in environments without a layout engine (tests / SSR): `cb`
  // then receives `null` and the menu falls back to its default placement.
  const measureAnchor = useCallback(
    (node: View | null, cb: (next: ActionMenuAnchor | null) => void) => {
      if (node && typeof node.measureInWindow === 'function') {
        let settled = false;
        try {
          node.measureInWindow((x, y, width, height) => {
            if (!settled) {
              settled = true;
              cb({ x, y, width, height });
            }
          });
        } catch {
          cb(null);
          return;
        }
        // Safety net: test renderers expose measureInWindow but never invoke
        // its callback — the menu trigger must never hang.
        setTimeout(() => {
          if (!settled) {
            settled = true;
            cb(null);
          }
        }, 50);
      } else {
        cb(null);
      }
    },
    []
  );

  // Measure the trigger first, then open: the fallback menu (Android / web)
  // anchors next to the message; iOS ignores the rect and presents the real
  // system action sheet.
  const openMenu = useCallback(
    (node: View | null) => {
      if (!canModify) return;
      measureAnchor(node, (next) => {
        setAnchor(next);
        setMenuVisible(true);
      });
    },
    [canModify, measureAnchor]
  );

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
    setAnchor(null);
  }, []);

  const handleLinkPress = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {
      console.warn('Could not open link:', url);
    }
  }, []);

  if (type === 'system') {
    return (
      <View className={cn('max-w-[90%] py-2 my-1 self-center', className)}>
        <Text variant='caption' className='text-neutral-500 dark:text-neutral-400 text-center italic'>
          {text}
        </Text>
      </View>
    );
  }

  const renderContent = () => {
    if (type === 'image' && text) {
      return (
        <Pressable onPress={() => handleLinkPress(text)} className='rounded-lg overflow-hidden'>
          <RNText className='text-center text-neutral-400 text-xs'>Image: {text.slice(0, 50)}...</RNText>
        </Pressable>
      );
    }
    if (type === 'file' && text) {
      return (
        <Pressable onPress={() => handleLinkPress(text)} className='rounded-lg'>
          <Text variant='body' className={isMine ? 'text-white' : 'text-text-primary'}>
            File: {text.split('/').pop() ?? text}
          </Text>
        </Pressable>
      );
    }

    const displayText = text.length > 500 ? text.slice(0, 500) + '...' : text;
    const lines = displayText.split(String.fromCharCode(10));

    return (
      <View className='flex-1'>
        {lines.slice(0, 8).map((line, i) => (
          <Text
            key={i}
            variant='body'
            className={isMine ? 'text-white' : 'text-text-primary'}
            selectable={true}
          >
            {line}
          </Text>
        ))}
        {lines.length > 8 && (
          <Text variant='caption' className={isMine ? 'text-white/70' : 'text-neutral-400'}>
            +{lines.length - 8} more lines
          </Text>
        )}
        {isEdited && (
          <Text variant='caption' className={cn('mt-1 self-end', isMine ? 'text-white/70' : 'text-neutral-400')}>
            Modifie
          </Text>
        )}
      </View>
    );
  };

  return (
    <>
      <View
        className={cn('self-stretch flex-row items-center my-1', isMine ? 'justify-end' : 'justify-start')}
      >
        {isWeb && canModify && (
          <Pressable
            ref={optionsRef}
            onPress={() => openMenu(optionsRef.current)}
            accessibilityRole='button'
            accessibilityLabel='Message options'
            hitSlop={8}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            className={cn(
              'p-1 rounded-full transition-colors duration-150',
              hovered ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-transparent',
              isMine ? 'order-first mr-1' : 'ml-1',
            )}
          >
            <Icon name='MoreVertical' size={16} color='text-tertiary' />
          </Pressable>
        )}

        <Pressable
          ref={bubbleRef}
          onLongPress={isWeb ? undefined : () => openMenu(bubbleRef.current)}
          delayLongPress={300}
          disabled={!canModify}
          accessibilityRole='text'
          accessibilityLabel={text.slice(0, 100)}
          className={cn(
            'max-w-[80%] px-4 py-3 rounded-lg',
            isMine ? 'bg-primary rounded-br-sm' : 'bg-neutral-100 dark:bg-neutral-800 rounded-bl-sm',
            className,
          )}
        >
          {renderContent()}
        </Pressable>
      </View>

      <MessageMenu
        visible={menuVisible}
        anchor={anchor}
        onClose={closeMenu}
        onCopy={() => { closeMenu(); onCopy?.(); }}
        onEdit={() => { closeMenu(); onEdit?.(); }}
        onDelete={() => { closeMenu(); onDelete?.(); }}
        isDeleting={isDeleting}
      />
    </>
  );
}
