// ---------------------------------------------------------------------------
// PULSE SHARED — SportLevelField
//
// Single implementation of the "…+ Other" option pattern used by every place
// where the user picks a sport level or a practice type (club creation, club
// settings, event forms, signup step 3, profile settings).
//
// The option list comes from `sportLevels()` / `sportPractices()` in
// lib/constants.ts and always ends with the "Autre" sentinel. Picking it opens
// the free-text input below the chips; the typed detail then REPLACES the
// sentinel (see `resolveOtherOption`), so values stay plain strings and need
// no database change.
// ---------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { t } from "@/hooks/useTranslation";
import {
  OTHER_OPTION,
  isOtherOption,
  otherOptionDetail,
  resolveOtherOption,
  sportLevels,
  sportPractices,
} from "@/lib/constants";
import { cn } from "@/utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SportLevelFieldProps = {
  /** Sport the option list belongs to (drives the preset ladder). */
  sportId: string;
  /** Which preset list to offer — levels (default) or practice types. */
  kind?: "level" | "practice";
  /** Controlled value: a preset, the "Autre" sentinel, free text, or "". */
  value: string;
  /** Called with the next stored value (trimmed detail, preset, or ""). */
  onChange: (next: string) => void;
  /** Optional caption rendered above the chips (already localised). */
  label?: string;
  /** Prefix for each chip's accessible name, e.g. the sport label. */
  a11yPrefix?: string;
  /** Validation error — shown inside the input, else under the chips. */
  error?: string;
  /** Test identifier for the free-text input. */
  testID?: string;
  /** Label of the free-text input (defaults to `forms.otherLabel`). */
  inputLabel?: string;
  /** Placeholder of the free-text input (defaults per `kind`). */
  placeholder?: string;
  /** Max length of the typed detail (defaults to 80, the validation cap). */
  maxLength?: number;
  /** Horizontal scroller (club creation) instead of a wrapping row. */
  layout?: "wrap" | "scroll";
  /** Chip look: filled (default) or primary-outline (club settings). */
  variant?: "solid" | "outline";
  /** Chip density: md (default) or sm. */
  size?: "md" | "sm";
  /** Tapping the selected chip clears the value (club creation). */
  clearOnReselect?: boolean;
  /** Extra classes for the chip row / scroller. */
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SportLevelField({
  sportId,
  kind = "level",
  value,
  onChange,
  label,
  a11yPrefix,
  error,
  testID,
  inputLabel,
  placeholder,
  maxLength = 80,
  layout = "wrap",
  variant = "solid",
  size = "md",
  clearOnReselect = false,
  className,
}: SportLevelFieldProps) {
  const options = useMemo(
    () => (kind === "practice" ? sportPractices(sportId) : sportLevels(sportId)),
    [kind, sportId]
  );

  // The "Autre" input can stay open even when the typed detail happens to
  // match a preset (the user is still typing), so open/closed is tracked
  // locally and only re-derived when the value changes from OUTSIDE the field.
  const [otherActive, setOtherActive] = useState(() => isOtherOption(options, value));
  const [draft, setDraft] = useState(() => otherOptionDetail(value));
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    // Skip echoes of our own emission while the input is open: the resolved
    // value is trimmed, so syncing from it here would eat a trailing space.
    if (otherActive && resolveOtherOption(draftRef.current) === value) return;
    const other = isOtherOption(options, value);
    setOtherActive(other);
    setDraft(other ? otherOptionDetail(value) : "");
  }, [value, options, otherActive]);


  const choosePreset = (option: string) => {
    const already = !otherActive && value === option;
    if (already) {
      if (clearOnReselect) {
        setDraft("");
        onChange("");
      }
      return;
    }
    setOtherActive(false);
    setDraft("");
    onChange(option);
  };

  const chooseOther = () => {
    if (otherActive) {
      // Already open: keep the pick, or clear it when re-tap clears.
      if (clearOnReselect) {
        setOtherActive(false);
        setDraft("");
        onChange("");
      }
      return;
    }
    setOtherActive(true);
    setDraft("");
    onChange(OTHER_OPTION);
  };

  const handleDetailChange = (text: string) => {
    setDraft(text);
    onChange(resolveOtherOption(text));
  };

  const chipSizeClass = size === "sm" ? "px-2.5 py-1" : "px-3 py-2";
  const chipTextSize = size === "sm" ? "text-xs" : "text-sm";

  const chipClass = (selected: boolean) =>
    cn(
      "border rounded-full",
      chipSizeClass,
      selected
        ? "bg-primary border-primary"
        : variant === "outline"
          ? "border-primary bg-transparent"
          : "bg-neutral-100 border-transparent dark:bg-neutral-800"
    );

  const chipTextClass = (selected: boolean) =>
    selected
      ? cn(chipTextSize, "font-medium text-white")
      : cn(chipTextSize, "text-neutral-700 dark:text-neutral-200");

  const chips = options.map((option) => {
    const selected = option === OTHER_OPTION ? otherActive : !otherActive && value === option;
    return (
      <Pressable
        key={option}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={a11yPrefix ? `${a11yPrefix} — ${option}` : option}
        onPress={() => (option === OTHER_OPTION ? chooseOther() : choosePreset(option))}
        className={chipClass(selected)}
      >
        <Text className={chipTextClass(selected)}>{option}</Text>
      </Pressable>
    );
  });

  return (
    <View className={className}>
      {label ? (
        <Text className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{label}</Text>
      ) : null}

      {layout === "scroll" ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row", gap: 8 }}
        >
          {chips}
        </ScrollView>
      ) : (
        <View className="flex-row flex-wrap gap-2">{chips}</View>
      )}

      {otherActive ? (
        <Input
          className="mt-2"
          label={inputLabel ?? t("forms.otherLabel")}
          value={draft}
          onChangeText={handleDetailChange}
          placeholder={
            placeholder ?? (kind === "level" ? t("forms.levelExample") : t("forms.otherPlaceholder"))
          }
          maxLength={maxLength}
          error={error}
          testID={testID}
        />
      ) : error ? (
        <Text className="text-xs text-error mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
