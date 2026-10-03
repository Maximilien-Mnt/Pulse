import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { useTranslation } from "@/hooks/useTranslation";
import {
  CLUB_MEMBER_STATUS_CATEGORIES,
  CUSTOM_MEMBER_STATUS_MAX_LENGTH,
  getMemberStatusLabel,
  getMemberStatusSections,
  isOtherMemberStatus,
  normalizeCustomStatus,
  OTHER_MEMBER_STATUS,
  validateCustomStatus,
} from "@/lib/clubMemberStatus";
import { cn } from "@/utils/format";

// ---------------------------------------------------------------------------
// PULSE — Inline member status editor
// ---------------------------------------------------------------------------
// Rendered under a member row when a manager taps its status badge. Every
// status of the vocabulary is listed, grouped by category (each with its own
// icon + color). `other` reveals a free-text input validated 1..60 chars.
//
// Nothing is persisted here: `onSave` hands the validated selection back to
// the screen, which drives the `update_club_member_status` RPC.
// ---------------------------------------------------------------------------

export interface MemberStatusEditorProps {
  /** Current `member_status` of the member being edited. */
  currentStatus: string;
  /** Current `custom_member_status` (seeds the free-text input). */
  currentCustomStatus?: string | null;
  /** Disables confirm/close while the RPC is in flight. */
  isPending?: boolean;
  onSave: (memberStatus: string, customMemberStatus: string | null) => void;
  onClose: () => void;
}

function StatusChip({
  label,
  selected,
  onPress,
  icon,
  iconColor,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  iconColor?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleOnPress={0.96}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      className={cn(
        "flex-row items-center gap-1 px-2.5 py-1.5 rounded-full border",
        selected
          ? "bg-primary border-primary"
          : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-600"
      )}
    >
      {icon && iconColor ? (
        <Icon name={icon} size={12} color={selected ? "#FFFFFF" : iconColor} />
      ) : null}
      <Text
        variant="caption"
        className={cn(
          "font-medium",
          selected ? "text-white" : "text-neutral-700 dark:text-neutral-200"
        )}
        numberOfLines={1}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

export function MemberStatusEditor({
  currentStatus,
  currentCustomStatus,
  isPending = false,
  onSave,
  onClose,
}: MemberStatusEditorProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(currentStatus);
  const [customValue, setCustomValue] = useState(
    normalizeCustomStatus(currentCustomStatus)
  );
  const [error, setError] = useState<string | null>(null);

  const sections = getMemberStatusSections();
  const customSelected = isOtherMemberStatus(selected);
  const customCategory = CLUB_MEMBER_STATUS_CATEGORIES.custom;

  const select = (code: string) => {
    setSelected(code);
    setError(null);
  };

  const handleSave = () => {
    if (customSelected) {
      const invalid = validateCustomStatus(customValue);
      if (invalid) {
        setError(
          invalid === "customRequired"
            ? t("members.status.customRequired")
            : t("members.status.customTooLong")
        );
        return;
      }
      setError(null);
      onSave(OTHER_MEMBER_STATUS, normalizeCustomStatus(customValue));
      return;
    }
    setError(null);
    onSave(selected, null);
  };

  return (
    <View className="mt-2 mb-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3">
      <Text
        variant="caption"
        className="font-semibold text-neutral-500 dark:text-neutral-400"
      >
        {t("members.status.pickerTitle")}
      </Text>

      <ScrollView
        className="mt-2"
        style={{ maxHeight: 260 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => {
          const category = CLUB_MEMBER_STATUS_CATEGORIES[section.category];
          return (
            <View key={section.category} className="mb-3">
              <View className="flex-row items-center gap-1.5 mb-1.5">
                <Icon name={category.icon} size={12} color={category.iconColor} />
                <Text
                  variant="caption"
                  className="font-semibold text-neutral-500 dark:text-neutral-400"
                >
                  {t(section.labelKey)}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-1.5">
                {section.statuses.map((entry) => (
                  <StatusChip
                    key={entry.code}
                    label={getMemberStatusLabel(entry.code, null, t)}
                    selected={selected === entry.code}
                    onPress={() => select(entry.code)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        {/* Free-text status */}
        <View className="mb-1">
          <View className="flex-row items-center gap-1.5 mb-1.5">
            <Icon name={customCategory.icon} size={12} color={customCategory.iconColor} />
            <Text
              variant="caption"
              className="font-semibold text-neutral-500 dark:text-neutral-400"
            >
              {t(customCategory.labelKey)}
            </Text>
          </View>
          <StatusChip
            label={t(`clubMemberStatus.label.${OTHER_MEMBER_STATUS}`)}
            selected={customSelected}
            onPress={() => select(OTHER_MEMBER_STATUS)}
            icon={customCategory.icon}
            iconColor={customCategory.iconColor}
          />
        </View>
      </ScrollView>

      {customSelected ? (
        <Input
          className="mt-1"
          label={t("members.status.customLabel")}
          placeholder={t("members.status.customPlaceholder")}
          value={customValue}
          onChangeText={(value) => {
            setCustomValue(value);
            setError(null);
          }}
          maxLength={CUSTOM_MEMBER_STATUS_MAX_LENGTH}
          error={error ?? undefined}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          editable={!isPending}
          testID="member-status-custom-input"
        />
      ) : error ? (
        <Text variant="caption" className="mt-2 text-error-500">
          {error}
        </Text>
      ) : null}

      <View className="mt-3 flex-row items-center justify-end gap-2">
        <IconButton
          icon="X"
          label={t("common.cancel")}
          tone="neutral"
          size="sm"
          onPress={onClose}
          disabled={isPending}
        />
        <IconButton
          icon="Check"
          label={t("common.save")}
          tone="primary"
          size="sm"
          onPress={handleSave}
          disabled={isPending}
          testID="member-status-confirm"
        />
      </View>
    </View>
  );
}
