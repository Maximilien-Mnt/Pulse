import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SPORTS } from "@/lib/constants";
import { getSportLabel } from "@/lib/i18n";
import type { EventListFilters } from "@/hooks/useEvents";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Icon } from "@/components/ui/Icon";
import { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Switch, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useTranslation } from "@/hooks/useTranslation";

type Props = {
  visible: boolean;
  onClose: () => void;
  value: EventListFilters;
  onApply: (v: EventListFilters) => void;
  isLocationEnabled?: boolean;
};

export function EventFilters({ visible, onClose, value, onApply, isLocationEnabled = false }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<EventListFilters>(value);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const toggleSport = (id: string) => {
    setDraft((d) => ({
      ...d,
      sports: d.sports.includes(id) ? d.sports.filter((s) => s !== id) : [...d.sports, id],
    }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1">
        {/* Backdrop — tapping outside closes the modal */}
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        />
        <View className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark rounded-t-3xl max-h-[90%] px-4 pt-4 pb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text variant="h2" className="text-text-primary">
              {t("events.filterTitle")}
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.close")}>
              <Icon name="X" size={28} color="text-secondary" />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text variant="caption" className="font-medium text-text-secondary mb-2">
              {t("events.filters.sports")}
            </Text>
            <View className="flex-row flex-wrap">
              {SPORTS.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => toggleSport(s.id)}
                  className={`px-4 py-3 rounded-full mr-2 mb-2 active:opacity-80 ${draft.sports.includes(s.id) ? "bg-primary" : "bg-chip dark:bg-chip-dark"}`}
                >
                  <Text
                    variant="body"
                    className={draft.sports.includes(s.id) ? "text-white font-medium" : "text-chip-text dark:text-chip-text-dark"}
                  >
                    {getSportLabel(s.id)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Input
              label={t("events.filters.location")}
              value={draft.location}
              onChangeText={(location) => setDraft((d) => ({ ...d, location }))}
            />
            <Text variant="caption" className="font-medium text-text-secondary mb-2">
              {t("events.filters.dateStart")}
            </Text>
            <Pressable onPress={() => setShowFrom(true)} className="border-2 border-border dark:border-border-dark rounded-xl p-3 mb-2">
              <Text variant="body" className="text-text-primary">
                {draft.dateFrom ?? t("events.filters.choose")}
              </Text>
            </Pressable>
            {showFrom ? (
              <DateTimePicker
                value={draft.dateFrom ? new Date(draft.dateFrom) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, d) => {
                  setShowFrom(Platform.OS === "ios");
                  if (d) setDraft((prev) => ({ ...prev, dateFrom: d.toISOString() }));
                }}
              />
            ) : null}
            <Text variant="caption" className="font-medium text-text-secondary mb-2">
              {t("events.filters.dateEnd")}
            </Text>
            <Pressable onPress={() => setShowTo(true)} className="border-2 border-border dark:border-border-dark rounded-xl p-3 mb-2">
              <Text variant="body" className="text-text-primary">
                {draft.dateTo ?? t("events.filters.choose")}
              </Text>
            </Pressable>
            {showTo ? (
              <DateTimePicker
                value={draft.dateTo ? new Date(draft.dateTo) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, d) => {
                  setShowTo(Platform.OS === "ios");
                  if (d) setDraft((prev) => ({ ...prev, dateTo: d.toISOString() }));
                }}
              />
            ) : null}
            <View className="flex-row items-center justify-between py-2">
              <Text variant="body" className="text-text-primary">
                {t("events.filters.paidOnly")}
              </Text>
              <Switch
                value={draft.paidOnly === true}
                onValueChange={(on) => setDraft((d) => ({ ...d, paidOnly: on ? true : null }))}
              />
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text variant="body" className="text-text-primary">
                {t("events.filters.freeOnly")}
              </Text>
              <Switch
                value={draft.paidOnly === false}
                onValueChange={(on) => setDraft((d) => ({ ...d, paidOnly: on ? false : null }))}
              />
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text variant="body" className="text-text-primary">
                {t("events.filters.internalOnly")}
              </Text>
              <Switch
                value={draft.internalOnly}
                onValueChange={(internalOnly) =>
                  setDraft((d) => ({ ...d, internalOnly, externalOnly: internalOnly ? false : d.externalOnly }))
                }
              />
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text variant="body" className="text-text-primary">
                {t("events.filters.externalOnly")}
              </Text>
              <Switch
                value={draft.externalOnly}
                onValueChange={(externalOnly) =>
                  setDraft((d) => ({ ...d, externalOnly, internalOnly: externalOnly ? false : d.internalOnly }))
                }
              />
            </View>
            <View className="flex-row items-center justify-between py-2 mb-2">
              <Text variant="body" className="text-text-primary">
                {t("events.filters.favoritesOnly")}
              </Text>
              <Switch
                value={draft.favoritesOnly}
                onValueChange={(favoritesOnly) => setDraft((d) => ({ ...d, favoritesOnly }))}
              />
            </View>
            <View className="mt-6 gap-3">
              <Button
                title={t("common.apply")}
                onPress={() => {
                  onApply(draft);
                  onClose();
                }}
              />
              <Button
                title={t("common.reset")}
                variant="ghost"
                onPress={() => {
                  const reset: EventListFilters = {
                    sports: [],
                    location: "",
                    dateFrom: null,
                    dateTo: null,
                    paidOnly: null,
                    internalOnly: false,
                    externalOnly: false,
                    favoritesOnly: false,
                    // Keep the order chosen from the order button (and its radius).
                    sort: draft.sort,
                    radiusKm: draft.radiusKm ?? 10,
                  };
                  setDraft(reset);
                  onApply(reset);
                  onClose();
                }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
