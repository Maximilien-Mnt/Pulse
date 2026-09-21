import { Avatar } from "@/components/ui/Avatar";
import { EventHostingSelector, type EventHosting } from "@/components/events/EventHostingSelector";
import { EventIdentitySelector } from "@/components/events/EventIdentitySelector";
import { EventSectionTitle, SportPicker } from "@/components/events/EventFormSections";
import { PhotosPicker } from "@/components/events/EventFormPickers";
import { useEventPublishingIdentity } from "@/hooks/useEventPublishingIdentity";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { eventPrivateSchema } from "@/utils/validation";
import { normalizeLink } from "@/utils/links";
import { localizeError } from "@/utils/localizeError";
import { Icon } from "@/components/ui/Icon";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadImageToStorage } from "@/lib/imageUpload";
import { SafeScreen } from "@/components/shared/SafeScreen";
import Toast from "react-native-toast-message";
import { useMutation, useQuery } from "@tanstack/react-query";
import { NativeDateField } from "@/components/ui/NativeDateField";
import { useKeyboardHeight } from "@/lib/keyboardUtils";
import { BackButton } from "@/components/ui/BackButton";
import { t } from "@/hooks/useTranslation";

function formatEventDateTime(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CreatePrivateEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clubId?: string }>();
  const initialClubId = Array.isArray(params.clubId) ? params.clubId[0] : params.clubId;
  const userId = useAuthStore((s) => s.userId);
  const keyboardHeight = useKeyboardHeight();
  const identity = useEventPublishingIdentity(userId, initialClubId);

  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endDateError, setEndDateError] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [hosting, setHosting] = useState<EventHosting>("in_app");
  const [externalLink, setExternalLink] = useState("");
  const [linkError, setLinkError] = useState<string | undefined>(undefined);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [placesTotal, setPlacesTotal] = useState("");
  const [heroUris, setHeroUris] = useState<string[]>([]);
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

  const pickHeroPhotos = useCallback(async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 0.8, selectionLimit: 5 - heroUris.length });
    if (!res.canceled) setHeroUris((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, 5));
  }, [heroUris.length]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      if (!identity.isValid) throw new Error(t("create.event.identityError"));

      const data = {
        name,
        sport,
        description,
        venue,
        start_date: startDate.toISOString(),
        end_date: endDate?.toISOString(),
        invitees,
        hosting,
        registration_url: hosting === "external" ? normalizeLink(externalLink) : "",
        places_total: placesTotal.trim() ? Number(placesTotal) : undefined,
        hero_urls: [] as string[],
      };

      const validation = eventPrivateSchema.safeParse(data);
      if (!validation.success) {
        const first = validation.error.errors[0];
        if (first?.path[0] === "registration_url") setLinkError(localizeError(first.message) ?? first.message);
        throw new Error(localizeError(first?.message) ?? "Validation error");
      }
      setLinkError(undefined);
      const isExternal = hosting === "external";
      const placesNum = placesTotal.trim() ? Math.max(1, Math.floor(Number(placesTotal))) : null;

      // Upload photos first (0-5, optional)
      const heroUrls: string[] = [];
      for (let i = 0; i < heroUris.length; i += 1) {
        const localUri = heroUris[i];
        if (!localUri) continue;
        // eslint-disable-next-line no-await-in-loop
        const url = await uploadImageToStorage({ bucket: "events", path: `${userId}/${Date.now()}-private-${i}.jpg`, uri: localUri, upsert: true, role: "gallery" });
        if (url) heroUrls.push(url);
      }

      // Create event
      const { data: event, error: eventErr } = await supabase
        .from("events")
        .insert({
          name: name.trim(),
          sport,
          description: description.trim() || '',
          venue_address: venue || null,
          registration_url: isExternal ? normalizeLink(externalLink) : null,
          is_external: isExternal,
          start_date: startDate.toISOString(),
          end_date: endDate?.toISOString() || null,
          is_private: true,
          country: profile?.country ?? "",
          city: profile?.city ?? "",
          hero_urls: heroUrls,
          places_total: placesNum,
          places_left: placesNum,
          created_by: userId,
          club_id: identity.publisherClubId,
          publisher_club_id: identity.publisherClubId,
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
          p_body: t("events.inviteBody", { name: identity.selectedClub?.name ?? profile?.full_name ?? "Someone", event: name }),
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
      const message =
        err instanceof Error ? err.message : (err as { message?: string })?.message ?? t("common.unknownError");
      Toast.show({ type: "error", text1: message });
    },
  });

  const isValid =
    identity.isValid &&
    !!profile &&
    name.trim().length > 0 &&
    sport.length > 0 &&
    (hosting === "in_app" || externalLink.trim().length > 0);
  const missing: string[] = [];
  if (!name.trim()) missing.push(t("create.event.name"));
  if (!sport) missing.push(t("create.event.sport"));
  if (hosting === "external" && !externalLink.trim()) missing.push(t("create.event.externalLink"));

  return (
    <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <BackButton />
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          {t("create.event.privateTitle")}
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 100 : 100 }}
        keyboardShouldPersistTaps="handled"
        className="px-4 pt-4"
      >
        <Text className="text-sm text-neutral-500 mb-4">{t("create.event.privateDesc")}</Text>
        <Card className="p-4 mb-4">
          <EventSectionTitle step={1} title={t("create.event.sections.identity")} />
          <EventIdentitySelector profile={profile} clubs={identity.clubs} value={identity.publisherClubId}
            onChange={identity.setPublisherClubId} loading={identity.isPending} error={identity.isError}
            retry={() => { void identity.refetch(); }} disabled={createMut.isPending} />
        </Card>
        <Card className="p-4 mb-4">
          <EventSectionTitle step={2} title={t("create.event.sections.essentials")} />
          <Input
            label={`${t("create.event.name")} *`}
            value={name}
            onChangeText={setName}
            placeholder={t("create.event.example")}
            maxLength={80}
          />
          <View className="mt-4" />
          <SportPicker value={sport} onChange={setSport} />

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 mt-2">
            {t("create.event.startDate")} *
          </Text>
          <NativeDateField
            mode="datetime"
            value={startDate}
            onChange={(d) => {
              setStartDate(d);
              if (endDate && d >= endDate) {
                setEndDate(null);
                setEndDateError(t("events.endAfterStart"));
              }
            }}
            title={t("create.event.startDate")}
            confirmLabel={t("common.ok")}
            cancelLabel={t("common.cancel")}
            renderTrigger={() => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("create.event.startDate")}
                className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 mb-4"
              >
                <Text className="text-neutral-900 dark:text-neutral-50">{formatEventDateTime(startDate)}</Text>
              </Pressable>
            )}
          />

          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t("create.event.endDate")}
          </Text>
          <NativeDateField
            mode="datetime"
            value={endDate ?? startDate}
            onChange={(d) => {
              if (d <= startDate) {
                setEndDateError(t("events.endAfterStart"));
              } else {
                setEndDateError("");
                setEndDate(d);
              }
            }}
            title={t("create.event.endDate")}
            confirmLabel={t("common.ok")}
            cancelLabel={t("common.cancel")}
            renderTrigger={() => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("create.event.endDate")}
                className="border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 mb-4"
              >
                <Text className="text-neutral-900 dark:text-neutral-50">
                  {endDate ? formatEventDateTime(endDate) : t("updateEvent.dateLabel")}
                </Text>
              </Pressable>
            )}
          />
          {endDateError ? (
            <Text className="text-error text-sm mb-4">{endDateError}</Text>
          ) : null}

          <Input
            label={t("create.event.venueAddress")}
            value={venue}
            onChangeText={setVenue}
            placeholder={t("create.event.venueAddress")}
          />

          <View className="mt-4" />
          <Input
            label={t("forms.description")}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholder={t("create.event.descriptionPlaceholder")}
            help={`${description.trim().length}/2000`}
          />

          <View className="mt-4" />
          <EventHostingSelector
            value={hosting}
            onChange={setHosting}
            link={externalLink}
            onChangeLink={(v) => { setExternalLink(v); setLinkError(undefined); }}
            linkError={linkError}
            disabled={createMut.isPending}
          />
        </Card>
        <Card className="p-4 mb-4">
          <EventSectionTitle step={3} title={t("create.event.sections.participation")} />
          <Input
            label={t("create.event.totalSlots")}
            value={placesTotal}
            onChangeText={(v) => setPlacesTotal(v.replace(/[^0-9]/g, ""))}
            keyboardType="numeric"
            placeholder={t("events.unlimitedIfEmpty")}
            help={t("create.event.placesHint")}
          />
        </Card>
        <Card className="p-4 mb-4">
          <EventSectionTitle step={4} title={t("create.event.sections.media")} />
          <PhotosPicker uris={heroUris} onAdd={() => void pickHeroPhotos()} onRemove={(i) => setHeroUris((p) => p.filter((_, j) => j !== i))} />
        </Card>

        <Card className="p-4 mb-4">
          <EventSectionTitle step={5} title={t("create.event.sections.invitees")} hint={t("create.event.inviteHint")} />
          <Input
            label={t("create.event.inviteSearch")}
            value={searchQ}
            onChangeText={(v) => {
              setSearchQ(v);
              void searchUsers(v);
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
                    <Icon name="CheckCircle2" size={24} color="success" />
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
                      <Icon name="XCircle" size={16} color="error-500" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {!isValid && missing.length > 0 && (
          <View className="mt-1 mb-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">
            <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">
              {t("create.event.missingFields")}
            </Text>
            {missing.map((m) => (
              <Text key={m} className="text-xs text-neutral-700 dark:text-neutral-300">• {m}</Text>
            ))}
          </View>
        )}
        <Button
          title={t("create.event.publishPrivate")}
          onPress={() => createMut.mutate()}
          loading={createMut.isPending}
          disabled={!isValid}
          className="mt-2"
        />
      </ScrollView>
    </SafeScreen>
  );
}