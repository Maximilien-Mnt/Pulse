import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EVENT_CATEGORIES, SPORTS } from "@/lib/constants";
import type { EventListFilters } from "@/hooks/useEvents";
import DateTimePicker from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { t } from "@/hooks/useTranslation";

type Props = {
  visible: boolean;
  onClose: () => void;
  value: EventListFilters;
  onApply: (v: EventListFilters) => void;
  isLocationEnabled?: boolean;
};

export function EventFilters({ visible, onClose, value, onApply, isLocationEnabled = false }: Props) {
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
          accessibilityLabel="Fermer"
        />
        <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 rounded-t-3xl max-h-[90%] px-4 pt-4 pb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Filtres événements</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={28} color="#64748B" />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text className="text-sm font-medium mb-2">Sports</Text>
            <View className="flex-row flex-wrap">
              {SPORTS.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => toggleSport(s.id)}
                  className={`px-4 py-3 rounded-full mr-2 mb-2 active:opacity-80 ${draft.sports.includes(s.id) ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
                >
                  <Text className={draft.sports.includes(s.id) ? "text-white font-medium" : "text-neutral-800 dark:text-neutral-100"}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Input
              label="Pays / ville"
              value={draft.location}
              onChangeText={(location) => setDraft((d) => ({ ...d, location }))}
            />
            <Text className="text-sm font-medium mb-2">Date début</Text>
            <Pressable onPress={() => setShowFrom(true)} className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-3 mb-2">
              <Text>{draft.dateFrom ?? "Choisir"}</Text>
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
            <Text className="text-sm font-medium mb-2">Date fin</Text>
            <Pressable onPress={() => setShowTo(true)} className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-3 mb-2">
              <Text>{draft.dateTo ?? "Choisir"}</Text>
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
            <Input
              label="Niveau requis"
              value={draft.requiredLevel}
              onChangeText={(requiredLevel) => setDraft((d) => ({ ...d, requiredLevel }))}
            />
            <Text className="text-sm font-medium mt-2">Difficulté ({draft.difficultyMin}–{draft.difficultyMax})</Text>
            <Slider
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={draft.difficultyMax}
              onValueChange={(v) => setDraft((d) => ({ ...d, difficultyMin: 1, difficultyMax: Math.round(v) }))}
            />
            <Text className="text-sm font-medium mb-2">Catégorie</Text>
            <View className="flex-row flex-wrap mb-2">
              {EVENT_CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setDraft((d) => ({ ...d, category: d.category === c ? "" : c }))}
                  className={`px-3 py-2 rounded-full mr-2 mb-2 ${draft.category === c ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
                >
                  <Text className={draft.category === c ? "text-white" : "text-neutral-800 dark:text-neutral-100"}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-neutral-800 dark:text-neutral-100">Payant uniquement</Text>
              <Switch
                value={draft.paidOnly === true}
                onValueChange={(on) => setDraft((d) => ({ ...d, paidOnly: on ? true : null }))}
              />
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-neutral-800 dark:text-neutral-100">Gratuit uniquement</Text>
              <Switch
                value={draft.paidOnly === false}
                onValueChange={(on) => setDraft((d) => ({ ...d, paidOnly: on ? false : null }))}
              />
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-neutral-800 dark:text-neutral-100">Internes uniquement</Text>
              <Switch
                value={draft.internalOnly}
                onValueChange={(internalOnly) =>
                  setDraft((d) => ({ ...d, internalOnly, externalOnly: internalOnly ? false : d.externalOnly }))
                }
              />
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-neutral-800 dark:text-neutral-100">Externes uniquement</Text>
              <Switch
                value={draft.externalOnly}
                onValueChange={(externalOnly) =>
                  setDraft((d) => ({ ...d, externalOnly, internalOnly: externalOnly ? false : d.internalOnly }))
                }
              />
            </View>
            <View className="flex-row items-center justify-between py-2 mb-2">
              <Text className="text-neutral-800 dark:text-neutral-100">Favoris uniquement</Text>
              <Switch
                value={draft.favoritesOnly}
                onValueChange={(favoritesOnly) => setDraft((d) => ({ ...d, favoritesOnly }))}
              />
            </View>
            <View className="mt-6 gap-3">
              <Button
                title="Appliquer"
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
                    requiredLevel: "",
                    difficultyMin: 0,
                    difficultyMax: 5,
                    category: "",
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
