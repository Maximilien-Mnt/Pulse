// PULSE — shared event form sections (private + public).
// See lib/eventFields.ts for the official field specification these render.
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { SPORTS, SPORT_LEVELS } from "@/lib/constants";
import { t } from "@/hooks/useTranslation";

/** Used when the selected sport has no dedicated level ladder. */
export const FALLBACK_EVENT_LEVELS = ["Débutant", "Intermédiaire", "Confirmé", "Compétition", "Élite"];
const OTHER_LEVEL = "Autre";

export function EventSectionTitle({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <View className="mb-3">
      <View className="flex-row items-center gap-2">
        <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
          <Text className="text-white text-xs font-bold">{step}</Text>
        </View>
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{title}</Text>
      </View>
      {hint ? <Text className="text-xs text-neutral-500 mt-1 ml-8">{hint}</Text> : null}
    </View>
  );
}

export function SportPicker({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {t("create.event.sport")} <Text className="text-error">*</Text>
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {SPORTS.map((s) => {
          const selected = value === s.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={s.label}
              onPress={() => onChange(selected ? "" : s.id)}
              className={`px-3 py-2 rounded-full border ${selected ? "bg-primary border-primary" : "bg-neutral-100 dark:bg-neutral-800 border-transparent"}`}
            >
              <Text className={selected ? "text-white text-sm font-medium" : "text-neutral-700 dark:text-neutral-200 text-sm"}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text className="text-xs text-error mt-1">{error}</Text> : null}
    </View>
  );
}

type ChipRowProps = {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
};

/** Optional single-select chip row (category, level…). Tap again to clear. */
export function EventChipRow({ label, options, value, onChange, required, error }: ChipRowProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {label}
        {required ? <Text className="text-error"> *</Text> : null}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <Pressable
              key={opt}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={opt}
              onPress={() => onChange(selected ? "" : opt)}
              className={`px-3 py-2 rounded-full border ${selected ? "bg-primary border-primary" : "bg-neutral-100 dark:bg-neutral-800 border-transparent"}`}
            >
              <Text className={selected ? "text-white text-sm font-medium" : "text-neutral-700 dark:text-neutral-200 text-sm"}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text className="text-xs text-error mt-1">{error}</Text> : null}
    </View>
  );
}

/**
 * Required level suggestion ladder. Levels are sport-specific (SPORT_LEVELS,
 * same source as club creation) and fall back to the generic ladder.
 */
export function EventLevelPicker({ sport, value, onChange, error }: { sport: string; value: string; onChange: (v: string) => void; error?: string }) {
  const levels = useMemo(() => SPORT_LEVELS[sport as keyof typeof SPORT_LEVELS] ?? FALLBACK_EVENT_LEVELS, [sport]);
  return (
    <EventChipRow
      label={t("create.event.requiredLevel")}
      options={levels}
      value={value}
      onChange={onChange}
      error={error}
    />
  );
}

/** Public-only difficulty rating (1–5, defaults to 3). */
export function EventDifficultyPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t("create.event.difficulty")}</Text>
        <Text className="text-sm font-semibold text-primary">{t("create.event.difficultyValue", { value: String(value) })}</Text>
      </View>
      <View className="flex-row gap-2">
        {[1, 2, 3, 4, 5].map((step) => {
          const selected = value === step;
          return (
            <Pressable
              key={step}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t("create.event.difficultyValue", { value: String(step) })}
              onPress={() => onChange(step)}
              className={`flex-1 h-11 rounded-xl items-center justify-center border ${selected ? "bg-primary border-primary" : "bg-neutral-100 dark:bg-neutral-800 border-transparent"}`}
            >
              <Text className={selected ? "text-white font-semibold" : "text-neutral-700 dark:text-neutral-200"}>{step}</Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row justify-between mt-1">
        <Text className="text-xs text-neutral-500">{t("create.event.difficultyEasy")}</Text>
        <Text className="text-xs text-neutral-500">{t("create.event.difficultyHard")}</Text>
      </View>
    </View>
  );
}
