import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Header } from "@/components/shared/Header";
import { SignupStepProgress } from "@/components/signup/SignupStepProgress";
import { NativePicker } from "@/components/ui/NativePicker";
import { SPORT_LEVELS, SPORT_PRACTICES, SPORTS } from "@/lib/constants";
import type { SportId } from "@/lib/constants";
import { useSignupStore } from "@/stores/signupStore";
import type { SignupSportSelection } from "@/types";
import { signupStep3Schema } from "@/utils/validation";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "@/hooks/useTranslation";

// Hours available for selection (6 AM → 11 PM)
const HOURS = Array.from({ length: 18 }, (_, i) => 6 + i);

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;

export default function SignupStep3() {
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
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

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <Header
        title={t("signup.step3.title")}
        showBackButton
        backToLanding
        titleClassName="text-2xl text-neutral-900 dark:text-neutral-50"
        className="px-4 pt-2 pb-3 mb-0"
      />
      <SignupStepProgress step={3} />
      <ScrollView contentContainerClassName="px-6 py-4 pb-10">
        <Text className="text-base text-neutral-700 dark:text-neutral-200 mb-3">
          {t("signup.step3.practiced")}
        </Text>
        <View className="flex-row flex-wrap">
          {SPORTS.map((s) => {
            const on = entries.some((e) => e.sportId === s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => toggleSport(s.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={`px-3 py-2 rounded-full mr-2 mb-2 ${on ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"}`}
              >
                <Text className={on ? "text-white font-medium" : "text-neutral-800 dark:text-neutral-100"}>
                  {t(`signup.sport.${s.id}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {entries.map((e) => (
          <View key={e.sportId} className="mt-4 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
            <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
              {t(`signup.sport.${e.sportId}`)}
            </Text>

            <Text className="text-sm text-neutral-500 mb-1">{t("signup.step3.level")}</Text>
            <View className="flex-row flex-wrap mb-2">
              {(SPORT_LEVELS[e.sportId as SportId] ?? []).map((lvl) => (
                <Pressable
                  key={lvl}
                  onPress={() => updateEntry(e.sportId as SportId, { level: lvl })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: e.level === lvl }}
                  className={`px-2 py-1 rounded-lg mr-2 mb-2 ${e.level === lvl ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
                >
                  <Text className={e.level === lvl ? "text-white text-xs" : "text-xs text-neutral-800 dark:text-neutral-100"}>{lvl}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-sm text-neutral-500 mb-1">{t("signup.step3.practiceType")}</Text>
            <View className="flex-row flex-wrap mb-2">
              {(SPORT_PRACTICES[e.sportId as SportId] ?? []).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => updateEntry(e.sportId as SportId, { practice: p })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: e.practice === p }}
                  className={`px-2 py-1 rounded-lg mr-2 mb-2 ${e.practice === p ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
                >
                  <Text className={e.practice === p ? "text-white text-xs" : "text-xs text-neutral-800 dark:text-neutral-100"}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-sm text-neutral-500 mb-1">{t("signup.step3.days")}</Text>
            <View className="flex-row flex-wrap mb-2">
              {WEEKDAY_INDEXES.map((idx) => {
                const selected = e.weekdays.includes(idx);
                const label = t(`signup.weekday.${idx}` as const).slice(0, 3);
                return (
                  <Pressable
                    key={idx}
                    onPress={() =>
                      updateEntry(e.sportId as SportId, {
                        weekdays: selected ? e.weekdays.filter((x) => x !== idx) : [...e.weekdays, idx].sort(),
                      })
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={`px-2 py-1 rounded-lg mr-2 mb-2 ${selected ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
                  >
                    <Text className={selected ? "text-white text-xs" : "text-xs text-neutral-800 dark:text-neutral-100"}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="text-sm text-neutral-500 mb-1">{t("signup.step3.availability")}</Text>
            <Text className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">
              {t("signup.step3.availabilityHelper")}
            </Text>
            <View className="flex-row gap-2 mb-2">
              <Pressable
                onPress={() => setHourPickerOpen({ sportId: e.sportId as SportId, field: "startHour" })}
                accessibilityRole="button"
                className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 flex-1 items-center active:opacity-70"
              >
                <Text className="text-neutral-900 dark:text-neutral-50 font-medium">{formatHour(e.startHour)}</Text>
                <Text className="text-xs text-neutral-400 dark:text-neutral-500">{t("signup.step3.start")}</Text>
              </Pressable>
              <Pressable
                onPress={() => setHourPickerOpen({ sportId: e.sportId as SportId, field: "endHour" })}
                accessibilityRole="button"
                className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 flex-1 items-center"
              >
                <Text className="text-neutral-900 dark:text-neutral-50 font-medium">{formatHour(e.endHour)}</Text>
                <Text className="text-xs text-neutral-400 dark:text-neutral-500">{t("signup.step3.end")}</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <NativePicker
          visible={!!hourPickerOpen}
          title={
            hourPickerOpen?.field === "startHour"
              ? t("signup.step3.hourStartTitle")
              : t("signup.step3.hourEndTitle")
          }
          confirmLabel="OK"
          options={HOURS.map((h) => ({ value: h, label: formatHour(h) }))}
          selectedValue={
            hourPickerOpen ? entries.find((p) => p.sportId === hourPickerOpen.sportId)?.[hourPickerOpen.field] ?? 8 : 8
          }
          onSelect={(h) => {
            if (hourPickerOpen) {
              updateEntry(hourPickerOpen.sportId, { [hourPickerOpen.field]: h });
            }
            setHourPickerOpen(null);
          }}
          onClose={() => setHourPickerOpen(null)}
        />

        <View className="flex-row gap-3 mt-6">
          <Button title={t("signup.back")} variant="secondary" onPress={() => router.back()} />
          <Button title={t("signup.continue")} onPress={onContinue} disabled={!entries.length} className="flex-1" />
        </View>
      </ScrollView>
    </SafeScreen>
  );
}