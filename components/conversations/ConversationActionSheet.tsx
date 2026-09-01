// ---------------------------------------------------------------------------
// PULSE CONVERSATIONS — Conversation Action Sheet
//
// Bottom sheet with conversation options (Pin / Unpin / Delete / Signal)
// and a confirmation phase for the destructive delete action.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { ReportSheet } from "@/components/shared/ReportSheet";
import {
  useDeleteConversation,
  usePinConversation,
  useUnpinConversation,
  useLeaveGroupConversation,
  useRenameGroupConversation,
} from "@/hooks/useConversationActions";
import { useBlockUser } from "@/hooks/useBlockUser";
import Toast from "react-native-toast-message";
import { useTranslation , t } from "@/hooks/useTranslation";
import { TextInput } from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Option = {
  key: string;
  label: string;
  icon: IconName;
  iconColor?: "text-primary" | "text-secondary" | "error-600";
  onPress: () => void;
};

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
}

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
}: Props) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [isPinned, setIsPinned] = useState(pinned);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  // Capture the report target while the action sheet is open. When the action
  // sheet closes, the parent clears its conversation state (e.g. menuItem →
  // null), so we must hold onto the values locally for the ReportSheet.
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

  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [confirmingRename, setConfirmingRename] = useState(false);
  const [newGroupName, setNewGroupName] = useState(groupName ?? "");

  // Reset local state each time the sheet opens for a conversation
  useEffect(() => {
    if (visible) {
      setIsPinned(pinned);
      setConfirming(false);
      setConfirmingBlock(false);
      setConfirmingLeave(false);
      setConfirmingRename(false);
      setNewGroupName(groupName ?? "");
    }
  }, [visible, pinned, groupName]);

  const handleClose = () => {
    setConfirming(false);
    setConfirmingBlock(false);
    setConfirmingLeave(false);
    setConfirmingRename(false);
    onClose();
  };

  const handleTogglePin = () => {
    const next = !isPinned;
    setIsPinned(next); // mise à jour instantanée et optimiste
    const mut = next ? pinMut : unpinMut;
    mut.mutate(conversationId, {
      onError: () => setIsPinned(!next), // annule l'optimisme en cas d'échec
    });
  };

  const handleSignal = () => {
    // Snapshot the target before the action sheet closes (the parent clears
    // its conversation state on close), then open the report sheet modal.
    setReportTarget({
      conversationId,
      targetAuthorId,
      label: name,
    });
    setReportSheetVisible(true);
    onClose();
  };

  // ── Group-chat handlers ────────────────────────────────────────────────
  const handleLeave = () => {
    leaveMut.mutate(conversationId, {
      onSuccess: () => {
        setConfirmingLeave(false);
        Toast.show({ type: "success", text1: t("conv.leftGroup") });
        onLeft?.();
      },
    });
  };

  const handleRename = () => {
    if (!newGroupName.trim()) {
      Toast.show({ type: "error", text1: t("conv.nameRequired") });
      return;
    }
    renameMut.mutate(
      { conversationId, groupName: newGroupName.trim() },
      {
        onSuccess: () => {
          setConfirmingRename(false);
          Toast.show({ type: "success", text1: t("conv.groupRenamed") });
        },
      },
    );
  };

  // ── Options (conditional for groups vs 1:1) ────────────────────────────
  const buildOptions = (): Option[] => {
    const base: Option[] = [
      {
        key: isPinned ? "unpin" : "pin",
        label: isPinned ? t("common.unpinned") : t("common.pinned"),
        icon: isPinned ? "PinOff" : "Pin",
        onPress: handleTogglePin,
      },
    ];

    if (isGroup) {
      base.push(
        {
          key: "rename",
          label: t("conv.renameGroup"),
          icon: "PenLine",
          onPress: () => setConfirmingRename(true),
        },
        {
          key: "leave",
          label: t("conv.leaveGroup"),
          icon: "LogOut",
          iconColor: "error-600",
          onPress: () => setConfirmingLeave(true),
        },
      );
    } else {
      base.push(
        {
          key: "delete",
          label: t("common.delete"),
          icon: "Trash2",
          iconColor: "error-600",
          onPress: () => setConfirming(true),
        },
        {
          key: "delete-and-block",
          label: t("common.deleteAndBlock"),
          icon: "Shield",
          iconColor: "error-600",
          onPress: () => setConfirmingBlock(true),
        },
        {
          key: "signal",
          label: "Signaler",
          icon: "Flag",
          onPress: handleSignal,
        },
      );
    }

    return base;
  };

  const options = buildOptions();

  const handleConfirmDelete = () => {
    deleteMut.mutate(conversationId, {
      onSuccess: () => {
        setConfirming(false);
        onDeleted?.();
      },
    });
  };

  const handleConfirmDeleteAndBlock = () => {
    const otherUserId = targetAuthorId;
    if (!otherUserId) {
      Toast.show({ type: "error", text1: "Impossible de bloquer cet utilisateur" });
      return;
    }

    deleteMut.mutate(conversationId, {
      onSuccess: () => {
        blockMut.mutate(
          { userId: otherUserId },
          {
            onSuccess: () => {
              setConfirmingBlock(false);
              onDeleted?.();
              Toast.show({ type: "success", text1: "Conversation supprimée et utilisateur bloqué" });
            },
          }
        );
      },
    });
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
        <View className="flex-1 bg-black/50 justify-end">
          {/* Tap outside the sheet to close */}
          <Pressable
            className="flex-1"
            onPress={handleClose}
            accessibilityLabel="Fermer le menu"
          />
          <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4 pb-8">
            {confirming ? (
              <>
                <Text className="text-lg font-['Inter_600SemiBold'] text-text-primary mb-2">
                  Supprimer la conversation ?
                </Text>
                <Text className="text-sm text-text-secondary mb-6">
                  Cette conversation sera supprimée de ton côté. Cette action est irréversible.
                </Text>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      title="Annuler"
                      variant="ghost"
                      onPress={() => setConfirming(false)}
                      disabled={deleteMut.isPending}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      title="Supprimer"
                      variant="destructive"
                      onPress={handleConfirmDelete}
                      loading={deleteMut.isPending}
                    />
                  </View>
                </View>
              </>
            ) : confirmingBlock ? (
              <>
                <Text className="text-lg font-['Inter_600SemiBold'] text-text-primary mb-2">
                  Supprimer et bloquer ?
                </Text>
                <Text className="text-sm text-text-secondary mb-6">
                  En bloquant cet utilisateur, il ne pourra plus te contacter ni démarrer de nouvelle conversation avec toi. Tu peux toujours le débloquer depuis ta liste des profils bloqués dans les paramètres.
                </Text>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      title="Annuler"
                      variant="ghost"
                      onPress={() => setConfirmingBlock(false)}
                      disabled={deleteMut.isPending || blockMut.isPending}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      title="Supprimer et bloquer"
                      variant="destructive"
                      onPress={handleConfirmDeleteAndBlock}
                      loading={deleteMut.isPending || blockMut.isPending}
                    />
                  </View>
                </View>
              </>
            ) : confirmingLeave ? (
              <>
                <Text className="text-lg font-['Inter_600SemiBold'] text-text-primary mb-2">
                  {t("conv.leaveGroup")} ?
                </Text>
                <Text className="text-sm text-text-secondary mb-6">
                  {t("conv.leaveConfirm")}
                </Text>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      title={t("common.cancel")}
                      variant="ghost"
                      onPress={() => setConfirmingLeave(false)}
                      disabled={leaveMut.isPending}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      title={t("common.delete")}
                      variant="destructive"
                      onPress={handleLeave}
                      loading={leaveMut.isPending}
                    />
                  </View>
                </View>
              </>
            ) : confirmingRename ? (
              <>
                <Text className="text-lg font-['Inter_600SemiBold'] text-text-primary mb-2">
                  {t("conv.renameGroup")}
                </Text>
                <TextInput
                  className="w-full border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-base text-neutral-900 dark:text-neutral-50 mb-6"
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholder={t("conv.enterNewName")}
                  autoFocus
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      title={t("common.cancel")}
                      variant="ghost"
                      onPress={() => setConfirmingRename(false)}
                      disabled={renameMut.isPending}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      title={t("common.save")}
                      variant="secondary"
                      onPress={handleRename}
                      loading={renameMut.isPending}
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Handle indicator */}
                <View className="self-center w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 mb-4" />

                {/* Title */}
                <Text variant="subtitle" className="text-text-primary mb-4" numberOfLines={1}>
                  {name}
                </Text>

                {/* Options */}
                <View className="gap-1">
                  {options.map((opt) => (
                    <Pressable
                      key={opt.key}
                      onPress={opt.onPress}
                      accessibilityRole="button"
                  className="flex-row items-center gap-4 py-4 px-3 rounded-lg active:bg-primary-tint dark:active:bg-primary-tint-dark"
                    >
                      <View className="w-10 h-10 rounded-full bg-neutral-50 dark:bg-neutral-800 items-center justify-center">
                        <Icon name={opt.icon} size={20} color={opt.iconColor ?? "text-secondary"} />
                      </View>
                      <Text
                        variant="bodyLarge"
                        className={opt.iconColor === "error-600" ? "text-error-600 flex-1" : "text-text-primary flex-1"}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
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