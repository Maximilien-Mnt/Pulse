// ---------------------------------------------------------------------------
// PULSE SHARED — Sort sheet
//
// Lists the available ordering options. On iOS the option list is presented
// through the OS action sheet (nativeActionMenu), so SortSheet only renders
// the fallback bottom sheet (Android / web).
//
// "Nearby" is a two-step flow: on first selection the sheet asks for location
// permission, then re-opens itself with the radius slider visible. The radius
// slider is kept in this sheet (not in a native action sheet) because there is
// no OS widget for a slider inside an action sheet.
// ---------------------------------------------------------------------------

import React, { useEffect } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { useTranslation } from "@/hooks/useTranslation";
import { TranslationKey } from "@/lib/translations";
import { Icon } from "@/components/ui/Icon";
import { hasNativeActionMenu, showNativeActionMenu } from "@/components/shared/nativeActionMenu";
import { cn } from "@/utils/format";

export type SortOption = {
  value: string;
  /** Localised label. The native sheet / fallback sheet both display this. */
  label: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  options: readonly SortOption[];
  value: string;
  onSelect: (value: string) => void;
  radiusKm: number;
  onRadiusKm: (km: number) => void;
  isLocationEnabled?: boolean;
  onRequestLocation: () => void;
};

function isNearbyOption(option: SortOption): boolean {
  return option.value === "nearby";
}

// ---------------------------------------------------------------------------
// iOS — present the OS action sheet
// ---------------------------------------------------------------------------

function openNativeSheet(
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  options: readonly SortOption[],
  value: string,
  isLocationEnabled: boolean,
  onSelect: (value: string) => void,
  onRequestLocation: () => void
): void {
  const iosOptions = options.map((option) => ({
    key: option.value,
    label: option.label,
    disabled: isNearbyOption(option) && !isLocationEnabled,
  }));

  showNativeActionMenu(
    {
      title: `${t("explore.sort")} · ${options.find((o) => o.value === value)?.label ?? value}`,
      options: iosOptions,
      cancelLabel: t("common.close"),
      isDark: false,
    },
    (key) => {
      const chosen = options.find((o) => o.value === key);
      if (chosen && isNearbyOption(chosen)) {
        if (!isLocationEnabled) {
          onRequestLocation();
        }
      }
      onSelect(key);
    }
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SortSheet({
  visible,
  onClose,
  options,
  value,
  onSelect,
  radiusKm,
  onRadiusKm,
  isLocationEnabled = false,
  onRequestLocation,
}: Props) {
  const { t } = useTranslation();
  const showRadius = value === "nearby" && isLocationEnabled;

  // —— iOS: delegate to the OS action sheet, then close ——
  useEffect(() => {
    if (visible && hasNativeActionMenu) {
      openNativeSheet(
        t,
        options,
        value,
        isLocationEnabled,
        onSelect,
        onRequestLocation
      );
      onClose();
    }
  }, [visible, options, value, isLocationEnabled, onSelect, onRequestLocation, onClose, t]);

  if (hasNativeActionMenu) {
    // The native sheet is managed imperatively; nothing to render here.
    return null;
  }

  // —— Android / web: fallback bottom sheet ——
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50">
        {/* Backdrop — tapping outside closes */}
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        />
        <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 rounded-t-3xl max-h-[70%] px-4 pt-4 pb-8">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              {t("explore.sort")}
            </Text>
            <Pressable onPress={onClose}>
              <Icon name="X" size={24} color="text-secondary" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const active = value === option.value;
              const disabled = isNearbyOption(option) && !isLocationEnabled;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    if (isNearbyOption(option) && !isLocationEnabled) {
                      onRequestLocation();
                    }
                    onSelect(option.value);
                    onClose();
                  }}
                  disabled={disabled}
                  className={cn(
                    "py-3 border-b border-border",
                    active ? "bg-primary/5" : ""
                  )}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Text className="text-base text-neutral-900 dark:text-neutral-50">
                        {option.label}
                      </Text>
                      {isNearbyOption(option) && !isLocationEnabled && (
                        <Icon name="MapPin" size={16} color="text-secondary" className="ml-2" />
                      )}
                    </View>
                    {active ? (
                      <Icon name="CheckCircle2" size={20} color="primary" />
                    ) : null}
                  </View>
                  {isNearbyOption(option) && !isLocationEnabled ? (
                    <Text className="text-xs text-text-secondary mt-1">
                      {t("explore.sortNearbyHint")}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}

            {/* Radius slider — only when "nearby" is selected and location is enabled */}
            {showRadius && (
              <View className="mt-4 mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    {t("explore.sortRadius")}
                  </Text>
                  <Text className="text-sm text-primary font-medium">
                    {radiusKm} km
                  </Text>
                </View>
                <Slider
                  style={{ width: "100%", height: 40 }}
                  minimumValue={1}
                  maximumValue={100}
                  step={1}
                  value={radiusKm}
                  onValueChange={(km) => onRadiusKm(Math.round(km))}
                  minimumTrackTintColor="#1E6BFF"
                  maximumTrackTintColor="#E2E8F0"
                  thumbTintColor="#1E6BFF"
                />
                <View className="flex-row justify-between">
                  <Text className="text-xs text-neutral-500">1 km</Text>
                  <Text className="text-xs text-neutral-500">100 km</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}