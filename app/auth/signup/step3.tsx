import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Header } from "@/components/shared/Header";
import { SignupStepProgress } from "@/components/signup/SignupStepProgress";
import { NativePicker } from "@/components/ui/NativePicker";
import { Input } from "@/components/ui/Input";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SPORT_LEVELS, SPORT_PRACTICES, SPORTS, WEEKDAYS } from "@/lib/constants";
import type { SportId } from "@/lib/constants";
import { useSignupStore } from "@/stores/signupStore";
import type { SignupSportSelection } from "@/types";
import { signupStep3Schema } from "@/utils/validation";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";
import { useTranslation , t } from "@/hooks/useTranslation";

// Hours available for selection (6 AM → 11 PM)
const HOURS = Array.from({ length: 24 - 6 }, (_, i) => 6 + i);

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;

export default function SignupStep3() {
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const setStep3 = useSignupStore((s) => s.setStep3);
  const storeStep3 = useSignupStore((s) => s.step3);
  const setStep3NoSport = useSignupStore((s) => s.setStep3NoSport);
  const storeStep3NoSport = useSignupStore((s) => s.step3NoSport);
  const initialized = useRef(false);
  const mounted = useRef(false);
  const [entries, setEntries] = useState<SignupSportSelection[]>([]);
  const [noSport, setNoSport] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (storeStep3.length > 0) setEntries(storeStep3);
    setNoSport(storeStep3NoSport);
  }, [storeStep3, storeStep3NoSport]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setStep3(entries);
  }, [entries]);

  const toggleSport = (id: SportId) => {
    setNoSport(false);
    setStep3NoSport(false);
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
          timeSlots: [],
          levelOther: "",
          practiceOther: "",
        },
      ];
    });
  };

  const toggleNoSport = () => {
    const next = !noSport;
    setNoSport(next);
    setStep3NoSport(next);
    if (next) {
      setEntries([]);
    }
  };

  const updateEntry = (id: SportId, patch: Partial<SignupSportSelection>) => {
    setEntries((prev) => prev.map((e) => (e.sportId === id ? { ...e, ...patch } : e)));
  };

  const updateSlot = (sportId: SportId, slotIndex: number, patch: Partial<SignupSportSelection["timeSlots"][number]>) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.sportId !== sportId) return e;
        const slots = [...e.timeSlots];
        slots[slotIndex] = { ...slots[slotIndex], ...patch } as SignupSportSelection["timeSlots"][number];
        return { ...e, timeSlots: slots };
      })
    );
  };

  const addSlot = (sportId: SportId) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.sportId !== sportId) return e;
        return {
          ...e,
          timeSlots: [...e.timeSlots, { weekday: 1, startHour: 8, endHour: 20 }],
        };
      })
    );
  };

  const removeSlot = (sportId: SportId, slotIndex: number) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.sportId !== sportId) return e;
        return { ...e, timeSlots: e.timeSlots.filter((_, i) => i !== slotIndex) };
      })
    );
  };

  const onContinue = () => {
    const parsed = signupStep3Schema.safeParse({
      entries: entries.map((e) => ({
        sportId: e.sportId,
        level: e.level,
        practice: e.practice,
        levelOther: e.levelOther,
        practiceOther: e.practiceOther,
        timeSlots: e.timeSlots,
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

  const canContinue = noSport || entries.length > 0;

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="px-6 py-4 pb-10" keyboardShouldPersistTaps="handled">
          <Header
            title={t("signup.step3.title")}
            showBackButton
            backToLanding
            titleClassName="text-2xl text-neutral-900 dark:text-neutral-50"
            className="mb-2 px-0"
          />
          <SignupStepProgress step={3} />

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
            <Pressable
              onPress={toggleNoSport}
              accessibilityRole="button"
              accessibilityState={{ selected: noSport }}
              className={`px-3 py-2 rounded-full mr-2 mb-2 ${noSport ? "bg-error" : "bg-neutral-200 dark:bg-neutral-800"}`}
            >
              <Text className={noSport ? "text-white font-medium" : "text-neutral-800 dark:text-neutral-100"}>
                {t("signup.step3.noSport")}
              </Text>
            </Pressable>
          </View>

          {entries.map((e) => {
            const id = e.sportId;
            const expanded = !collapsed[id];
            const slotCount = e.timeSlots.length;
            const slotLabel = slotCount > 0 ? ` · ${slotCount} ${t(slotCount > 1 ? "signup.slot.many" : "signup.slot.one")}` : "";
            const summary = `${e.level} · ${e.practice}${slotLabel}`;
            return (
              <View
                key={id}
                className="mt-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden"
              >
                <Pressable onPress={() => toggleCollapsed(id)} className="flex-row items-center px-4 py-3">
                  <Icon
                    name={expanded ? "ChevronDown" : "ChevronRight"}
                    size={20}
                    color="text-secondary"
                  />
                  <View className="flex-1 ml-2">
                    <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                      {t(`signup.sport.${id}`)}
                    </Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">{summary}</Text>
                  </View>
                  <Pressable
                    onPress={() => setEntries((prev) => prev.filter((e) => e.sportId !== id))}
                    hitSlop={8}
                    className="p-1"
                  >
                    <Icon name="X" size={20} color="text-secondary" />
                  </Pressable>
                </Pressable>

                {expanded && (
                  <View className="px-4 pb-4 border-t border-neutral-100 dark:border-neutral-800">
                    {/* Level */}
                    <View className="mt-3">
                      <Text className="text-sm text-neutral-500 mb-1">{t("signup.step3.level")}</Text>
                      <View className="flex-row flex-wrap">
                        {(SPORT_LEVELS[id] ?? []).map((lvl) => (
                          <Pressable
                            key={lvl}
                            onPress={() =>
                              updateEntry(id, {
                                level: lvl,
                                levelOther: lvl === "Autre" ? e.levelOther ?? "" : undefined,
                              })
                            }
                            accessibilityRole="button"
                            accessibilityState={{ selected: e.level === lvl }}
                            className={`px-3 py-2 rounded-lg mr-2 mb-2 ${e.level === lvl ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
                          >
                            <Text
                              className={
                                e.level === lvl
                                  ? "text-white text-xs font-medium"
                                  : "text-xs text-neutral-800 dark:text-neutral-100"
                              }
                            >
                              {lvl}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {e.level === "Autre" && (
                        <Input
                          value={e.levelOther ?? ""}
                          onChangeText={(text: string) => updateEntry(id, { levelOther: text })}
                          placeholder={t("signup.step3.otherDetails")}
                          className="mt-2"
                        />
                      )}
                    </View>

                    {/* Practice */}
                    <View className="mt-4">
                      <Text className="text-sm text-neutral-500 mb-1">{t("signup.step3.practiceType")}</Text>
                      <View className="flex-row flex-wrap">
                        {(SPORT_PRACTICES[id] ?? []).map((p) => (
                          <Pressable
                            key={p}
                            onPress={() =>
                              updateEntry(id, {
                                practice: p,
                                practiceOther: p === "Autre" ? e.practiceOther ?? "" : undefined,
                              })
                            }
                            accessibilityRole="button"
                            accessibilityState={{ selected: e.practice === p }}
                            className={`px-3 py-2 rounded-lg mr-2 mb-2 ${e.practice === p ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
                          >
                            <Text
                              className={
                                e.practice === p
                                  ? "text-white text-xs font-medium"
                                  : "text-xs text-neutral-800 dark:text-neutral-100"
                              }
                            >
                              {p}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {e.practice === "Autre" && (
                        <Input
                          value={e.practiceOther ?? ""}
                          onChangeText={(text: string) => updateEntry(id, { practiceOther: text })}
                          placeholder={t("signup.step3.otherDetails")}
                          className="mt-2"
                        />
                      )}
                    </View>

                    {/* Time slots (optional) */}
                    <View className="mt-4">
                      <Text className="text-sm text-neutral-500 mb-1">
                        {t("signup.step3.availability")} {t("signup.optional")}
                      </Text>
                      {e.timeSlots.map((slot, idx) => (
                        <View
                          key={idx}
                          className="mb-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800"
                        >
                          <View className="flex-row flex-wrap gap-2 mb-2">
                            {WEEKDAY_INDEXES.map((dayIdx) => {
                              const selected = slot.weekday === dayIdx;
                              return (
                                <Pressable
                                  key={dayIdx}
                                  onPress={() => updateSlot(id, idx, { weekday: dayIdx })}
                                  accessibilityRole="button"
                                  accessibilityState={{ selected }}
                                  className={`px-2 py-1 rounded-lg ${
                                    selected
                                      ? "bg-primary"
                                      : "bg-neutral-200 dark:bg-neutral-700"
                                  }`}
                                >
                                  <Text
                                    className={
                                      selected
                                        ? "text-white text-xs font-medium"
                                        : "text-xs text-neutral-800 dark:text-neutral-100"
                                    }
                                  >
                                    {WEEKDAYS[dayIdx].slice(0, 3)}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>

                          <View className="flex-row gap-2 items-center">
                            <View className="flex-1">
                              <NativePicker
                                title={t("signup.step3.hourStartTitle")}
                                confirmLabel={t("common.ok")}
                                cancelLabel={t("common.cancel")}
                                options={HOURS.map((h) => ({ value: h, label: formatHour(h) }))}
                                selectedValue={slot.startHour}
                                onSelect={(h) => updateSlot(id, idx, { startHour: typeof h === "string" ? Number(h) : h })}
                                renderTrigger={(label) => (
                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t("signup.step3.start")}
                                    className="flex-1 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 items-center"
                                  >
                                    <Text className="text-neutral-900 dark:text-neutral-50 font-medium text-sm">
                                      {label}
                                    </Text>
                                    <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                                      {t("signup.step3.start")}
                                    </Text>
                                  </Pressable>
                                )}
                              />
                            </View>
                            <Text className="text-neutral-400 text-sm">→</Text>
                            <View className="flex-1">
                              <NativePicker
                                title={t("signup.step3.hourEndTitle")}
                                confirmLabel={t("common.ok")}
                                cancelLabel={t("common.cancel")}
                                options={HOURS.map((h) => ({ value: h, label: formatHour(h) }))}
                                selectedValue={slot.endHour}
                                onSelect={(h) => updateSlot(id, idx, { endHour: typeof h === "string" ? Number(h) : h })}
                                renderTrigger={(label) => (
                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t("signup.step3.end")}
                                    className="flex-1 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 items-center"
                                  >
                                    <Text className="text-neutral-900 dark:text-neutral-50 font-medium text-sm">
                                      {label}
                                    </Text>
                                    <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                                      {t("signup.step3.end")}
                                    </Text>
                                  </Pressable>
                                )}
                              />
                            </View>
                            <Pressable
                              onPress={() => removeSlot(id, idx)}
                              hitSlop={8}
                              className="p-2"
                            >
                              <Icon name="Trash2" size={20} color="error-500" />
                            </Pressable>
                          </View>
                        </View>
                      ))}

                      {e.timeSlots.length === 0 ? (
                        <Text className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">
                          {t("signup.step3.noSlotsHint")}
                        </Text>
                      ) : null}

                      <Pressable
                        onPress={() => addSlot(id)}
                        className="flex-row items-center gap-1 mt-1"
                      >
                        <Icon name="PlusCircle" size={20} color="primary" />
                        <Text className="text-sm text-primary font-medium">
                          {t("signup.step3.addTimeSlot")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          <View className="flex-row items-center justify-between gap-3 mt-6">
          <Button
  title={t("signup.back")}
  variant="secondary"
  size="lg"
  icon="ChevronLeft"
  onPress={() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }}
/>

            <Button
              title={t("signup.continue")}
              size="lg"
              iconRight="ChevronRight"
              onPress={onContinue}
              disabled={!canContinue}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
