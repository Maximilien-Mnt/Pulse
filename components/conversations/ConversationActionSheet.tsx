// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS — Conversation Action Menu
//
// Conversation options (Pin / Rename / Leave / Delete / Delete and block /
// Report) presented through the **native OS options menu**:
//
//   - iOS     -> the real system action sheet (ActionSheetIOS), with a
//                separated Cancel button and red destructive rows.
//   - Android -> the shared in-app sheet (ActionMenuSheet), because React
//                Native exposes no native list-style menu without a native
//                module (which would break the managed / Expo Go workflow).
//   - web     -> same shared sheet (react-native-web has no native menu).
//
// Confirmations are native dialogs too (`confirmAction`), and the group rename
// uses the native text prompt on iOS.
//
// The public props are unchanged, so both call sites (the conversations list
// long-press and the chat header "⋯" button) keep working as-is.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { ActionMenuSheet } from "@/components/shared/ActionMenuSheet";
import { ReportSheet } from "@/components/shared/ReportSheet";
import {
  confirmAction,
  hasNativeActionMenu,
  showNativeActionMenu,
  type ActionMenuDescriptor,
} from "@/components/shared/nativeActionMenu";
import {
  useDeleteConversation,
  usePinConversation,
  useUnpinConversation,
  useLeaveGroupConversation,
  useRenameGroupConversation,
} from "@/hooks/useConversationActions";
import { useBlockUser } from "@/hooks/useBlockUser";
import { useDesignTokens } from "@/src/design-tokens/useDesignTokens";
import Toast from "react-native-toast-message";
import { useTranslation } from "@/hooks/useTranslation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  visible: boolean;
  /** Nom de la conversation affiché dans l'en-tête du menu. */
  name: string;
  pinned: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  conversationId: string;
  /** Id of the other participant — used for the self-report guard in useReport. */
  targetAuthorId?: string;
  /** Whether this is a group conversation (e.g. club chat). */
  isGroup?: boolean;
  /** Called when the user successfully leaves a group. */
  onLeft?: () => void;
  /** Current group name (shown in rename input). */
  groupName?: string;
  /** Called with the new name after a successful group rename. */
  onRenamed?: (newName: string) => void;
}

