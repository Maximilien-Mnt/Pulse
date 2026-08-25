// ---------------------------------------------------------------------------
// PULSE CREATE SCREEN
//
// Entry point reached from the CreateBottomSheet (modal overlay).
// Reads ?mode=post|club|event|conversation from URL params and shows
// the corresponding form. A missing mode redirects to the feed.
// ---------------------------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { SPORTS } from "@/lib/constants";
import type { SportId } from "@/lib/constants";
import { cn, parseTagsInput } from "@/utils/format";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";
import { Image } from "expo-image";
import { uploadImageToStorage } from "@/lib/imageUpload";

import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tag } from "@/components/ui/Tag";
import { TagInput } from "@/components/feed/TagInput";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function uploadImageToSupabase(uri: string, path: string) {
  return uploadImageToStorage({ bucket: "posts", path, uri });
}

// ---------------------------------------------------------------------------
// Post Form
// ---------------------------------------------------------------------------

/** Upper bound on the number of #hashtags a user may attach to a post. */
const MAX_TAGS = 20;

function PostForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const posthog = usePostHog();
  const userId = useAuthStore((s) => s.userId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sport, setSport] = useState<SportId | null>(null);
  const [media, setMedia] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");

  const canPublish = title.trim().length > 0 || body.trim().length > 0 || media.length > 0;
  const parsedTags = useMemo(() => parseTagsInput(tagsInput, MAX_TAGS), [tagsInput]);

  const pickMedia = useCallback(async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: false,
      exif: false,
    });
    if (!res.canceled) {
      setMedia((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, 5));
    }
  }, []);

  const publishMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      const urls: string[] = [];
      for (let i = 0; i < media.length; i++) {
        const uri = media[i]!;
        const path = `${userId}/${Date.now()}_${i}.jpg`;
        const url = await uploadImageToSupabase(uri, path);
        urls.push(url);
      }
      const tags = sport ? [sport, ...parsedTags] : parsedTags;
      const { error } = await supabase.from("posts").insert({
        author_id: userId,
        title: title.trim(),
        body: body.trim(),
        format: urls.length > 1 ? "gallery" : urls.length === 1 ? "image" : "text",
        media_urls: urls,
        tags,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      posthog.capture("post_published", { has_media: media.length > 0, media_count: media.length });
      Toast.show({ type: "success", text1: "Post publié" });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      onClose();
      router.push("/(tabs)/feed");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Publication impossible";
      Toast.show({ type: "error", text1: message });
    },
  });

  return (
    <View className="flex-1">
      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        {/* Title */}
        <Input
          label="Titre"
          value={title}
          onChangeText={setTitle}
          placeholder=""
        />

        {/* Textarea */}
        <Input
          label="Partage ta séance, ton résultat, ta motivation..."
          multiline
          value={body}
          onChangeText={setBody}
          placeholder=""
        />

        {/* Media */}
        <View className="mt-4">
          <Button variant="secondary" icon="Image" onPress={pickMedia}>
            Ajouter une photo ou video
          </Button>
          {media.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 mt-3">
              {media.map((uri) => (
                <View key={uri} className="rounded-md overflow-hidden bg-neutral-200">
                  <Image source={{ uri }} style={{ width: 80, height: 80 }} contentFit="cover" />
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Sport chips (optional, single-select) */}
        <View className="mt-4">
          <Text variant="caption" className="text-text-secondary mb-2">
            Sport concerné (optionnel)
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {SPORTS.map((s) => (
              <Pressable key={s.id} onPress={() => setSport(sport === s.id ? null : s.id)}>
                <Tag variant="chip" active={sport === s.id}>
                  {s.label}
                </Tag>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tags (hashtags) — separate, optional field, each tag starts with # */}
        <View className="mt-4">
          <Text variant="caption" className="text-text-secondary mb-2">
            Tags (optionnel) — commencez par #
          </Text>
          <TagInput
            value={tagsInput}
            onChangeText={setTagsInput}
            placeholder="#tennis #course #outdoor"
          />
          {parsedTags.length > 0 ? (
            <Text variant="caption" className="text-text-tertiary mt-1">
              {parsedTags.length} tag{parsedTags.length > 1 ? "s" : ""} sur {MAX_TAGS}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Fixed bottom button */}
      <View className="px-4 py-3 bg-surface dark:bg-surface-dark border-t border-border">
        <Button
          variant="primary"
          onPress={() => publishMut.mutate()}
          disabled={!canPublish}
          loading={publishMut.isPending}
          className="w-full"
        >
          Publier
        </Button>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Club Form
// ---------------------------------------------------------------------------

function ClubForm({ onClose }: { onClose: () => void }) {
  const userId = useAuthStore((s) => s.userId);
  const posthog = usePostHog();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sport, setSport] = useState<SportId | null>(null);
  const [city, setCity] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);

  const pickCover = useCallback(async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: false, exif: false });
    if (!res.canceled && res.assets[0]) setCoverUri(res.assets[0].uri);
  }, []);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      let coverUrl: string | null = null;
      if (coverUri) {
        const path = `${userId}/clubs/${Date.now()}.jpg`;
        coverUrl = await uploadImageToSupabase(coverUri, path);
      }
      const { error } = await supabase.from("clubs").insert({
        name: name.trim(),
        description: description.trim(),
        sport: sport ?? "",
        country: "",
        city: city.trim(),
        created_by: userId,
        logo_url: coverUrl,
        hero_urls: coverUrl ? [coverUrl] : [],
      } as any);
      if (error) throw error;
      const { data: followers, error: fError } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);
      if (fError) throw fError;
      const ids = (followers ?? []).map((f) => f.follower_id);
      if (ids.length > 0) {
        await supabase.from("notifications").insert(
          ids.map((uid) => ({
            user_id: uid,
            type: "followed_user_new_club",
            title: "Nouveau club",
            body: "Un compte que tu suis a créé un nouveau club.",
            data: { creator_id: userId },
          }))
        );
      }
    },
    onSuccess: () => {
      posthog.capture("club_created");
      Toast.show({ type: "success", text1: "Club créé" });
      void queryClient.invalidateQueries({ queryKey: ["clubs"] });
      onClose();
      router.push("/(tabs)/explore");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Création impossible";
      Toast.show({ type: "error", text1: message });
    },
  });

  const canCreate = name.trim().length > 0 && sport !== null;

  return (
    <View className="flex-1">
      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        <Input label="Nom du club" value={name} onChangeText={setName} />
        <View className="mt-4">
          <Input label="Description" multiline value={description} onChangeText={setDescription} />
        </View>

        {/* Sport (required, single-select) */}
        <View className="mt-4">
          <Text variant="caption" className="text-text-secondary mb-2">
            Sport principal
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {SPORTS.map((s) => (
              <Pressable key={s.id} onPress={() => setSport(sport === s.id ? null : s.id)}>
                <Tag variant="chip" active={sport === s.id}>
                  {s.label}
                </Tag>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="mt-4">
          <Input label="Localisation" value={city} onChangeText={setCity} />
        </View>

        <View className="mt-4">
          <Button variant="secondary" icon="Image" onPress={pickCover}>
            {coverUri ? "Changer l'image de couverture" : "Ajouter une image de couverture"}
          </Button>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={{ width: "100%", height: 160, borderRadius: 12, marginTop: 12 }} contentFit="cover" />
          ) : null}
        </View>
      </ScrollView>

      <View className="px-4 py-3 bg-surface dark:bg-surface-dark border-t border-border">
        <Button
          variant="primary"
          onPress={() => createMut.mutate()}
          disabled={!canCreate}
          loading={createMut.isPending}
          className="w-full"
        >
          Créer le club
        </Button>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Event Form
// ---------------------------------------------------------------------------

function EventForm({ onClose }: { onClose: () => void }) {
  const userId = useAuthStore((s) => s.userId);
  const posthog = usePostHog();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sport, setSport] = useState<SportId | null>(null);
  const [startDate, setStartDate] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);

  const pickCover = useCallback(async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: false, exif: false });
    if (!res.canceled && res.assets[0]) setCoverUri(res.assets[0].uri);
  }, []);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      let coverUrl: string | null = null;
      if (coverUri) {
        const path = `${userId}/events/${Date.now()}.jpg`;
        coverUrl = await uploadImageToSupabase(coverUri, path);
      }
      const { error } = await supabase.from("events").insert({
        name: title.trim(),
        description: description.trim(),
        sport: sport ?? "",
        country: "",
        start_date: startDate || new Date().toISOString(),
        city: location.trim(),
        places_total: capacity ? parseInt(capacity, 10) : null,
        created_by: userId,
        logo_url: coverUrl,
        hero_urls: coverUrl ? [coverUrl] : [],
        is_private: false,
        price_cents: 0,
        is_paid: false,
        difficulty: 1,
      } as any);
      if (error) throw error;
      const { data: evFollowers, error: efErr } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);
      if (efErr) throw efErr;
      const evIds = (evFollowers ?? []).map((f) => f.follower_id);
      if (evIds.length > 0) {
        await supabase.from("notifications").insert(
          evIds.map((uid) => ({
            user_id: uid,
            type: "followed_user_new_event",
            title: "Nouvel événement",
            body: "Un compte que tu suis a créé un nouvel événement.",
            data: { creator_id: userId },
          }))
        );
      }
    },
    onSuccess: () => {
      posthog.capture("event_created");
      Toast.show({ type: "success", text1: "Événement créé" });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      onClose();
      router.push("/(tabs)/explore");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Création impossible";
      Toast.show({ type: "error", text1: message });
    },
  });

  const canCreate = title.trim().length > 0 && sport !== null;

  return (
    <View className="flex-1">
      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        <Input label="Titre" value={title} onChangeText={setTitle} />
        <View className="mt-4">
          <Input label="Description" multiline value={description} onChangeText={setDescription} />
        </View>

        {/* Sport */}
        <View className="mt-4">
          <Text variant="caption" className="text-text-secondary mb-2">
            Sport concerné
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {SPORTS.map((s) => (
              <Pressable key={s.id} onPress={() => setSport(sport === s.id ? null : s.id)}>
                <Tag variant="chip" active={sport === s.id}>
                  {s.label}
                </Tag>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="mt-4">
          <Input label="Date et heure (AAAA-MM-JJ HH:MM)" value={startDate} onChangeText={setStartDate} />
        </View>
        <View className="mt-4">
          <Input label="Lieu" value={location} onChangeText={setLocation} />
        </View>
        <View className="mt-4">
          <Input label="Capacité max (optionnel)" value={capacity} onChangeText={setCapacity} keyboardType="numeric" />
        </View>

        <View className="mt-4">
          <Button variant="secondary" icon="Image" onPress={pickCover}>
            {coverUri ? "Changer l'image de couverture" : "Ajouter une image de couverture"}
          </Button>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={{ width: "100%", height: 160, borderRadius: 12, marginTop: 12 }} contentFit="cover" />
          ) : null}
        </View>
      </ScrollView>

      <View className="px-4 py-3 bg-surface dark:bg-surface-dark border-t border-border">
        <Button
          variant="primary"
          onPress={() => createMut.mutate()}
          disabled={!canCreate}
          loading={createMut.isPending}
          className="w-full"
        >
          Créer l'événement
        </Button>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Conversation Form
// ---------------------------------------------------------------------------

function ConversationForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const posthog = usePostHog();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ id: string; username: string; full_name: string; avatar_url: string | null }[]>([]);

  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) { setHits([]); return; }
    const { data } = await supabase.from("profiles").select("id, username, full_name, avatar_url").ilike("username", `%${q}%`).limit(10);
    setHits(data ?? []);
  }, []);

  const startConv = useMutation({
    mutationFn: async (otherId: string) => {
      if (!userId) throw new Error("auth");
      const { data: existing } = await supabase.from("conversation_participants").select("conversation_id, user_id").eq("user_id", userId);
      const convIds = [...new Set((existing ?? []).map((e) => e.conversation_id))];
      if (convIds.length) {
        const { data: others } = await supabase.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", convIds).neq("user_id", userId);
        const pair = others?.find((o) => o.user_id === otherId);
        if (pair) return pair.conversation_id;
      }
      const { data: convId, error: ce } = await supabase.rpc("create_direct_conversation", { p_other_user_id: otherId });
      if (ce || !convId) throw ce ?? new Error("conv");
      return convId as string;
    },
    onSuccess: (cid) => {
      posthog.capture("conversation_started");
      void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
      onClose();
      router.push(`/(tabs)/conversations/${cid}`);
    },
  });

  return (
    <View className="p-4">
      <Input
        label="Recherche par pseudonyme"
        value={query}
        onChangeText={(t) => { setQuery(t); void searchUsers(t); }}
        autoCapitalize="none"
      />
      <View className="mt-3">
        {hits.map((user) => (
          <Pressable
            key={user.id}
            onPress={() => startConv.mutate(user.id)}
            className="flex-row items-center gap-3 py-3 border-b border-border"
          >
            <Avatar size={40} uri={user.avatar_url} />
            <View className="flex-1">
              <Text variant="subtitle" className="text-text-primary">{user.full_name}</Text>
              <Text variant="caption" className="text-text-tertiary">@{user.username}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen — routes based on ?mode= param
// ---------------------------------------------------------------------------

export default function CreateScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const router = useRouter();
  const mode = params.mode ?? null;

  const handleClose = useCallback(() => {
    if (router.canDismiss()) router.dismiss();
    else router.push("/(tabs)/feed");
  }, [router]);

  // Safety net: this screen is only reached with a ?mode= param now.
  // The create menu is a modal overlay (CreateBottomSheet) opened from
  // the TabBar / SideRail, so a missing mode means redirect to the feed.
  React.useEffect(() => {
    if (!mode) {
      router.replace("/(tabs)/feed");
    }
  }, [mode, router]);

  if (!mode) return null;

  return (
    <SafeScreen className="flex-1 bg-bg" edges={["top"]}>
      {mode === "post" ? <PostForm onClose={handleClose} /> : null}
      {mode === "conversation" ? <ConversationForm onClose={handleClose} /> : null}
    </SafeScreen>
  );
}
