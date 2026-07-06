import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CLUB_SORT_OPTIONS, SPORTS } from "@/lib/constants";
import type { ClubListFilters } from "@/hooks/useClubs";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  value: ClubListFilters;
  onApply: (v: ClubListFilters) => void;
};

export function ClubFilters({ visible, onClose, value, onApply }: Props) {
  const [draft, setDraft] = useState<ClubListFilters>(value);
  const toggleSport = (id: string) => {
    setDraft((d) => ({
      ...d,
      sports: d.sports.includes(id) ? d.sports.filter((s) => s !== id) : [...d.sports, id],
    }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl max-h-[85%] px-4 pt-4 pb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Filtres clubs</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={28} color="#64748B" />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">Sports</Text>
            <View className="flex-row flex-wrap">
              {SPORTS.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => toggleSport(s.id)}
                  className={`px-3 py-2 rounded-full mr-2 mb-2 ${draft.sports.includes(s.id) ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
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
              placeholder="Ex. Luxembourg"
            />
            <Input
              label="Niveau requis (exact)"
              value={draft.requiredLevel}
              onChangeText={(requiredLevel) => setDraft((d) => ({ ...d, requiredLevel }))}
            />
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-neutral-800 dark:text-neutral-100">Internes uniquement</Text>
              <Switch
                value={draft.internalOnly}
                onValueChange={(internalOnly) => setDraft((d) => ({ ...d, internalOnly, externalOnly: internalOnly ? false : d.externalOnly }))}
              />
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-neutral-800 dark:text-neutral-100">Externes uniquement</Text>
              <Switch
                value={draft.externalOnly}
                onValueChange={(externalOnly) => setDraft((d) => ({ ...d, externalOnly, internalOnly: externalOnly ? false : d.internalOnly }))}
              />
            </View>
            <View className="flex-row items-center justify-between py-2 mb-4">
              <Text className="text-neutral-800 dark:text-neutral-100">Favoris uniquement</Text>
              <Switch
                value={draft.favoritesOnly}
                onValueChange={(favoritesOnly) => setDraft((d) => ({ ...d, favoritesOnly }))}
              />
            </View>
            <Text className="text-sm font-medium mb-2">Tri</Text>
            {CLUB_SORT_OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => setDraft((d) => ({ ...d, sort: o.value }))}
                className={`py-3 border-b border-neutral-100 dark:border-neutral-800 ${draft.sort === o.value ? "bg-primary/5" : ""}`}
              >
                <Text className="text-base text-neutral-900 dark:text-neutral-50">{o.label}</Text>
              </Pressable>
            ))}
            <View className="mt-6 gap-3">
              <Button
                title="Appliquer"
                onPress={() => {
                  onApply(draft);
                  onClose();
                }}
              />
              <Button
                title="Réinitialiser"
                variant="ghost"
                onPress={() => {
                  const reset: ClubListFilters = {
                    sports: [],
                    location: "",
                    requiredLevel: "",
                    internalOnly: false,
                    externalOnly: false,
                    favoritesOnly: false,
                    sort: "relevance",
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
