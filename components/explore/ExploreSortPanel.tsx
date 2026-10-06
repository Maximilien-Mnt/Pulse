// PULSE EXPLORE — Inline sort panel (same design/logic as filter panel).
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import Slider from "@react-native-community/slider";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import type { SortOption } from "@/components/shared/SortSheet";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/utils/format";

function ToggleButton({ label, active, onPress, testID }: {
  label: string; active: boolean; onPress: () => void; testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn("flex-row items-center gap-1.5 px-3 py-2 rounded-full border active:opacity-80",
        active ? "bg-primary border-primary"
          : "bg-surface dark:bg-surface-dark border-border dark:border-border-dark")}>
      <Text variant="caption"
        className={active ? "text-white" : "text-text-secondary dark:text-text-secondary-dark"}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterSection({ id, title, badge, children, defaultOpen = false }: {
  id: string; title: string; badge?: number; children: ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  return (
    <View className="border-b border-border dark:border-border-dark">
      <Pressable testID={`sort-section-${id}`} onPress={toggle}
        accessibilityRole="button" accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        className="flex-row items-center justify-between py-3 active:opacity-70">
        <View className="flex-row items-center gap-2 flex-1">
          <Text variant="caption"
            className={open ? "text-text-primary" : "text-text-secondary dark:text-text-secondary-dark"}>
            {title}
          </Text>
          {badge && badge > 0 ? (
            <View className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
              <Text variant="caption" className="text-white text-[11px] leading-[18px]">{badge}</Text>
            </View>
          ) : null}
        </View>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={18} color="text-tertiary" />
      </Pressable>
      {open ? <View className="pb-3">{children}</View> : null}
    </View>
  );
}

export type ExploreSortPanelProps = {
  options: readonly SortOption[];
  value: string;
  onSelect: (value: string) => void;
  radiusKm: number;
  onRadiusKm: (km: number) => void;
  isLocationEnabled?: boolean;
  onRequestLocation: () => void;
  onClose: () => void;
};

const DEFAULT_SORT = "relevance";

export function ExploreSortPanel(props: ExploreSortPanelProps) {
  const { options, value, onSelect, onClose, radiusKm, onRadiusKm, isLocationEnabled = false, onRequestLocation } = props;
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const maxHeight = Math.min(height * 0.46, 380);
  const activeOption = useMemo(() => options.find((o) => o.value === value), [options, value]);
  const isDefault = value === DEFAULT_SORT;
  const pills = useMemo(
    () => (isDefault || !activeOption ? [] : [{ id: value, label: activeOption.label }]),
    [isDefault, activeOption, value]
  );
  const clearAll = useCallback(() => onSelect(DEFAULT_SORT), [onSelect]);
  const toggleOption = useCallback((optionValue: string) => {
    if (optionValue === "nearby" && !isLocationEnabled) onRequestLocation();
    onSelect(optionValue === value ? DEFAULT_SORT : optionValue);
  }, [value, isLocationEnabled, onRequestLocation, onSelect]);
  const isNearby = value === "nearby";
  const showRadius = isNearby && isLocationEnabled;
  return (
    <View testID="explore-sort-panel" style={{ maxHeight }}
      className="bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark">
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Text variant="caption" className="text-text-primary">{t("explore.sort")}</Text>
          {pills.length > 0 ? (
            <View className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
              <Text variant="caption" className="text-white text-[11px] leading-[18px]">{pills.length}</Text>
            </View>
          ) : null}
        </View>
        {pills.length > 0 ? (
          <Pressable testID="explore-sort-clear-all" onPress={clearAll} hitSlop={8}
            accessibilityRole="button" accessibilityLabel={t("explore.clearAllFilters")}
            className="px-2 py-1 rounded-full active:opacity-60">
            <Text variant="caption" className="text-primary">{t("common.reset")}</Text>
          </Pressable>
        ) : null}
        <Pressable testID="explore-sort-collapse" onPress={onClose} hitSlop={8}
          accessibilityRole="button" accessibilityLabel={t("explore.sort")}
          className="pl-2 py-1 rounded-full active:opacity-60">
          <Icon name="ChevronUp" size={18} color="text-tertiary" />
        </Pressable>
      </View>
      {pills.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}>
          {pills.map((p) => (
            <Pressable key={p.id} testID={`sort-pill-${p.id}`} onPress={clearAll}
              accessibilityRole="button"
              accessibilityLabel={`${p.label} — ${t("common.reset")}`}
              className="flex-row items-center gap-1 pl-3 pr-2 py-1.5 rounded-full bg-primary/10 active:opacity-70">
              <Text variant="caption" className="text-primary">{p.label}</Text>
              <Icon name="X" size={13} color="primary" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <ScrollView testID="explore-sort-sections"
        style={{ maxHeight: maxHeight - (pills.length > 0 ? 104 : 60) }}
        showsVerticalScrollIndicator
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <FilterSection id="order" title={t("explore.sort")} badge={isDefault ? 0 : 1} defaultOpen>
          <View className="flex-row flex-wrap gap-2">
            {options.map((option: SortOption) => (
              <ToggleButton key={option.value} testID={`sort-option-${option.value}`}
                label={option.label} active={value === option.value}
                onPress={() => toggleOption(option.value)} />
            ))}
          </View>
        </FilterSection>
        {isNearby ? (
          <FilterSection id="nearby" title={t("explore.sortRadius")} badge={showRadius ? 1 : 0} defaultOpen>
            {!isLocationEnabled ? (
              <View className="gap-2">
                <Text variant="caption" className="text-text-secondary">{t("explore.sortNearbyHint")}</Text>
                <Pressable testID="sort-nearby-permission" onPress={onRequestLocation}
                  accessibilityRole="button"
                  className="flex-row items-center gap-1.5 px-3 py-2 rounded-full border bg-surface border-border active:opacity-80 self-start">
                  <Icon name="MapPin" size={14} color="text-tertiary" />
                  <Text variant="caption" className="text-text-secondary">{t("explore.sortNearbyHint")}</Text>
                </Pressable>
              </View>
            ) : (
              <View className="gap-1">
                <View className="flex-row justify-between items-center mb-1">
                  <Text variant="caption" className="text-text-secondary">{t("explore.sortRadius")}</Text>
                  <Text variant="caption" className="text-primary">{radiusKm} km</Text>
                </View>
                <Slider style={{ width: "100%", height: 40 }} minimumValue={1} maximumValue={100}
                  step={1} value={radiusKm} onValueChange={(km) => onRadiusKm(Math.round(km))}
                  minimumTrackTintColor="#1E6BFF" maximumTrackTintColor="#E2E8F0" thumbTintColor="#1E6BFF" />
                <View className="flex-row justify-between">
                  <Text variant="caption" className="text-text-secondary">1 km</Text>
                  <Text variant="caption" className="text-text-secondary">100 km</Text>
                </View>
              </View>
            )}
          </FilterSection>
        ) : null}
      </ScrollView>
    </View>
  );
}

