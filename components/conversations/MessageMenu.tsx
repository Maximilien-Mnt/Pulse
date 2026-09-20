// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS — Message Menu
//
// Options for a chat message (Copier / Modifier / Supprimer), presented through
// the **native OS options menu**:
//   - iOS     -> the system action sheet (ActionSheetIOS).
//   - Android -> the shared in-app sheet (ActionMenuSheet) — RN has no native
//                list-style menu without a native module.
//   - web     -> same shared sheet.
// Deleting is an irreversible action, so it always goes through a native
// confirmation dialog first.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActionMenuSheet } from "@/components/shared/ActionMenuSheet";
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

  return (
    <ActionMenuSheet
      visible={!!fallback}
      descriptor={fallback}
      icons={FALLBACK_ICONS}
      onClose={() => {
        setFallback(null);
        onClose();
      }}
      onSelect={runOption}
    />
  );
}
