import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { COUNTRIES, countryFlag } from "@/utils/countries";
import { MAX_EVENT_PHOTOS } from "@/lib/eventMedia";
import { t } from "@/hooks/useTranslation";

export function CountryPicker({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.label.toLowerCase().includes(q) || c.code.toLowerCase() === q);
  }, [query]);
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {t("create.event.country")} <Text className="text-error">*</Text>
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("create.event.countryPlaceholder")}
        onPress={() => { setQuery(""); setOpen(true); }}
        className={`h-12 rounded-sm border-[1.5px] px-4 flex-row items-center justify-between ${error ? "border-error-500" : "border-border dark:border-border-dark"} bg-surface dark:bg-surface-dark`}
      >
        <Text className={value ? "text-text-primary" : "text-text-tertiary"}>
          {value ? `${countryFlag(value)} ${value}` : t("create.event.countryPlaceholder")}
        </Text>
        <Icon name="ChevronDown" size={18} color="text-tertiary" />
      </Pressable>
      {error ? <Text className="text-xs text-error mt-1">{error}</Text> : null}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-surface dark:bg-surface-dark rounded-t-2xl max-h-[80%] px-4 pt-4 pb-8">
            <Input label={t("common.search")} value={query} onChangeText={setQuery} placeholder={t("create.event.countryPlaceholder")} autoCapitalize="none" />
            <ScrollView className="mt-2">
              {filtered.slice(0, 60).map((c) => (
                <Pressable key={c.code} onPress={() => { onChange(c.label); setOpen(false); }} className="flex-row items-center gap-2 py-3 border-b border-neutral-100 dark:border-neutral-800">
                  <Text className="text-lg">{countryFlag(c.code)}</Text>
                  <Text className="text-text-primary flex-1">{c.label}</Text>
                  {value === c.label ? <Icon name="CheckCircle2" size={20} color="primary" /> : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setOpen(false)} className="mt-3 items-center py-3">
              <Text className="text-primary font-semibold">{t("common.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Optional cover image: a single slot that can be added, changed and removed.
 * The cover stays independent from the photo gallery below it.
 */
export function CoverPicker({
  url,
  onPick,
  onRemove,
  disabled,
}: {
  url: string | null;
  onPick: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {t("create.event.coverImage")}
      </Text>
      <Text className="text-xs text-neutral-500 mb-2">{t("create.event.coverHint")}</Text>
      {url ? (
        <View className="relative">
          <Image
            source={{ uri: url }}
            style={{ width: "100%", height: 160, borderRadius: 16 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
          <View className="absolute top-2 right-2 flex-row gap-2">
            <Pressable
              onPress={onPick}
              disabled={disabled}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("create.event.changeCover")}
              className="bg-black/60 rounded-full p-2"
            >
              <Icon name="Pen" size={16} color="white" />
            </Pressable>
            <Pressable
              onPress={onRemove}
              disabled={disabled}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("create.event.removeCover")}
              className="bg-error rounded-full p-2"
            >
              <Icon name="X" size={16} color="white" />
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={onPick}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t("create.event.addCover")}
          className="h-32 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 items-center justify-center active:bg-neutral-50 dark:active:bg-neutral-700/50"
        >
          <Icon name="Image" size={28} color="text-tertiary" />
          <Text className="text-sm text-neutral-500 mt-2">{t("create.event.addCover")}</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Up to MAX_EVENT_PHOTOS optional photos. Each slot can be changed (replaced
 * in place) and removed individually; photos are added through `onAdd`.
 */
export function PhotosPicker({
  uris,
  onAdd,
  onChange,
  onRemove,
}: {
  uris: string[];
  onAdd: () => void;
  onChange: (i: number) => void;
  onRemove: (i: number) => void;
}) {
  const canAdd = uris.length < MAX_EVENT_PHOTOS;
  return (
    <View>
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {t("create.event.photos")} ({uris.length}/{MAX_EVENT_PHOTOS})
      </Text>
      <Text className="text-xs text-neutral-500 mb-2">{t("create.event.photosHint")}</Text>
      <View className="flex-row gap-2">
        {canAdd ? (
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={t("create.event.addPhotos")}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 items-center justify-center"
          >
            <Icon name="Plus" size={24} color="text-tertiary" />
          </Pressable>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {uris.map((uri, i) => (
            <View key={`${uri}-${i}`} className="mr-2">
              <Image
                source={{ uri }}
                style={{ width: 80, height: 80, borderRadius: 12 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
              <View className="absolute bottom-1 right-1 flex-row gap-1">
                <Pressable
                  onPress={() => onChange(i)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("create.event.changePhoto")}
                  className="bg-black/60 rounded-full p-1"
                >
                  <Icon name="Pen" size={12} color="white" />
                </Pressable>
                <Pressable
                  onPress={() => onRemove(i)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("create.event.removePhoto")}
                  className="bg-error rounded-full p-1"
                >
                  <Icon name="X" size={12} color="white" />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
