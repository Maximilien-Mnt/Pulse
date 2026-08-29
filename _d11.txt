import { useEffect, useMemo, useRef, useState } from "react";
import {
  findNodeHandle,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { BackButton } from "@/components/ui/BackButton";
import { NativePicker } from "@/components/ui/NativePicker";
import { Ionicons } from "@expo/vector-icons";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { uploadImageToStorage } from "@/lib/imageUpload";
import { OBJECTIVES, SPORTS, COUNTRIES, WEEKDAYS, SPORT_LEVELS, SPORT_PRACTICES } from "@/lib/constants";
import { useKeyboardHeight } from "@/lib/keyboardUtils";
import { getCountryDisplay } from "@/utils/countries";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/hooks/useTranslation";

// Hours available for selection (6 AM -> 11 PM)
const HOURS = Array.from({ length: 24 - 6 }, (_, i) => 6 + i);

const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;

async function uploadAvatar(uri: string, userId: string): Promise<string> {
  return uploadImageToStorage({
    bucket: "avatars",
    path: `${userId}/avatar.jpg`,
    uri,
    upsert: true,
    cacheBust: true,
  });
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-2">
      <Text className="text-xs text-neutral-500 dark:text-neutral-400">{label}</Text>
      <View className="h-12 justify-center rounded-sm border-[1.5px] border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-4">
        <Text className="text-base text-neutral-900 dark:text-neutral-50">{value}</Text>
      </View>
    </View>
  );
}

