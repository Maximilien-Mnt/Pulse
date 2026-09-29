// PULSE — shared event form sections (private + public).
// See lib/eventFields.ts for the official field specification these render.
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { SportLevelField } from "@/components/shared/SportLevelField";
import { SPORTS } from "@/lib/constants";
import { t } from "@/hooks/useTranslation";

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
              <View className="flex-row items-center gap-1.5">
                <Icon name={s.icon} size={14} color={selected ? "#FFFFFF" : s.color} />
                <Text className={selected ? "text-white text-sm font-medium" : "text-neutral-700 dark:text-neutral-200 text-sm"}>{s.label}</Text>
              </View>
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
 * Required level for each selected sport. Organizers pick one of the
 * sport-specific presets or choose "Autre" and type their own. The stored
 * value remains a plain string, so custom levels need no database change.
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
  if (sports.length === 0) return null;

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {t("create.event.levelPerSport")} <Text className="text-error">*</Text>
      </Text>
      {sports.map((id) => {
        const sport = SPORTS.find((s) => s.id === id);
        return (
          <View key={id} className="mb-4">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Icon name={sport?.icon ?? "Circle"} size={12} color={sport?.color} />
              <Text className="text-xs text-neutral-500">
                {sport?.label ?? id} — {t("create.event.requiredLevel")} <Text className="text-error">*</Text>
              </Text>
            </View>
            <SportLevelField
              sportId={id}
              value={values[id] ?? ""}
              onChange={(next) => onChange({ ...values, [id]: next })}
              a11yPrefix={sport?.label ?? id}
              error={errors?.[id]}
              inputLabel={`${t("forms.otherLabel")} — ${sport?.label ?? id}`}
              testID={`event-level-${id}`}
            />
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
