// ---------------------------------------------------------------------------
// PULSE FEED — Comment Menu
//
// Options for a comment (Modifier / Supprimer), presented through the
// **native OS options menu**:
//   - iOS     -> the system action sheet (ActionSheetIOS).
//   - Android -> the shared in-app bottom sheet (ActionMenuSheet) — RN has no
//                native list-style menu without a native module.
//   - web     -> same shared bottom sheet.
// Deleting is an irreversible action, so it always goes through a native
// confirmation dialog first.
//
// The anchor props are kept in the interface for API compatibility with
// CommentItem; they are unused on the native iOS path and irrelevant for the
// bottom-sheet fallback.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActionMenuSheet } from "@/components/shared/ActionMenuSheet";
import {
  confirmAction,
  hasNativeActionMenu,
  showNativeActionMenu,
  type ActionMenuDescriptor,
} from "@/components/shared/nativeActionMenu";
import { useTranslation } from "@/hooks/useTranslation";

export interface CommentMenuProps {
  visible: boolean;
  /** Kept for API compatibility; unused on the native iOS path. */
  anchorX: number;
  anchorY: number;
  anchorWidth: number;
  anchorHeight: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function CommentMenu({
  visible,
  onClose,
  onEdit,
  onDelete,
  isDeleting = false,
}: CommentMenuProps) {
  const { t } = useTranslation();
  const [fallback, setFallback] = useState<ActionMenuDescriptor | null>(null);

  const handleDelete = useCallback(() => {
    confirmAction(
      {
        title: t("comments.deleteTitle"),
        message: t("comments.deleteBody"),
        confirmLabel: t("common.delete"),
        cancelLabel: t("common.cancel"),
        destructive: true,
        isDark: false,
      },
      onDelete
    );
  }, [onDelete, t]);

  const handlers = useCallback(
    (key: string) => {
      onClose();
      if (key === "edit") onEdit();
      if (key === "delete") handleDelete();
    },
    [handleDelete, onEdit, onClose]
  );

  const descriptor = useCallback(
    () => ({
      options: [
        { key: "edit", label: t("common.edit") },
        { key: "delete", label: t("common.delete"), destructive: true, disabled: isDeleting },
      ],
      cancelLabel: t("common.cancel"),
      isDark: false,
    }),
    [isDeleting, t]
  );

  const runOption = useCallback(
    (key: string) => {
      setFallback(null);
      onClose();
      handlers(key);
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
      showNativeActionMenu(descriptor(), runOption);
    } else {
      setFallback(descriptor());
    }
  }, [descriptor, runOption, visible]);

  if (!visible) return null;

  return (
    <ActionMenuSheet
      visible={!!fallback}
      descriptor={fallback}
      onSelect={(key) => runOption(key)}
      onClose={() => {
        setFallback(null);
      }}
    />
  );
}