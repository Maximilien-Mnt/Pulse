import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { COUNTRIES, countryFlag } from "@/utils/countries";
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

export function PhotosPicker({ uris, onAdd, onRemove }: { uris: string[]; onAdd: () => void; onRemove: (i: number) => void }) {
  return (
    <View>
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {t("create.event.photos")} ({uris.length}/5)
      </Text>
      <Text className="text-xs text-neutral-500 mb-2">{t("create.event.photosHint")}</Text>
      <View className="flex-row gap-2">
        <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel={t("create.event.addPhotos")} className="w-20 h-20 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 items-center justify-center">
          <Icon name="Plus" size={24} color="text-tertiary" />
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {uris.map((uri, i) => (
            <View key={`${uri}-${i}`} className="mr-2 relative">
              {i === 0 ? (
                <View className="absolute top-1 left-1 z-10 bg-primary rounded-full px-2 py-0.5">
                  <Text className="text-white text-[10px] font-bold">{t("create.event.coverBadge")}</Text>
                </View>
              ) : null}
              <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 12 }} contentFit="cover" cachePolicy="memory-disk" />
              <Pressable onPress={() => onRemove(i)} className="absolute -top-1 -right-1 bg-error rounded-full p-1" hitSlop={8}>
                <Icon name="X" size={12} color="white" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
