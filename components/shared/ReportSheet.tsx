// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Report Sheet
//
// Reusable bottom sheet for reporting any target (posts, profiles, …).
//
// Mirrors the visual style of ConversationActionSheet (Modal + slide-up sheet
// + handle bar + option-row look & feel) and adds the report-specific flow:
//   1. optional reason selector  (impersonation / harassment / spam / …)
//   2. optional free-text message (with character counter / max-length)
//   3. confirmation buttons (Annuler / Confirmer)
//
// Backed by the shared `reports` table (target_type / target_id) via the
// generic useReport() hook — no new table required.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { useReport, type UseReportPayload } from "@/hooks/useReport";
import { cn } from "@/utils/format";
import Toast from "react-native-toast-message";
import { t } from "@/hooks/useTranslation";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ReportSheetProps {
  visible: boolean;
  /** Drives the title text. */
  targetType: "post" | "profile" | "conversation";
  /** Id of the reported entity (post id, profile id, or conversation id). */
  targetId: string;
  /** Author id of the reported entity. Used for the self-report guard. */
  targetAuthorId?: string;
  /** Human-readable label shown as a subtitle (post title / profile name). */
  targetLabel?: string;
  /** Called when the sheet should be dismissed. */
  onClose: () => void;
  /** Called after a successful report submission. */
  onSuccess?: () => void;
}

const MAX_MESSAGE_LENGTH = 500;

const REPORT_REASONS = [
  { key: "impersonation", label: t("report.identityTheft") },
  { key: "harassment", label: t("report.harassment") },
  { key: "inappropriate", label: t("report.inappropriate") },
  { key: "hate_speech", label: t("report.hateSpeech") },
  { key: "other", label: t("report.other") },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportSheet({
  visible,
  targetType,
  targetId,
  targetAuthorId,
  targetLabel,
  onClose,
  onSuccess,
}: ReportSheetProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [message, setMessage] = useState("");
  const reportMut = useReport();

  // Reset form state each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setSelectedReason("");
      setMessage("");
    }
  }, [visible]);

  const handleClose = () => {
    if (reportMut.isPending) return;
    onClose();
  };

  const title =
    targetType === "profile"
      ? t("report.profile")
      : targetType === "conversation"
        ? t("report.conversation")
        : t("report.post");

  // Submission requires at least a reason or a message (both optional fields,
  // but an empty report is meaningless).
  const canSubmit = selectedReason !== "" || message.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: UseReportPayload = {
      targetType,
      targetId,
      targetAuthorId,
      reason: selectedReason || undefined,
      message: message.trim() || undefined,
    };
    reportMut.mutate(payload, {
      onSuccess: () => {
        Toast.show({ type: "success", text1: "Signalement envoyé" });
        onSuccess?.();
        onClose();
      },
      onError: (e: any) => {
        Toast.show({
          type: "error",
          text1: e?.message ?? "Impossible d'envoyer le signalement",
        });
      },
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        {/* Tap outside the sheet to close */}
        <Pressable
          className="flex-1"
          onPress={handleClose}
          accessibilityLabel="Fermer le menu"
        />

        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4 pb-8">
          {/* Handle indicator */}
          <View className="self-center w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 mb-4" />

          {/* Title */}
          <Text variant="subtitle" className="text-text-primary mb-1">
            {title}
          </Text>
          {targetLabel ? (
            <Text
              variant="body"
              className="text-text-secondary mb-4"
              numberOfLines={2}
            >
              {targetLabel}
            </Text>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            className="max-h-[360px]"
          >
            {/* Reason selector */}
            <Text variant="caption" className="text-text-tertiary mb-2">
              Motif du signalement (optionnel)
            </Text>
            <View className="gap-1 mb-4">
              {REPORT_REASONS.map((reason) => {
                const selected = selectedReason === reason.key;
                return (
                  <Pressable
                    key={reason.key}
                    onPress={() => setSelectedReason(reason.key)}
                    accessibilityRole="button"
                    className={cn(
                      "flex-row items-center gap-3 py-3 px-3 rounded-lg",
                      selected
                        ? "bg-primary-tint dark:bg-primary-tint-dark"
                        : "active:bg-primary-tint dark:active:bg-primary-tint-dark"
                    )}
                  >
                    <View className="w-10 h-10 rounded-full bg-neutral-50 dark:bg-neutral-800 items-center justify-center">
                      <Icon
                        name="Flag"
                        size={20}
                        color={selected ? "primary" : "text-tertiary"}
                      />
                    </View>
                    <Text
                      variant="bodyLarge"
                      className={cn(
                        "flex-1",
                        selected
                          ? "text-primary dark:text-primary-dark"
                          : "text-text-secondary"
                      )}
                    >
                      {reason.label}
                    </Text>
                    {selected ? (
                      <Icon name="CheckCircle2" size={16} color="primary" />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {/* Message field */}
            <Input
              label="Message (optionnel)"
              placeholder={t("report.placeholder")}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
              help={`${message.length}/${MAX_MESSAGE_LENGTH} caractères`}
            />
          </ScrollView>

          {/* Footer buttons */}
          <View className="flex-row gap-3 mt-4">
            <View className="flex-1">
              <Button
                title="Annuler"
                variant="ghost"
                onPress={handleClose}
                disabled={reportMut.isPending}
              />
            </View>
            <View className="flex-1">
              <Button
                title="Confirmer"
                variant="destructive"
                onPress={handleSubmit}
                loading={reportMut.isPending}
                disabled={!canSubmit || reportMut.isPending}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
