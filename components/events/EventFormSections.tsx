// PULSE — shared event form sections (private + public).
// See lib/eventFields.ts for the official field specification these render.
import { useMemo, useState } from "react";
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

/**
 * Required level for each selected sport. Organizers can choose one of the
 * sport-specific presets or provide their own level. The stored value remains a
 * plain string, so custom levels require no database change.
 */
export function EventLevelsPerSport({
  sports,
  values,
  onChange,
  errors,
}: {
  sports: string[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  errors?: Record<string, string>;
}) {
  const [customSports, setCustomSports] = useState<Record<string, boolean>>({});
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
        {t("create.event.levelPerSport")} <Text className="text-error">*</Text>
      </Text>
      {ladders.map(({ id, label, levels }) => {
        const value = values[id] ?? "";
        const customValue = customSports[id] ?? (!!value && !levels.includes(value));
        const error = errors?.[id];
        const setValue = (next: string) => {
          onChange({ ...values, [id]: next.trim() });
        };

        return (
          <View key={id} className="mb-4">
            <Text className="text-xs text-neutral-500 mb-1">
              {label} — {t("create.event.requiredLevel")} <Text className="text-error">*</Text>
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {levels.map((level) => {
                const selected = value === level;
                return (
                  <Pressable
                    key={level}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${label} — ${level}`}
                    onPress={() => {
                      setCustomSports((current) => ({ ...current, [id]: !selected }));
                      setValue(selected ? value : level);
                    }}
                    className={`px-3 py-2 rounded-full border ${selected ? "bg-primary border-primary" : "bg-neutral-100 dark:bg-neutral-800 border-transparent"}`}
                  >
                    <Text className={selected ? "text-white text-sm font-medium" : "text-neutral-700 dark:text-neutral-200 text-sm"}>{level}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: customValue }}
                accessibilityLabel={`${label} — ${t("create.event.customLevel")}`}
                onPress={() => {
                  setCustomSports((current) => ({ ...current, [id]: true }));
                  setValue(value || "");
                }}
                className={`px-3 py-2 rounded-full border ${customValue ? "bg-primary border-primary" : "bg-neutral-100 dark:bg-neutral-800 border-transparent"}`}
              >
                <Text className={customValue ? "text-white text-sm font-medium" : "text-neutral-700 dark:text-neutral-200 text-sm"}>{t("create.event.customLevel")}</Text>
              </Pressable>
            </View>
            {customValue ? (
              <Input
                className="mt-2"
                label={`${t("create.event.customLevelFor", { sport: label })} *`}
                value={value}
                onChangeText={(text) => {
                  setCustomSports((current) => ({ ...current, [id]: true }));
                  setValue(text);
                }}
                placeholder={t("create.event.customLevelPlaceholder")}
                maxLength={80}
                error={error}
                testID={`event-level-${id}`}
              />
            ) : error ? (
              <Text className="text-xs text-error mt-1">{error}</Text>
            ) : null}
          </View>
        );
      })}
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