/** Icons used by the in-app fallback (Android / web); the OS sheet has none. */
const FALLBACK_ICONS: Partial<Record<string, IconName>> = {
  pin: "Pin",
  unpin: "PinOff",
  rename: "Pen",
  leave: "LogOut",
  delete: "Trash2",
  "delete-and-block": "Shield",
  signal: "Flag",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConversationActionSheet({
  visible,
  name,
  pinned,
  onClose,
  onDeleted,
  conversationId,
  targetAuthorId,
  isGroup = false,
  onLeft,
  groupName,
  onRenamed,
}: Props) {
  const { t } = useTranslation();
  const { colors, mode } = useDesignTokens();
  const isDark = mode === "dark";

  // Optimistic pin state, re-synced whenever the server value (or the target
  // conversation) changes.
  const [isPinned, setIsPinned] = useState(pinned);
  // Descriptor rendered by the fallback sheet on Android / web.
  const [fallback, setFallback] = useState<ActionMenuDescriptor | null>(null);
  // Rename sheet state (Android / web — iOS uses the native prompt).
  const [renameOpen, setRenameOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  // Capture the report target while the menu is open: the parent clears its
  // conversation state on close (menuItem → null), so the values are held
  // locally for the ReportSheet.
  const [reportTarget, setReportTarget] = useState<{
    conversationId: string;
    targetAuthorId?: string;
    label: string;
  }>({ conversationId: "", targetAuthorId: undefined, label: "" });

  const pinMut = usePinConversation();
  const unpinMut = useUnpinConversation();
  const deleteMut = useDeleteConversation();
  const blockMut = useBlockUser();
  const leaveMut = useLeaveGroupConversation();
  const renameMut = useRenameGroupConversation();

  useEffect(() => {
    setIsPinned(pinned);
  }, [pinned, conversationId]);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleTogglePin = useCallback(() => {
    const next = !isPinned;
    setIsPinned(next); // mise à jour instantanée et optimiste
    const mutation = next ? pinMut.mutate : unpinMut.mutate;
    mutation(conversationId, {
      onError: () => setIsPinned(!next), // annule l'optimisme en cas d'échec
    });
  }, [conversationId, isPinned, pinMut.mutate, unpinMut.mutate]);

  const handleSignal = useCallback(() => {
    // Snapshot the target before the menu closes, then open the report sheet.
    setReportTarget({ conversationId, targetAuthorId, label: name });
    setReportSheetVisible(true);
    onClose();
  }, [conversationId, name, onClose, targetAuthorId]);

  const handleDelete = useCallback(() => {
    confirmAction(
      {
        title: t("conv.deleteConfirmTitle"),
        message: t("conv.deleteConfirmBody"),
        confirmLabel: t("common.delete"),
        cancelLabel: t("common.cancel"),
        destructive: true,
        isDark,
      },
      () => {
        deleteMut.mutate(conversationId, {
          onSuccess: () => {
            Toast.show({ type: "success", text1: t("conv.deleted") });
            onDeleted?.();
          },
        });
      }
    );
  }, [conversationId, deleteMut, isDark, onDeleted, t]);

  const handleDeleteAndBlock = useCallback(() => {
    const otherUserId = targetAuthorId;
    if (!otherUserId) {
      Toast.show({ type: "error", text1: t("conv.blockError") });
      return;
    }

    confirmAction(
      {
        title: t("conv.deleteBlockTitle"),
        message: t("conv.deleteBlockBody"),
        confirmLabel: t("common.deleteAndBlock"),
        cancelLabel: t("common.cancel"),
        destructive: true,
        isDark,
      },
      () => {
        deleteMut.mutate(conversationId, {
          onSuccess: () => {
            blockMut.mutate(
              { userId: otherUserId },
              {
                onSuccess: () => {
                  Toast.show({ type: "success", text1: t("conv.blockedUser") });
                  onDeleted?.();
                },
              }
            );
          },
        });
      }
    );
  }, [blockMut, conversationId, deleteMut, isDark, onDeleted, t, targetAuthorId]);

  const handleLeave = useCallback(() => {
    confirmAction(
      {
        title: t("conv.leaveGroup"),
        message: t("conv.leaveConfirm"),
        confirmLabel: t("conv.leaveGroup"),
        cancelLabel: t("common.cancel"),
        destructive: true,
        isDark,
      },
      () => {
        leaveMut.mutate(conversationId, {
          onSuccess: () => {
            Toast.show({ type: "success", text1: t("conv.leftGroup") });
            onLeft?.();
          },
        });
      }
    );
  }, [conversationId, isDark, leaveMut, onLeft, t]);

  const applyRename = useCallback(
    (raw: string) => {
      const next = raw.trim();
      if (!next) {
        Toast.show({ type: "error", text1: t("conv.nameRequired") });
        return;
      }
      renameMut.mutate(
        { conversationId, groupName: next },
        {
          onSuccess: (data) => {
            setRenameOpen(false);
            Toast.show({ type: "success", text1: t("conv.groupRenamed") });
            onRenamed?.(data?.groupName ?? next);
          },
        }
      );
    },
    [conversationId, onRenamed, renameMut, t]
  );

  const handleRename = useCallback(() => {
    // iOS gets the system text prompt; Android and web have no native prompt,
    // so they use a small in-app sheet.
    if (Platform.OS === "ios") {
      Alert.prompt(
        t("conv.renameGroup"),
        undefined,
        (text) => applyRename(text ?? ""),
        "plain-text",
        groupName ?? ""
      );
      return;
    }
    setNewGroupName(groupName ?? "");
    setRenameOpen(true);
  }, [applyRename, groupName, t]);

  // ── Option key → handler ────────────────────────────────────────────────
  const handlers = useMemo<Record<string, () => void>>(
    () => ({
      pin: handleTogglePin,
      unpin: handleTogglePin,
      rename: handleRename,
      leave: handleLeave,
      delete: handleDelete,
      "delete-and-block": handleDeleteAndBlock,
      signal: handleSignal,
    }),
    [
      handleDelete,
      handleDeleteAndBlock,
      handleLeave,
      handleRename,
      handleSignal,
      handleTogglePin,
    ]
  );

  // ── Descriptor (identical options on every platform) ────────────────────
  const descriptor = useMemo<ActionMenuDescriptor>(() => {
    const options: ActionMenuDescriptor["options"] = [
      {
        key: isPinned ? "unpin" : "pin",
        label: isPinned ? t("common.unpinned") : t("common.pinned"),
      },
    ];

    if (isGroup) {
      options.push(
        {
          key: "rename",
          label: t("conv.renameGroup"),
          disabled: renameMut.isPending,
        },
        {
          key: "leave",
          label: t("conv.leaveGroup"),
          destructive: true,
          disabled: leaveMut.isPending,
        }
      );
    } else {
      options.push(
        { key: "delete", label: t("common.delete"), destructive: true },
        {
          key: "delete-and-block",
          label: t("common.deleteAndBlock"),
          destructive: true,
        },
        { key: "signal", label: t("common.report") }
      );
    }

    return {
      title: name,
      options,
      cancelLabel: t("common.cancel"),
      tintColor: colors.primary,
      isDark,
    };
  }, [
    colors.primary,
    isDark,
    isGroup,
    isPinned,
    leaveMut.isPending,
    name,
    renameMut.isPending,
    t,
  ]);

  const runOption = useCallback(
    (key: string) => {
      setFallback(null);
      onClose();
      handlers[key]?.();
    },
    [handlers, onClose]
  );

  // Present the menu as soon as a conversation is opened for it (and only
  // once per opening, whatever the number of re-renders).
  const shownForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!visible) {
      shownForRef.current = null;
      return;
    }
    if (shownForRef.current === conversationId) return;
    shownForRef.current = conversationId;

    if (hasNativeActionMenu) {
      showNativeActionMenu(descriptor, runOption);
    } else {
      setFallback(descriptor);
    }
  }, [conversationId, descriptor, runOption, visible]);

  return (
    <>
      {/* Android / web: in-app sheet built from the very same descriptor. */}
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

      {/* Group rename (Android / web — iOS uses the native prompt). */}
      <Modal
        visible={renameOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRenameOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <Pressable
            className="flex-1"
            onPress={() => setRenameOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
          />
          <View className="bg-surface dark:bg-surface-dark rounded-t-3xl px-4 pt-4 pb-8">
            <View className="self-center w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 mb-4" />
            <Text className="text-lg font-['Inter_600SemiBold'] text-text-primary mb-2">
              {t("conv.renameGroup")}
            </Text>
            <TextInput
              className="w-full border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-base text-text-primary mb-6"
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder={t("conv.enterNewName")}
              placeholderTextColor="#888D97"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => applyRename(newGroupName)}
              editable={!renameMut.isPending}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  title={t("common.cancel")}
                  variant="ghost"
                  onPress={() => setRenameOpen(false)}
                  disabled={renameMut.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  title={t("common.save")}
                  variant="secondary"
                  onPress={() => applyRename(newGroupName)}
                  loading={renameMut.isPending}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report sheet — reuses the same ReportSheet component as posts & profiles. */}
      <ReportSheet
        visible={reportSheetVisible}
        targetType="conversation"
        targetId={reportTarget.conversationId}
        targetAuthorId={reportTarget.targetAuthorId}
        targetLabel={reportTarget.label}
        onClose={() => setReportSheetVisible(false)}
      />
    </>
  );
}

