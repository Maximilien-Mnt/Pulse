// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS — Message Menu
//
// Options for a chat message (Copier / Modifier / Supprimer), presented through
// the **native OS options menu**:
//   - iOS     -> the system action sheet (ActionSheetIOS).
//   - Android -> the shared in-app **floating menu** anchored next to the
//                button / long-pressed bubble that opened it (the same
//                ActionMenuPopover the conversations tab uses) — RN has no
//                native list-style menu without a native module. Without an
//                anchor it falls back to the bottom sheet (ActionMenuSheet).
//   - web     -> same floating popover / bottom-sheet fallback.
// Deleting is an irreversible action, so it always goes through a native
// confirmation dialog first.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActionMenuSheet } from "@/components/shared/ActionMenuSheet";
import {
  ActionMenuPopover,
  type ActionMenuAnchor,
} from "@/components/shared/ActionMenuPopover";
import type { IconName } from "@/components/ui/Icon";
import {
  confirmAction,
  hasNativeActionMenu,
  showNativeActionMenu,
  type ActionMenuDescriptor,
} from "@/components/shared/nativeActionMenu";
import { useTranslation } from "@/hooks/useTranslation";
import { useDesignTokens } from "@/src/design-tokens/useDesignTokens";

export interface MessageMenuProps {
  visible: boolean;
  onClose: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** A message action is in flight: the destructive option is shown disabled. */
  isDeleting?: boolean;
  /**
   * On-screen rect of the button / bubble that opened the menu. When present
   * (and the platform has no native menu), the options render as a floating
   * menu anchored next to the message instead of the bottom sheet.
   */
  anchor?: ActionMenuAnchor | null;
}

/** Icons used by the in-app fallback (Android / web); the OS sheet has none. */
const FALLBACK_ICONS: Partial<Record<string, IconName>> = {
  copy: "FileText",
  edit: "Pen",
  delete: "Trash2",
};

export function MessageMenu({
  visible,
  onClose,
  onCopy,
  onEdit,
  onDelete,
  isDeleting = false,
  anchor = null,
}: MessageMenuProps) {
  const { t } = useTranslation();
  const { colors, mode } = useDesignTokens();
  const isDark = mode === "dark";
  const [fallback, setFallback] = useState<ActionMenuDescriptor | null>(null);

  const handleDelete = useCallback(() => {
    confirmAction(
      {
        title: t("conv.messageDeleteTitle"),
        message: t("conv.messageDeleteBody"),
        confirmLabel: t("common.delete"),
        cancelLabel: t("common.cancel"),
        destructive: true,
        isDark,
      },
      onDelete
    );
  }, [isDark, onDelete, t]);

  const handlers = useMemo<Record<string, () => void>>(
    () => ({ copy: onCopy, edit: onEdit, delete: handleDelete }),
    [handleDelete, onCopy, onEdit]
  );

  const descriptor = useMemo<ActionMenuDescriptor>(
    () => ({
      options: [
        { key: "copy", label: t("common.copy") },
        { key: "edit", label: t("common.edit") },
        { key: "delete", label: t("common.delete"), destructive: true, disabled: isDeleting },
      ],
      cancelLabel: t("common.cancel"),
      tintColor: colors.primary,
      isDark,
    }),
    [colors.primary, isDark, isDeleting, t]
  );

  const runOption = useCallback(
    (key: string) => {
      setFallback(null);
      onClose();
      handlers[key]?.();
    },
    [handlers, onClose]
  );

  // Present the menu once per opening (whatever the number of re-renders).
  const shownRef = useRef(false);
  useEffect(() => {
    if (!visible) {
      shownRef.current = false;
      return;
    }
    if (shownRef.current) return;
    shownRef.current = true;

    if (hasNativeActionMenu) {
      showNativeActionMenu(descriptor, runOption);
    } else {
      setFallback(descriptor);
    }
  }, [descriptor, runOption, visible]);

  // Android / web: the options render from the very same descriptor. With an
  // anchor (the "⋮" that was clicked, or the long-pressed bubble) they appear
  // as a floating menu anchored next to the message — clamped so it stays
  // fully visible on any screen — and a tap anywhere outside dismisses it.
  // Without one, they fall back to the bottom sheet. iOS shows the real sheet.
  const closeFallback = () => {
    setFallback(null);
    onClose();
  };

  return anchor ? (
    <ActionMenuPopover
      visible={!!fallback}
      descriptor={fallback}
      anchor={anchor}
      icons={FALLBACK_ICONS}
      onClose={closeFallback}
      onSelect={runOption}
    />
  ) : (
    <ActionMenuSheet
      visible={!!fallback}
      descriptor={fallback}
      icons={FALLBACK_ICONS}
      onClose={closeFallback}
      onSelect={runOption}
    />
  );
}
