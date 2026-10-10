// ---------------------------------------------------------------------------
// PULSE FEED — Inline sort panel
//
// The "sort" half of the old combined search panel, split into its own
// inline panel that opens under the header when the sort button is tapped.
// Single-select: tapping an option applies it immediately.
// ---------------------------------------------------------------------------

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/utils/format";
import { PressableScale, CHIP_SCALE_HOVER, CHIP_SCALE_PRESS } from "@/components/ui/PressableScale";
import type { SearchSort } from "@/components/feed/SearchPanel";

type Props = {
  value: SearchSort;
  onSelect: (value: SearchSort) => void;
  onClose: () => void;
};

const DEFAULT_SORT: SearchSort = "relevance";

const SORT_LABELS: { key: SearchSort; label: string }[] = [
  { key: "relevance", label: "Pertinence" },
  { key: "date", label: "Date" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Commentaires" },
  { key: "shares", label: "Partages" },
];

function ToggleButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      scaleOnHover={CHIP_SCALE_HOVER}
      scaleOnPress={CHIP_SCALE_PRESS}
      className={cn(
        "px-3 py-2 rounded-full border active:opacity-80",
        active
          ? "bg-primary border-primary"
          : "bg-transparent border-neutral-300 dark:border-neutral-700"
      )}
    >
      <Text className={active ? "text-white text-sm" : "text-neutral-700 dark:text-neutral-200 text-sm"}>
        {label}
      </Text>
    </PressableScale>
  );
}

function FilterSection({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View className="border-b border-neutral-200 dark:border-neutral-800">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        className="flex-row items-center justify-between py-3 active:opacity-70"
      >
        <View className="flex-row items-center gap-2 flex-1">
          <Text
            className={cn(
              "text-sm font-semibold",
              open ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-500"
            )}
          >
            {title}
          </Text>
          {badge && badge > 0 ? (
            <View className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
              <Text className="text-white text-[11px] leading-[18px]">{badge}</Text>
            </View>
          ) : null}
        </View>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={18} color="text-tertiary" />
      </Pressable>
      {open ? <View className="pb-3">{children}</View> : null}
    </View>
  );
}

export function FeedSortPanel({ value, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const maxHeight = Math.min(height * 0.46, 380);

  const activeOption = useMemo(() => SORT_LABELS.find((o) => o.key === value), [value]);
  const isDefault = value === DEFAULT_SORT;
  const pills = useMemo(
    () => (isDefault || !activeOption ? [] : [{ id: value, label: activeOption.label }]),
    [isDefault, activeOption, value]
  );

  const clearAll = useCallback(() => onSelect(DEFAULT_SORT), [onSelect]);

  return (
    <View className="bg-bg dark:bg-bg-dark border-b border-neutral-200 dark:border-neutral-800">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Text variant="caption" className="text-neutral-900 dark:text-neutral-50 font-semibold">
            {t("feed.sortTitle")}
          </Text>
          {pills.length > 0 ? (
            <View className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
              <Text variant="caption" className="text-white text-[11px] leading-[18px]">
                {pills.length}
              </Text>
            </View>
          ) : null}
        </View>
        {pills.length > 0 ? (
          <Pressable
            onPress={clearAll}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("feed.filterReset")}
            className="px-2 py-1 rounded-full active:opacity-60"
          >
            <Text variant="caption" className="text-primary">
              {t("feed.filterReset")}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("feed.sortTitle")}
          className="pl-2 py-1 rounded-full active:opacity-60"
        >
          <Icon name="ChevronUp" size={18} color="text-tertiary" />
        </Pressable>
      </View>

      {/* ── Active pill (tap to reset) ─────────────────────────────── */}
      {pills.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}
        >
          {pills.map((p) => (
            <Pressable
              key={p.id}
              onPress={clearAll}
              accessibilityRole="button"
              accessibilityLabel={`${p.label} — ${t("feed.filterReset")}`}
              className="flex-row items-center gap-1 pl-3 pr-2 py-1.5 rounded-full bg-primary/10 active:opacity-70"
            >
              <Text variant="caption" className="text-primary">
                {p.label}
              </Text>
              <Icon name="X" size={13} color="primary" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* ── Options ────────────────────────────────────────────────── */}
      <ScrollView
        style={{ maxHeight: maxHeight - (pills.length > 0 ? 104 : 60) }}
        showsVerticalScrollIndicator
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      >
        <FilterSection title={t("feed.sortTitle")} badge={isDefault ? 0 : 1} defaultOpen>
          <View className="flex-row flex-wrap gap-2">
            {SORT_LABELS.map((option) => (
              <ToggleButton
                key={option.key}
                label={option.label}
                active={value === option.key}
                onPress={() => onSelect(option.key)}
              />
            ))}
          </View>
        </FilterSection>
      </ScrollView>
    </View>
  );
}

