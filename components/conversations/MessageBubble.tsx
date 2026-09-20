// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS - Message Bubble
// ---------------------------------------------------------------------------

import React, { useCallback, useState } from 'react';
import { Platform, Pressable, View, Linking, Text as RNText } from 'react-native';
import { cn } from '@/utils/format';
import {Text} from '@/components/ui/Text';
import {Icon} from '@/components/ui/Icon';
import type {MessageType} from '@/types';
import {MessageMenu} from './MessageMenu';

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
  const [hovered, setHovered] = useState(false);
  const isWeb = Platform.OS === 'web';

  // Options are presented by the OS / shared action menu, so there is no
  // anchor to measure anymore.
  const openMenu = useCallback(() => {
    if (!canModify) return;
    setMenuVisible(true);
  }, [canModify]);

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
            onPress={openMenu}
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
          onLongPress={isWeb ? undefined : openMenu}
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
        onClose={() => setMenuVisible(false)}
        onCopy={() => { setMenuVisible(false); onCopy?.(); }}
        onEdit={() => { setMenuVisible(false); onEdit?.(); }}
        onDelete={() => { setMenuVisible(false); onDelete?.(); }}
        isDeleting={isDeleting}
      />
    </>
  );
}
