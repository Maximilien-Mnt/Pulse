import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SPORTS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { eventPrivateSchema } from "@/utils/validation";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeScreen } from "@/components/shared/SafeScreen";
import Toast from "react-native-toast-message";
import { useMutation, useQuery } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useKeyboardHeight } from "@/lib/keyboardUtils";
import { BackButton } from "@/components/ui/BackButton";
import { t } from "@/hooks/useTranslation";

export default function CreatePrivateEventScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const keyboardHeight = useKeyboardHeight();

  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [endDateError, setEndDateError] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [invitees, setInvitees] = useState<string[]>([]);
  const [searchHits, setSearchHits] = useState<
    { id: string; username: string; full_name: string; avatar_url: string | null }[]
  >([]);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).single();
      return data;
    },
  });

  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .ilike("username", `%${q}%`)
      .neq("id", userId!)
      .limit(10);
    setSearchHits(data ?? []);
  }, [userId]);

  const toggleInvitee = (userId: string) => {
    setInvitees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectedUsers = useMemo(() => {
    return searchHits.filter((u) => invitees.includes(u.id));
  }, [searchHits, invitees]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");

      const data = {
        name,
        sport,
        description,
        venue,
        start_date: startDate.toISOString(),
        end_date: endDate?.toISOString(),
        invitees,
      };

      const validation = eventPrivateSchema.safeParse(data);
      if (!validation.success) {
        throw new Error(validation.error.errors[0]?.message ?? "Validation error");
      }

      // Create event
      const { data: event, error: eventErr } = await supabase
        .from("events")
        .insert({
          name: name.trim(),
          sport,
          description: description.trim() || '',
          venue_address: venue || null,
          start_date: startDate.toISOString(),
          end_date: endDate?.toISOString() || null,
          is_private: true,
          country: profile?.country ?? "",
          city: profile?.city ?? "",
          created_by: userId,
        } as any)
        .select("id")
        .single();

      if (eventErr || !event) throw eventErr ?? new Error("event creation failed");

      // Add creator as participant
      const { error: participantErr } = await supabase.from("event_participants").insert({
        event_id: event.id,
        user_id: userId,
        status: "confirmed",
      });
      if (participantErr) throw participantErr;

      // Send invitations (via SECURITY DEFINER RPC to bypass notifications RLS)
      for (const inviteeId of invitees) {
        await supabase.rpc("notify_user", {
          p_user_id: inviteeId,
          p_type: "event_invitation",
          p_title: t("events.create.invitation"),
          p_body: t("events.inviteBody", { name: profile?.full_name ?? "Someone", event: name }),
          p_data: { event_id: event.id, inviter_id: userId },
        });
      }

      return event.id;
    },
    onSuccess: (eventId) => {
      Toast.show({ type: "success", text1: t("create.event.privateSuccess") });
      router.replace(`/(tabs)/events/${eventId}`);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? "Erreur inconnue";
      Toast.show({ type: "error", text1: message });
    },
  });

  const isValid = name.trim().length > 0 && sport.length > 0;

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton />
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          Événement privé
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card className="p-4 mb-4">
          <Text className="text-sm text-neutral-500 mb-4">
            Crée un événement privé pour inviter tes amis.
          </Text>

          <Input
            label="Nom de l'événement *"
            value={name}
            onChangeText={setName}
            placeholder={t("create.event.example")}
          />

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 mt-4">
            Sport *
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {SPORTS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSport(s.id)}
                className={`px-4 py-2 rounded-full mr-2 ${
                  sport === s.id ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                <Text
                  className={sport === s.id ? "text-white font-medium" : "text-neutral-700 dark:text-neutral-200"}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 mt-4">
            Date de début *
          </Text>
          <Pressable
            onPress={() => setShowStartPicker(true)}
            className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 mb-4"
          >
            <Text className="text-neutral-900 dark:text-neutral-50">
              {startDate.toLocaleDateString("fr-FR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </Pressable>
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="datetime"
              onChange={(_, date) => {
                setShowStartPicker(false);
                if (date) {
                  setStartDate(date);
                  if (endDate && date >= endDate) {
                    setEndDate(null);
                    setEndDateError(t("events.endAfterStart"));
                  }
                }
              }}
            />
          )}

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Date de fin (optionnel)
          </Text>
          <Pressable
            onPress={() => setShowEndPicker(true)}
            className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 mb-4"
          >
            <Text className="text-neutral-900 dark:text-neutral-50">
              {endDate
                ? endDate.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : t("updateEvent.dateLabel")}
            </Text>
          </Pressable>
          {showEndPicker && (
            <DateTimePicker
              value={endDate ?? new Date()}
              mode="datetime"
              onChange={(_, date) => {
                setShowEndPicker(false);
                if (date) {
                  if (date <= startDate) {
                    setEndDateError(t("events.endAfterStart"));
                  } else {
                    setEndDateError("");
                    setEndDate(date);
                  }
                }
              }}
            />
          )}
          {endDateError ? (
            <Text className="text-error text-sm mb-4">{endDateError}</Text>
          ) : null}

          <Input
            label="Lieu"
            value={venue}
            onChangeText={setVenue}
            placeholder="Adresse ou nom du lieu..."
          />

          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Description optionnelle..."
          />
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-3">Inviter des participants</Text>
          <Input
            label="Rechercher par @username"
            value={searchQ}
            onChangeText={(t) => {
              setSearchQ(t);
              void searchUsers(t);
            }}
            autoCapitalize="none"
            placeholder="@username"
          />

          {searchHits.length > 0 && (
            <View className="mt-2 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
              {searchHits.map((user, index) => (
                <Pressable
                  key={user.id}
                  onPress={() => toggleInvitee(user.id)}
                  className={`flex-row items-center p-4 active:bg-primary/5 ${index < searchHits.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''}`}
                >
                  <Avatar uri={user.avatar_url} size={40} />
                  <View className="ml-3 flex-1">
                    <Text className="font-medium text-neutral-900 dark:text-neutral-50">
                      {user.full_name}
                    </Text>
                    <Text className="text-sm text-neutral-500">@{user.username}</Text>
                  </View>
                  {invitees.includes(user.id) && (
                    <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {invitees.length > 0 && (
            <View className="mt-3">
              <Text className="text-sm text-neutral-500 mb-2">
                {t("create.event.invitedCount", { count: invitees.length })}
              </Text>
              <View className="flex-row flex-wrap">
                {selectedUsers.map((u) => (
                  <View
                    key={u.id}
                    className="flex-row items-center bg-primary/10 px-2 py-1 rounded-full mr-2 mb-2"
                  >
                    <Avatar uri={u.avatar_url} size={20} />
                    <Text className="ml-1 text-sm text-primary">@{u.username}</Text>
                    <Pressable onPress={() => toggleInvitee(u.id)} className="ml-1">
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        <Button
          title={t("create.event.submit")}
          onPress={() => createMut.mutate()}
          loading={createMut.isPending}
          disabled={!isValid}
          className="mt-4"
        />
      </ScrollView>
    </SafeScreen>
  );
}