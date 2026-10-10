// ---------------------------------------------------------------------------
// PULSE FEED — Inline filter panel
//
// Renders the feed's content filters *inline*, right under the header
// (logo + search + buttons) and above the post list — no modal, no Apply
// button. Every change is pushed to the parent immediately; the parent
// re-filters synchronously via applySearch, so the list stays instant.
//
// Controls (the "filter" half of the old combined search panel):
//   - Format        → which post formats show (text/image/gallery/video)
//   - Tag spécifique → narrow to posts carrying a given tag
// ---------------------------------------------------------------------------

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from "react-native";
import type { PostFormat } from "@/types";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { t } from "@/hooks/useTranslation";
import { cn } from "@/utils/format";
import { PressableScale, CHIP_SCALE_HOVER, CHIP_SCALE_PRESS } from "@/components/ui/PressableScale";
import type { SearchOptions } from "@/components/feed/SearchPanel";

type Props = {
  options: SearchOptions;
  onChange: (opts: SearchOptions) => void;
  onClose: () => void;
};

const FORMAT_LABELS: { key: PostFormat; label: string }[] = [
  { key: "text", label: "Texte" },
  { key: "image", label: "Image" },
  { key: "gallery", label: "Galerie" },
  { key: "video", label: t("media.video") },
];

/** A toggle chip. Pressing a selected one untoggles it. */
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      scaleOnHover={CHIP_SCALE_HOVER}
      scaleOnPress={CHIP_SCALE_PRESS}
      className={cn(
        "px-4 py-2.5 rounded-full border active:opacity-80",
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

/** A section with a collapsible body and an active-count badge. */
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

export function FeedFilterPanel({ options, onChange, onClose }: Props) {
  const { height } = useWindowDimensions();
  const maxHeight = Math.min(height * 0.46, 380);

  const toggleFormat = useCallback(
    (format: PostFormat) => {
      const has = options.formats.includes(format);
      const formats = has
        ? options.formats.filter((f) => f !== format)
        : [...options.formats, format];
      onChange({ ...options, formats });
    },
    [options, onChange]
  );

  const formatBadge = options.formats.length;
  const tagBadge = options.tag.trim() ? 1 : 0;

  // Active pills: each selected format + the specific tag. Tapping removes it.
  const pills = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    for (const f of FORMAT_LABELS) {
      if (options.formats.includes(f.key)) list.push({ id: `format-${f.key}`, label: f.label });
    }
    if (options.tag.trim()) list.push({ id: "tag", label: `#${options.tag.trim()}` });
    return list;
  }, [options.formats, options.tag]);

  const removePill = useCallback(
    (id: string) => {
      if (id.startsWith("format-")) {
        toggleFormat(id.slice("format-".length) as PostFormat);
      } else if (id === "tag") {
        onChange({ ...options, tag: "" });
      }
    },
    [toggleFormat, options, onChange]
  );

  const clearAll = useCallback(() => {
    onChange({ ...options, formats: [], tag: "" });
  }, [options, onChange]);

  return (
    <View className="bg-bg dark:bg-bg-dark border-b border-neutral-200 dark:border-neutral-800">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Text variant="caption" className="text-neutral-900 dark:text-neutral-50 font-semibold">
            {t("feed.filterTitle")}
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
          accessibilityLabel={t("feed.filterTitle")}
          className="pl-2 py-1 rounded-full active:opacity-60"
        >
          <Icon name="ChevronUp" size={18} color="text-tertiary" />
        </Pressable>
      </View>

      {/* ── Active pills (tap to remove) ───────────────────────────── */}
      {pills.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}
        >
          {pills.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => removePill(p.id)}
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

      {/* ── Sections ───────────────────────────────────────────────── */}
      <ScrollView
        style={{ maxHeight: maxHeight - (pills.length > 0 ? 104 : 60) }}
        showsVerticalScrollIndicator
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      >
        <FilterSection title="Format" badge={formatBadge} defaultOpen>
          <View className="flex-row flex-wrap gap-2">
            {FORMAT_LABELS.map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                active={options.formats.includes(f.key)}
                onPress={() => toggleFormat(f.key)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Tag spécifique" badge={tagBadge}>
          <TextInput
            value={options.tag}
            onChangeText={(tag) => onChange({ ...options, tag })}
            placeholder={t("feed.tagPlaceholder")}
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            className="px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50"
          />
        </FilterSection>
      </ScrollView>
    </View>
  );
}

