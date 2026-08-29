// ---------------------------------------------------------------------------
// PULSE — Bug Report Sheet
//
// Bottom sheet for submitting bug reports with automatic device context
// collection and expandable data disclosure.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { useBugReport } from "@/hooks/useBugReport";
import { cn } from "@/utils/format";
import Toast from "react-native-toast-message";
import { t } from "@/hooks/useTranslation";

export interface BugReportSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MAX_MESSAGE_LENGTH = 1000;

const COLLECTED_DATA_LABELS: Record<string, string> = {
  platform: t("bug.report.platform"),
  osVersion: t("bug.report.osVersion"),
  appVersion: t("bug.report.appVersion"),
  deviceModel: t("bug.report.deviceModel"),
  locale: t("bug.report.locale"),
  screenResolution: t("bug.report.screenResolution"),
  timezone: t("bug.report.timezone"),
};

export function BugReportSheet({ visible, onClose, onSuccess }: BugReportSheetProps) {
  const [message, setMessage] = useState("");
  const [showDataDetails, setShowDataDetails] = useState(false);
  const [deviceContext, setDeviceContext] = useState<Record<string, string | undefined>>({});
  const bugReportMut = useBugReport();

  useEffect(() => {
    if (visible) {
      setMessage("");
      setShowDataDetails(false);
    }
  }, [visible]);

  const handleClose = () => {
    if (bugReportMut.isPending) return;
    onClose();
  };

  const canSubmit = message.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    bugReportMut.mutate(
      { message: message.trim() },
      {
        onSuccess: () => {
          Toast.show({ type: "success", text1: t("bug.report.sent") });
          onSuccess?.();
          onClose();
        },
        onError: (e: any) => {
          Toast.show({
            type: "error",
            text1: e?.message ?? t("bug.report.submitError"),
          });
        },
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={handleClose} accessibilityLabel={t("common.close")} />

        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4 pb-8">
          <View className="self-center w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 mb-4" />

              <Text variant="subtitle" className="text-text-primary mb-1">
            {t("bug.report.title")}
          </Text>
          <Text variant="body" className="text-text-secondary mb-4">
            {t("bug.report.description")}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} className="max-h-[400px]">
            <Text variant="caption" className="text-text-tertiary mb-2">
              {t("bug.report.descriptionLabel")}
            </Text>
            <Input
              label=""
              placeholder={t("bug.report.placeholder")}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
              help={`${message.length}/${MAX_MESSAGE_LENGTH} ${t("bug.report.characters")}`}
              className="mb-4"
            />

            <View className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 mb-4">
              <Text variant="body" className="text-text-secondary mb-2">
                {t("bug.report.dataCollectionNotice")}
              </Text>

              <Pressable
                onPress={() => setShowDataDetails(!showDataDetails)}
                className="flex-row items-center justify-between"
              >
                <Text variant="body" className="text-primary font-medium">
                  {showDataDetails ? t("common.hideDetails") : t("bug.report.dataTitle")}
                </Text>
                <Text variant="body" className="text-primary">
                  {showDataDetails ? "▲" : "▼"}
                </Text>
              </Pressable>

              {showDataDetails && (
                <View className="mt-3 gap-2">
                  {Object.entries(COLLECTED_DATA_LABELS).map(([key, label]) => (
                    <View key={key} className="flex-row items-start gap-2">
                      <View className="mt-1">
                        <Icon name="CheckCircle2" size={16} color="success" />
                      </View>
                      <Text variant="body" className="text-text-secondary flex-1">
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View className="flex-row gap-3 mt-4">
            <View className="flex-1">
              <Button
                title={t("common.cancel")}
                variant="ghost"
                onPress={handleClose}
                disabled={bugReportMut.isPending}
              />
            </View>
            <View className="flex-1">
              <Button
                title={t("bug.report.submit")}
                variant="destructive"
                onPress={handleSubmit}
                loading={bugReportMut.isPending}
                disabled={!canSubmit || bugReportMut.isPending}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}