function SportPill({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {SPORTS.map((s) => {
        const active = selected.includes(s.id);
        return (
          <Pressable
            key={s.id}
            onPress={() => onToggle(s.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`px-4 py-2 rounded-full ${
              active ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          >
            <Text
              className={`${
                active
                  ? "text-white font-medium"
                  : "text-neutral-700 dark:text-neutral-200"
              }`}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function PickerField({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!open ? (
        <Pressable
          onPress={() => setOpen(true)}
          className="h-10 justify-center rounded-sm border-[1.5px] border-border bg-surface dark:bg-surface-dark px-3 flex-row items-center justify-between"
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Text
            className={`text-sm ${
              value ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-400"
            }`}
          >
            {value || `Sélectionner ${label.toLowerCase()}`}
          </Text>
          <Text className="text-tertiary text-lg leading-none">›</Text>
        </Pressable>
      ) : (
        <NativePicker
          visible={open}
          title={label}
          options={options}
          selectedValue={value}
          onSelect={(v) => {
            onSelect(v);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const userId = useAuthStore((s) => s.userId);
  const { t } = useTranslation();
  const { data: profile } = useProfile(userId);
  const { focusSection } = useLocalSearchParams<{ focusSection?: string }>();
  const keyboardHeight = useKeyboardHeight();

  const scrollViewRef = useRef<ScrollView>(null);
  const objectivesRef = useRef<View>(null);
  const practicedRef = useRef<View>(null);
  const interestedRef = useRef<View>(null);

  useEffect(() => {
    if (!focusSection) return;

    const targetRef =
      focusSection === "objectives"
        ? objectivesRef
        : focusSection === "practiced"
          ? practicedRef
          : focusSection === "interested"
            ? interestedRef
            : null;

    if (!targetRef?.current) return;

    const timer = setTimeout(() => {
      if (Platform.OS === "web") {
        const el = targetRef.current as unknown as HTMLElement;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        const node = findNodeHandle(targetRef.current);
        if (!node) return;
        const measureRN: any = require("react-native").measure;
        measureRN(
          node,
          (_x: number, _y: number, _w: number, _h: number, pageX: number, pageY: number) => {
            scrollViewRef.current?.scrollTo({ y: pageY - 12, animated: true });
          }
        );
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [focusSection]);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [practicedSports, setPracticedSports] = useState<string[]>([]);
  const [interestedSports, setInterestedSports] = useState<string[]>([]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [practicedSportDetails, setPracticedSportDetails] = useState<Record<string, {
    level: string;
    practice: string;
    timeSlots: { weekday: number; startHour: number; endHour: number }[];
  }>>({});

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name ?? "");
    setBio(profile.bio ?? "");
    setCity(profile.city ?? "");
    setCountry(profile.country ?? null);
    setHeight(profile.height_cm ? String(profile.height_cm) : "");
    setWeight(profile.weight_kg ? String(profile.weight_kg) : "");
    setAvatarUri(null);
    setInterestedSports((profile.interested_sports as string[]) ?? []);
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;
    void (supabase as any)
      .from("user_sports")
      .select("sport_id, category, level, practice, time_slots")
      .eq("user_id", profile.id)
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) return;
        const rows = data as {
          sport_id: string;
          category: string;
          level?: string | null;
          practice?: string | null;
          time_slots?: any;
        }[];
        const practiced: string[] = [];
        const interested: string[] = [];
        const details: Record<string, {
          level: string;
          practice: string;
          timeSlots: { weekday: number; startHour: number; endHour: number }[];
        }> = {};
        for (const row of rows) {
          if (row.category === "practiced") {
            practiced.push(row.sport_id);
            details[row.sport_id] = {
              level: row.level ?? "",
              practice: row.practice ?? "",
              timeSlots: Array.isArray(row.time_slots)
                ? row.time_slots
                : [],
            };
          } else if (row.category === "interested") {
            interested.push(row.sport_id);
          }
        }
        setPracticedSports(practiced);
        setInterestedSports(interested);
        setPracticedSportDetails(details);
      });
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    void supabase
      .from("user_objectives")
      .select("objective")
      .eq("user_id", profile.id)
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) return;
        const rows = data as { objective: string }[];
        setSelectedObjectives(rows.map((o) => o.objective));
      });
  }, [profile?.id]);

  const togglePracticed = (id: string) => {
    setPracticedSports((prev) => {
      const isSelected = prev.includes(id);
      const next = isSelected ? prev.filter((s) => s !== id) : [...prev, id];
      if (!isSelected) {
        setPracticedSportDetails((d) => {
          const nextDetails: typeof d = { ...d };
          nextDetails[id] = { level: "", practice: "", timeSlots: [] };
          return nextDetails;
        });
      } else {
        setPracticedSportDetails((d) => {
          const nextDetails: typeof d = { ...d };
          delete nextDetails[id];
          return nextDetails;
        });
      }
      return next;
    });
  };

  const toggleInterested = (id: string) =>
    setInterestedSports((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const toggleObjective = (obj: string) =>
    setSelectedObjectives((prev) =>
      prev.includes(obj) ? prev.filter((o) => o !== obj) : [...prev, obj]
    );

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets[0]) setAvatarUri(res.assets[0].uri);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!profile || !profile.id) return;
      if (!name.trim()) throw new Error("Le nom est requis");
      let avatarUrl = profile.avatar_url;
      if (avatarUri) {
        avatarUrl = await uploadAvatar(avatarUri, profile.id);
      }

      const patch: any = {
        full_name: name.trim(),
        bio: bio.trim() || null,
        city: city.trim() || null,
        country: (country ?? "").trim() || null,
        height_cm: height ? parseInt(height, 10) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        avatar_url: avatarUrl,
        interested_sports: [...new Set(interestedSports)],
        language: "fr" as const,
      };

      const { error: profileErr } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", profile.id);
      if (profileErr) throw profileErr;

      await syncSports(profile.id);
      await syncObjectives(profile.id);
    },
    onSuccess: () => {
      posthog.capture("profile_updated_v3");
      void queryClient.invalidateQueries({ queryKey: ["profile", profile?.id] });
      void queryClient.invalidateQueries({ queryKey: ["public-profile", profile?.id] });
      void queryClient.invalidateQueries({ queryKey: ["user-sports"] });
      void queryClient.invalidateQueries({ queryKey: ["my-objectives"] });
      Toast.show({ type: "success", text1: "Profil mis à jour" });
      router.back();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Erreur de sauvegarde";
      Toast.show({ type: "error", text1: message });
    },
  });
  async function syncSports(userId: string) {
    const { error: delErr } = await (supabase as any)
      .from("user_sports")
      .delete()
      .eq("user_id", userId);
    if (delErr) throw delErr;

    const toInsert: any[] = [
      ...practicedSports.map((sport) => ({
        user_id: userId,
        sport_id: sport,
        category: "practiced" as const,
        level: practicedSportDetails[sport]?.level ?? "",
        practice: practicedSportDetails[sport]?.practice ?? "",
        time_slots: practicedSportDetails[sport]?.timeSlots ?? [],
      })),
      ...interestedSports.map((sport) => ({
        user_id: userId,
        sport_id: sport,
        category: "interested" as const,
        level: "",
        practice: "",
        time_slots: [],
      })),
    ];

    if (toInsert.length) {
      const { error } = await (supabase as any).from("user_sports").insert(toInsert);
      if (error) throw error;
    }
  }

  async function syncObjectives(userId: string) {
    const { data: existing, error: loadErr } = await supabase
      .from("user_objectives")
      .select("objective")
      .eq("user_id", userId);
    if (loadErr) throw loadErr;
    const current = (existing ?? []).map((o) => o.objective);
    const toRemove = current.filter((o) => !selectedObjectives.includes(o));
    const toAdd = selectedObjectives.filter((o) => !current.includes(o));
    if (toRemove.length) {
      const { error } = await supabase
        .from("user_objectives")
        .delete()
        .eq("user_id", userId)
        .in("objective", toRemove);
      if (error) throw error;
    }
    if (toAdd.length) {
      const { error } = await supabase.from("user_objectives").insert(
        toAdd.map((o) => ({ user_id: userId, objective: o }))
      );
      if (error) throw error;
    }
  }
  const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;
  const [hourPickerOpen, setHourPickerOpen] = useState<{
    sportId: string;
    field: "startHour" | "endHour";
    slotIndex: number;
  } | null>(null);

  const updateSlot = (sportId: string, slotIndex: number, patch: Partial<{ weekday: number; startHour: number; endHour: number }>) => {
    setPracticedSportDetails((prev) => {
      const sport = prev[sportId];
      if (!sport) return prev;
      const next: typeof prev = { ...prev };
      const slots = [...sport.timeSlots];
      slots[slotIndex] = { ...slots[slotIndex], ...patch } as { weekday: number; startHour: number; endHour: number };
      next[sportId] = { ...sport, timeSlots: slots };
      return next;
    });
  };

  const addSlot = (sportId: string) => {
    setPracticedSportDetails((prev) => {
      const sport = prev[sportId];
      if (!sport) return prev;
      const next: typeof prev = { ...prev };
      next[sportId] = { ...sport, timeSlots: [...sport.timeSlots, { weekday: 1, startHour: 8, endHour: 20 }] };
      return next;
    });
  };

  const removeSlot = (sportId: string, slotIndex: number) => {
    setPracticedSportDetails((prev) => {
      const sport = prev[sportId];
      if (!sport) return prev;
      const next: typeof prev = { ...prev };
      next[sportId] = { ...sport, timeSlots: sport.timeSlots.filter((_, i) => i !== slotIndex) };
      return next;
    });
  };

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton />
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          Modifier le profil
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerClassName="p-4"
        contentContainerStyle={{
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">
            Photo de profil
          </Text>
          <Pressable
            onPress={pickImage}
            className="items-center py-2 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Changer la photo de profil"
          >
            <Avatar
              uri={avatarUri ?? profile?.avatar_url ?? null}
              size={96}
              className="border-2 border-primary"
            />
            <Text className="text-primary text-sm font-medium mt-2">
              Changer la photo
            </Text>
          </Pressable>
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">
            Informations
          </Text>
          <View className="gap-4">
            <Input
              label="Nom"
              value={name}
              onChangeText={setName}
              placeholder="Ton nom"
              returnKeyType="next"
            />
            <ReadOnlyField
              label="Pseudo"
              value={profile?.username ? `@${profile.username}` : ""}
            />
            <ReadOnlyField
              label="Date de naissance"
              value={
                profile?.birth_date
                  ? dayjs(profile.birth_date).format("DD/MM/YYYY")
                  : "Non renseignée"
              }
            />
            <Text className="text-xs text-neutral-400 dark:text-neutral-500 -mt-2">
              Le pseudo et la date de naissance ne sont pas modifiables.
            </Text>

            <View className="gap-2">
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                Pays
              </Text>
              {!countryOpen ? (
                <Pressable
                  onPress={() => setCountryOpen(true)}
                  accessibilityRole="button"
                  className="h-12 justify-center rounded-sm border-[1.5px] border-border bg-surface dark:bg-surface-dark px-4 flex-row items-center justify-between active:opacity-70"
                >
                  <Text className="text-base text-neutral-900 dark:text-neutral-50">
                    {country ? getCountryDisplay(country) : "Sélectionner un pays"}
                  </Text>
                  <Text className="text-tertiary text-lg leading-none">›</Text>
                </Pressable>
              ) : (
                <NativePicker
                  visible={countryOpen}
                  title="Pays"
                  confirmLabel="OK"
                  options={COUNTRIES.map((c) => ({
                    value: c.code,
                    label: (getCountryDisplay(c.code) ?? "") as string,
                  }))}
                  selectedValue={country ?? "FR"}
                  onSelect={(v) => {
                    setCountry(v || null);
                    setCountryOpen(false);
                  }}
                  onClose={() => setCountryOpen(false)}
                />
              )}
            </View>

            <Input
              label="Ville"
              value={city}
              onChangeText={setCity}
              placeholder="Ex. Paris"
              returnKeyType="next"
            />
            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              multiline
              placeholder="Présente-toi brièvement..."
              returnKeyType="done"
            />
          </View>
        </Card>
        <Card className="p-4 mb-4">
          <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">
            Morphologie
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Taille (cm)"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                returnKeyType="next"
                placeholder="180"
              />
            </View>
            <View className="flex-1">
              <Input
                label="Poids (kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                returnKeyType="done"
                placeholder="75"
              />
            </View>
          </View>
        </Card>

        <View ref={objectivesRef}>
          <Card className="p-4 mb-4">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Objectifs</Text>
            <View className="flex-row flex-wrap gap-2">
              {OBJECTIVES.map((obj) => {
              const active = selectedObjectives.includes(obj);
              return (
                <Pressable
                  key={obj}
                  onPress={() => toggleObjective(obj)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`px-3 py-2 rounded-xl border ${
                    active
                      ? "bg-primary border-primary"
                      : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  <Text
                    className={
                      active
                        ? "text-white font-medium"
                        : "text-neutral-800 dark:text-neutral-100"
                    }
                  >
                    {obj}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
        </View>

        <View ref={practicedRef}>
          <Card className="p-4 mb-4">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Sports pratiqués
            </Text>
            <SportPill selected={practicedSports} onToggle={togglePracticed} />
            {practicedSports.length > 0 && (
              <View className="mt-4 gap-3">
                {practicedSports.map((sid) => {
                  const sportDef = SPORTS.find((x) => x.id === sid);
                  const details = practicedSportDetails[sid] || {
                    level: "",
                    practice: "",
                    timeSlots: [],
                  };
                  return (
                    <View
                      key={sid}
                      className="border-t border-border dark:border-border-dark pt-3 first:border-t-0 first:pt-0"
                    >
                      <View className="flex-row items-center gap-2 mb-3">
                        <View
                          className="w-7 h-7 rounded-full items-center justify-center"
                          style={{
                            backgroundColor: `${sportDef?.color ?? "#3358FF"}20`,
                          }}
                        >
                          <Ionicons
                            name={(sportDef?.icon ?? "help-outline") as any}
                            size={15}
                            color={sportDef?.color ?? "#3358FF"}
                          />
                        </View>
                        <Text className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                          {sportDef?.label ?? sid}
                        </Text>
                      </View>

                      {/* Level */}
                      <View className="mb-3">
                        <Text className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                          Niveau
                        </Text>
                        <View className="flex-row flex-wrap">
                          {(SPORT_LEVELS[sid as keyof typeof SPORT_LEVELS] || []).map((lvl) => {
                            const active = details.level === lvl;
                            return (
                              <Pressable
                                key={lvl}
                                onPress={() => {
                                  setPracticedSportDetails((d) => {
                                    const next: typeof d = { ...d };
                                    next[sid] = { ...(next[sid] || { level: "", practice: "", timeSlots: [] }), level: lvl };
                                    return next;
                                  });
                                }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                                className={`px-3 py-2 rounded-lg mr-2 mb-2 ${active ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
                              >
                                <Text
                                  className={
                                    active
                                      ? "text-white text-xs font-medium"
                                      : "text-xs text-neutral-800 dark:text-neutral-100"
                                  }
                                >
                                  {lvl}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>

                      {/* Practice */}
                      <View className="mb-3">
                        <Text className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                          Type de pratique
                        </Text>
                        <View className="flex-row flex-wrap">
                          {(SPORT_PRACTICES[sid as keyof typeof SPORT_PRACTICES] || []).map((pr) => {
                            const active = details.practice === pr;
                            return (
                              <Pressable
                                key={pr}
                                onPress={() => {
                                  setPracticedSportDetails((d) => {
                                    const next: typeof d = { ...d };
                                    next[sid] = { ...(next[sid] || { level: "", practice: "", timeSlots: [] }), practice: pr };
                                    return next;
                                  });
                                }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                                className={`px-3 py-2 rounded-lg mr-2 mb-2 ${active ? "bg-primary" : "bg-neutral-100 dark:bg-neutral-800"}`}
                              >
                                <Text
                                  className={
                                    active
                                      ? "text-white text-xs font-medium"
                                      : "text-xs text-neutral-800 dark:text-neutral-100"
                                  }
                                >
                                  {pr}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>

                      {/* Time slots */}
                      <View className="mt-4">
                        <Text className="text-sm text-neutral-500 mb-1">Créneaux horaires</Text>
                        {(details.timeSlots || []).map((slot, idx) => (
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
                                    onPress={() => updateSlot(sid, idx, { weekday: dayIdx })}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected }}
                                    className={`px-2 py-1 rounded-lg ${selected ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-700"}`}
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
                              <Pressable
                                onPress={() =>
                                  setHourPickerOpen({
                                    sportId: sid,
                                    field: "startHour",
                                    slotIndex: idx,
                                  })
                                }
                                accessibilityRole="button"
                                className="flex-1 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 items-center active:opacity-70"
                              >
                                <Text className="text-neutral-900 dark:text-neutral-50 font-medium text-sm">
                                  {formatHour(slot.startHour)}
                                </Text>
                                <Text className="text-xs text-neutral-400 dark:text-neutral-500">Début</Text>
                              </Pressable>
                              <Text className="text-neutral-400 text-sm">→</Text>
                              <Pressable
                                onPress={() =>
                                  setHourPickerOpen({
                                    sportId: sid,
                                    field: "endHour",
                                    slotIndex: idx,
                                  })
                                }
                                accessibilityRole="button"
                                className="flex-1 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 items-center active:opacity-70"
                              >
                                <Text className="text-neutral-900 dark:text-neutral-50 font-medium text-sm">
                                  {formatHour(slot.endHour)}
                                </Text>
                                <Text className="text-xs text-neutral-400 dark:text-neutral-500">Fin</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => removeSlot(sid, idx)}
                                hitSlop={8}
                                className="p-2"
                              >
                                <Icon name="Trash2" size={20} color="error-500" />
                              </Pressable>
                            </View>
                          </View>
                        ))}

                        <Pressable
                          onPress={() => addSlot(sid)}
                          className="flex-row items-center gap-1 mt-1"
                        >
                          <Icon name="PlusCircle" size={20} color="primary" />
                          <Text className="text-sm text-primary font-medium">
                            Ajouter un créneau
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </View>

        <View ref={interestedRef}>
          <Card className="p-4 mb-4">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Sports qui m'intéressent
            </Text>
            <SportPill selected={interestedSports} onToggle={toggleInterested} />
          </Card>
        </View>

        <Button
          title={t("editProfile.save")}
          onPress={() => saveMut.mutate()}
          loading={saveMut.isPending}
          className="w-full"
        />
        <View className="h-4" />
      </ScrollView>

          <NativePicker
            visible={!!hourPickerOpen}
            title={
              hourPickerOpen?.field === "startHour"
                ? "Heure de début"
                : "Heure de fin"
            }
            confirmLabel="OK"
            options={HOURS.map((h) => ({ value: h, label: formatHour(h) }))}
            selectedValue={
              hourPickerOpen
                ? (details => details.timeSlots[hourPickerOpen.slotIndex]?.[hourPickerOpen.field] ?? 8)(practicedSportDetails[hourPickerOpen.sportId] || { timeSlots: [{ startHour: 8, endHour: 20 }] })
                : 8
            }
            onSelect={(h) => {
              if (hourPickerOpen) {
                const numericHour = typeof h === 'string' ? Number(h) : h;
                updateSlot(hourPickerOpen.sportId, hourPickerOpen.slotIndex, {
                  [hourPickerOpen.field]: numericHour,
                });
              }
              setHourPickerOpen(null);
            }}
            onClose={() => setHourPickerOpen(null)}
          />
    </SafeScreen>
  );
}
