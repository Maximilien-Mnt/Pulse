// ---------------------------------------------------------------------------
// PULSE — Share Button
//
// Lightweight button that opens the native share sheet with contextual
// content (title, description, URL).  Supports an optional icon prop and
// size adjustments so it blends seamlessly into card footers, headers, etc.
// ---------------------------------------------------------------------------

import React from 'react';
import { Share as RNShare } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { PressableRow } from '@/components/ui/PressableRow';
import { Text } from '@/components/ui/Text';
import { hitSlopForIcon } from '@/src/accessibility';

interface ShareButtonProps {
  /** Content to share */
  content: {
    title: string;
    /** Optional long-form text that describes the item */
    message?: string;
    /** Optional URL that will appear in the share sheet */
    url?: string;
  };
  /** Icon to display before the label (default: Share2) */
  icon?: string;
  /** Size of the icon (default: 18) */
  iconSize?: number;
  /** Show a text label alongside the icon */
  label?: string;
  /** Called after the native share dialog is presented */
  onShare?: (result: { action: string }) => void;
  /** Additional className for styling */
  className?: string;
  /** Test identifier for E2E and unit tests. */
  testID?: string;
}

export function ShareButton({
  content,
  icon = 'Share2',
  iconSize = 18,
  label,
  onShare,
  className,
  testID,
}: ShareButtonProps) {
  const handleShare = async () => {
    try {
      const result = await RNShare.share({
        title: content.title,
        message: content.message ?? content.title,
        url: content.url,
      });

      onShare?.(result);
    } catch {
      // User dismissed the share sheet — no-op
    }
  };

  // Build an accessible label that describes the action and context.
  // When a visible label is provided, use it; otherwise synthesize from content.
  const effectiveLabel =
    label ??
    `Partager ${content.title}${content.url ? ` — ${content.url}` : ""}`;

  // For small icons (< 44px), expand the hit area to 44x44 without changing
  // the visual layout. iconSize 18 → hitSlop 13 → 18 + 26 = 44.
  const effectiveHitSlop = hitSlopForIcon(iconSize);

  return (
    <PressableRow
      onPress={handleShare}
      hitSlop={effectiveHitSlop}
      accessibilityLabel={effectiveLabel}
      testID={testID}
      className={`flex-row items-center gap-1 ${className ?? ''}`}
    >
      <Icon name={icon as any} size={iconSize} color="text-secondary" decorative />
      {label && <Text variant="caption" className="text-text-secondary">{label}</Text>}
    </PressableRow>
  );
}
