import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Header } from "@/components/shared/Header";
import { SPORT_LEVELS, SPORT_PRACTICES, SPORTS, WEEKDAYS } from "@/lib/constants";
import type { SportId } from "@/lib/constants";
import { useSignupStore } from "@/stores/signupStore";
import type { SignupSportSelection } from "@/types";
import { signupStep3Schema } from "@/utils/validation";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

// Hours available for selection (6 AM → 11 PM)
const HOURS = Array.from({ length: 18 }, (_, i) => 6 + i);

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export default function SignupStep3() {
  const router = useRouter();
  const posthog = usePostHog();
  const setStep3 = useSignupStore((s) => s.setStep3);
  const [entries, setEntries] = useState<SignupSportSelection[]>([]);
  const [hourPickerOpen, setHourPickerOpen] = useState<{
    sportId: SportId;
    field: "startHour" | "endHour";
  } | null>(null);

  const toggleSport = (id: SportId) => {
    setEntries((prev) => {
      const exists = prev.find((p) => p.sportId === id);
      if (exists) return prev.filter((p) => p.sportId !== id);
      const levels = SPORT_LEVELS[id];
      const practices = SPORT_PRACTICES[id];
      return [
        ...prev,
        {
          sportId: id,
          level: levels[0] ?? "",
          practice: practices[0] ?? "",
          weekdays: [1, 3],
          startHour: 8,
          endHour: 20,
        },
      ];
    });
  };

  const updateEntry = (id: SportId, patch: Partial<SignupSportSelection>) => {
    setEntries((prev) => prev.map((e) => (e.sportId === id ? { ...e, ...patch } : e)));
  };

  const onContinue = () => {
    const parsed = signupStep3Schema.safeParse({
      entries: entries.map((e) => ({
        sportId: e.sportId,
        level: e.level,
        practice: e.practice,
        weekdays: e.weekdays,
        startHour: e.startHour,
        endHour: e.endHour,
      })),
    });
    if (!parsed.success) return;
    setStep3(parsed.data.entries as SignupSportSelection[]);
    posthog.capture("signup_step_completed", {
      step: 3,
      sports_count: entries.length,
      sports: entries.map((e) => e.sportId),
    });
    router.push("/auth/signup/step4");
  };

  const sportLabel = useMemo(() => Object.fromEntries(SPORTS.map((s) => [s.id, s.label])), []);

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <Header title="Étape 3/5" showBackButton backToLanding className="mb-2" />
      <ScrollView contentContainerClassName="px-4 py-4 pb-24">
        <Text className="text-base text-neutral-700 dark:text-neutral-200 mb-3">Sports pratiqués (min. 1)</Text>
        <View className="flex-row flex-wrap">
          {SPORTS.map((s) => {
            const on = entries.some((e) => e.sportId === s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => toggleSport(s.id)}
                className={`px-3 py-2 rounded-full mr-2 mb-2 ${on ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"}`}
              >
                <Text className={on ? "text-white font-medium" : "text-neutral-800 dark:text-neutral-100"}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {entries.map((e) => (
          <View key={e.sportId} className="mt-4 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
            <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2">{sportLabel[e.sportId]}</Text>

            <Text className="text-sm text-neutral-500 mb-1">Niveau</Text>
            <View className="flex-row flex-wrap mb-2">
              {(SPORT_LEVELS[e.sportId as SportId] ?? []).map((lvl) => (
                <Pressable
                  key={lvl}
                  onPress={() => updateEntry(e.sportId as SportId, { level: lvl })}
                  className={`px-2 py-1 rounded-lg mr-2 mb-2 ${e.level === lvl ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
                >
                  <Text className={e.level === lvl ? "text-white text-xs" : "text-xs text-neutral-800 dark:text-neutral-100"}>{lvl}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-sm text-neutral-500 mb-1">Type de pratique</Text>
            <View className="flex-row flex-wrap mb-2">
              {(SPORT_PRACTICES[e.sportId as SportId] ?? []).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => updateEntry(e.sportId as SportId, { practice: p })}
                  className={`px-2 py-1 rounded-lg mr-2 mb-2 ${e.practice === p ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
                >
                  <Text className={e.practice === p ? "text-white text-xs" : "text-xs text-neutral-800 dark:text-neutral-100"}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-sm text-neutral-500 mb-1">Jours</Text>
            <View className="flex-row flex-wrap mb-2">
              {WEEKDAYS.map((d, idx) => {
                const selected = e.weekdays.includes(idx);
                return (
                  <Pressable
                    key={d}
                    onPress={() =>
                      updateEntry(e.sportId as SportId, {
                        weekdays: selected ? e.weekdays.filter((x) => x !== idx) : [...e.weekdays, idx].sort(),
                      })
                    }
                    className={`px-2 py-1 rounded-lg mr-2 mb-2 ${selected ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
                  >
                    <Text className={selected ? "text-white text-xs" : "text-xs text-neutral-800 dark:text-neutral-100"}>{d.slice(0, 3)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="text-sm text-neutral-500 mb-1">Disponibilités horaires</Text>
            <Text className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">
              Indiquez quand vous avez du temps pour ce sport. Ces horaires nous aident à vous faire découvrir des clubs
              et événements dont les créneaux correspondent à vos disponibilités.
            </Text>
            <View className="flex-row gap-2 mb-2">
              <Pressable
                onPress={() => setHourPickerOpen({ sportId: e.sportId as SportId, field: "startHour" })}
                className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 flex-1 items-center"
              >
                <Text className="text-neutral-900 dark:text-neutral-50 font-medium">{formatHour(e.startHour)}</Text>
                <Text className="text-xs text-neutral-400 dark:text-neutral-500">Début</Text>
              </Pressable>
              <Pressable
                onPress={() => setHourPickerOpen({ sportId: e.sportId as SportId, field: "endHour" })}
                className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 flex-1 items-center"
              >
                <Text className="text-neutral-900 dark:text-neutral-50 font-medium">{formatHour(e.endHour)}</Text>
                <Text className="text-xs text-neutral-400 dark:text-neutral-500">Fin</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Modal visible={!!hourPickerOpen} transparent animationType="fade" onRequestClose={() => setHourPickerOpen(null)}>
          <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setHourPickerOpen(null)}>
            <View className="bg-white dark:bg-neutral-900 rounded-t-2xl p-4 max-h-[50%]">
              <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                {hourPickerOpen?.field === "startHour" ? "Heure de début" : "Heure de fin"}
              </Text>
              <FlatList
                data={HOURS}
                keyExtractor={(h) => String(h)}
                renderItem={({ item: h }) => (
                  <Pressable
                    className="py-3 border-b border-neutral-100 dark:border-neutral-800"
                    onPress={() => {
                      if (hourPickerOpen) {
                        updateEntry(hourPickerOpen.sportId, { [hourPickerOpen.field]: h });
                      }
                      setHourPickerOpen(null);
                    }}
                  >
                    <Text className="text-center text-lg text-neutral-900 dark:text-neutral-50">{formatHour(h)}</Text>
                  </Pressable>
                )}
              />
            </View>
          </Pressable>
        </Modal>

        <View className="flex-row gap-3 mt-6">
          <Button title="Précédent" variant="secondary" onPress={() => router.back()} />
          <Button title="Continuer" onPress={onContinue} disabled={!entries.length} className="flex-1" />
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
