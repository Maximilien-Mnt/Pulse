// PULSE — shared event form sections (private + public).
// See lib/eventFields.ts for the official field specification these render.
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { SPORTS, SPORT_LEVELS } from "@/lib/constants";
import { t } from "@/hooks/useTranslation";

/** Used when the selected sport has no dedicated level ladder. */
export const FALLBACK_EVENT_LEVELS = ["Débutant", "Intermédiaire", "Confirmé", "Compétition", "Élite"];

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

/**
 * Multi-sport picker: an event can cover several sports. The first selected
 * sport is stored as the primary `sport` (cards, filters, search), while the
 * full list lives in `sports` — same model as club creation.
 * Tap a selected chip again to remove it.
 */
export function SportPicker({ value, onChange, error }: { value: string[]; onChange: (next: string[]) => void; error?: string }) {
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((s) => s !== id) : [...value, id]);
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {t("create.event.sports")} <Text className="text-error">*</Text>
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {SPORTS.map((s) => {
          const selected = value.includes(s.id);
          return (
            <Pressable
              key={s.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={s.label}
              onPress={() => toggle(s.id)}
              className={`px-3 py-2 rounded-full border ${selected ? "bg-primary border-primary" : "bg-neutral-100 dark:bg-neutral-800 border-transparent"}`}
            >
              <Text className={selected ? "text-white text-sm font-medium" : "text-neutral-700 dark:text-neutral-200 text-sm"}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {value.length > 0 ? (
        <Text className="text-xs text-neutral-500 mt-2">
          {t("create.event.primarySport", { sport: SPORTS.find((s) => s.id === value[0])?.label ?? value[0]! })}
        </Text>
      ) : null}
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
 * Per-sport required level: one ladder per selected sport, using the
 * sport-specific levels (SPORT_LEVELS, same source as club creation) with the
 * generic fallback. Tap a selected level again to clear that sport's level.
 * Every sport is asked separately, including when several are selected.
 */
export function EventLevelsPerSport({
  sports,
  values,
  onChange,
}: {
  sports: string[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const ladders = useMemo(
    () =>
      sports.map((id) => ({
        id,
        label: SPORTS.find((s) => s.id === id)?.label ?? id,
        levels: SPORT_LEVELS[id as keyof typeof SPORT_LEVELS] ?? FALLBACK_EVENT_LEVELS,
      })),
    [sports]
  );

  if (ladders.length === 0) return null;

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {t("create.event.levelPerSport")}
      </Text>
      {ladders.map(({ id, label, levels }) => (
        <View key={id} className="mb-3">
          <Text className="text-xs text-neutral-500 mb-1">{label}</Text>
          <View className="flex-row flex-wrap gap-2">
            {levels.map((lvl) => {
              const selected = values[id] === lvl;
              return (
                <Pressable
                  key={lvl}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${label} — ${lvl}`}
                  onPress={() => onChange({ ...values, [id]: selected ? "" : lvl })}
                  className={`px-3 py-2 rounded-full border ${selected ? "bg-primary border-primary" : "bg-neutral-100 dark:bg-neutral-800 border-transparent"}`}
                >
                  <Text className={selected ? "text-white text-sm font-medium" : "text-neutral-700 dark:text-neutral-200 text-sm"}>{lvl}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * The two description fields every event form carries:
 * - `short_description` (mandatory, 1–200) — cards and page lead.
 * - `description` (optional, up to 2000) — full detail copy.
 */
export function EventDescriptionsFields({
  shortDescription,
  onChangeShort,
  description,
  onChangeDescription,
  shortError,
  longError,
}: {
  shortDescription: string;
  onChangeShort: (v: string) => void;
  description: string;
  onChangeDescription: (v: string) => void;
  shortError?: string;
  longError?: string;
}) {
  return (
    <>
      <Input
        label={`${t("create.event.shortDescription")} *`}
        value={shortDescription}
        onChangeText={onChangeShort}
        maxLength={200}
        error={shortError}
        placeholder={t("create.event.shortDescriptionPlaceholder")}
        help={`${shortDescription.trim().length}/200`}
        testID="event-short-description"
      />
      <View className="mt-4" />
      <Input
        label={t("create.event.longDescription")}
        value={description}
        onChangeText={onChangeDescription}
        multiline
        numberOfLines={4}
        maxLength={2000}
        error={longError}
        placeholder={t("create.event.longDescriptionPlaceholder")}
        help={`${description.length}/2000`}
        testID="event-long-description"
      />
    </>
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
