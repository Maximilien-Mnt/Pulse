import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { useProfile } from "@/hooks/useProfile";
import { parseTagsInput } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import { Modal, Pressable, ScrollView, Text, View, FlatList } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { usePostHog } from "posthog-react-native";
import { ClubCreationModal } from "@/components/clubs/ClubCreationModal";
import { EventCreationModal } from "@/components/events/EventCreationModal";


function base64ToArrayBuffer(base64: string) {
  const binary = globalThis.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}


async function uploadImageToSupabase(uri: string, path: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const { error } = await supabase.storage.from("posts").upload(path, arrayBuffer, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("posts").getPublicUrl(path);
  return data.publicUrl;
}


async function uploadVideoToSupabase(uri: string, path: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const { error } = await supabase.storage.from("posts-videos").upload(path, arrayBuffer, {
    contentType: "video/mp4",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("posts-videos").getPublicUrl(path);
  return data.publicUrl;
}


export default function CreateScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const userId = useAuthStore((s) => s.userId);
  const { data: profile } = useProfile(userId);
  const [postOpen, setPostOpen] = useState(false);
  const [convOpen, setConvOpen] = useState(false);
  const [clubModalOpen, setClubModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [format, setFormat] = useState<"text" | "image" | "gallery" | "video">("text");
  const [media, setMedia] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [userQ, setUserQ] = useState("");
  const [userHits, setUserHits] = useState<{ id: string; username: string; full_name: string; avatar_url: string | null }[]>([]);


  const { data: sportsCount = 0 } = useQuery({
    queryKey: ["sports-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_sports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId!);
      if (error) throw error;
      return count ?? 0;
    },
  });


  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setUserHits([]);
      return;
    }
    const { data } = await supabase.from("profiles").select("id, username, full_name, avatar_url").ilike("username", `%${q}%`).limit(10);
    setUserHits(data ?? []);
  }, []);


  const publishMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      const urls: string[] = [];
      let videoUrl: string | null = null;
      
      // Upload images for image/gallery formats
      if (format === "image" || format === "gallery") {
        for (let i = 0; i < media.length; i++) {
          const uri = media[i]!;
          const path = `${userId}/${Date.now()}_${i}.jpg`;
          const url = await uploadImageToSupabase(uri, path);
          urls.push(url);
        }
      }
      
      // Upload video for video format
      if (format === "video" && videoUri) {
        const path = `${userId}/${Date.now()}.mp4`;
        videoUrl = await uploadVideoToSupabase(videoUri, path);
      }
      
      const tagArr = parseTagsInput(tags);
      
      // Insert post with video URL if present
      const postData: any = {
        author_id: userId,
        title: title.trim(),
        body: desc.trim() || null,
        format,
        media_urls: urls,
        tags: tagArr,
      };
      
      // Add video fields if video format
      if (format === "video" && videoUrl) {
        postData.video_url = videoUrl;
        // TODO: Generate thumbnail using expo-video-thumbnails
        postData.video_thumbnail = null;
        postData.video_duration = null;
      }
      
      const { data: post, error } = await supabase.from("posts").insert(postData).select("id").single();
      
      if (error) throw error;
    },
    onSuccess: () => {
      posthog.capture("post_published", {
        format,
        has_media: media.length > 0 || format === "video",
        media_count: format === "video" ? 1 : media.length,
        has_tags: tags.trim().length > 0,
      });
      Toast.show({ type: "success", text1: "Post publié !" });
      setPostOpen(false);
      setTitle("");
      setDesc("");
      setMedia([]);
      setVideoUri(null);
      setTags("");
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      router.push("/(tabs)/feed");
    },
    onError: () => Toast.show({ type: "error", text1: "Publication impossible" }),
  });


  const pick = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const max = format === "gallery" ? 5 : 1;
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: format === "gallery",
      quality: 0.7,
      base64: false,
      exif: false,
    });
    if (!res.canceled) setMedia(res.assets.map((a) => a.uri).slice(0, max));
  };


  const startConv = useMutation({
    mutationFn: async (otherId: string) => {
      if (!userId) throw new Error("auth");
      const { data: existing } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .eq("user_id", userId);
      const convIds = [...new Set((existing ?? []).map((e) => e.conversation_id))];
      if (convIds.length) {
        const { data: others } = await supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", convIds)
          .neq("user_id", userId);
        const pair = others?.find((o) => o.user_id === otherId);
        if (pair) return pair.conversation_id;
      }
      const { data: conv, error: ce } = await supabase.from("conversations").insert({}).select("id").single();
      if (ce || !conv) throw ce ?? new Error("conv");
      const { error: e1 } = await supabase.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: userId },
        { conversation_id: conv.id, user_id: otherId },
      ]);
      if (e1) throw e1;
      return conv.id as string;
    },
    onSuccess: (cid) => {
      posthog.capture("conversation_started");
      setConvOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
      router.push(`/(tabs)/conversations/${cid}`);
    },
    onError: () => Toast.show({ type: "error", text1: "Impossible de créer la conversation" }),
  });


  const cards = useMemo(
    () => [
      {
        key: "post",
        title: "Nouveau post",
        icon: "image-outline" as const,
        onPress: () => {
          if (!profile?.full_name || !profile.email || sportsCount === 0) {
            Toast.show({ type: "info", text1: "Complète ton profil pour poster" });
            return;
          }
          setPostOpen(true);
        },
      },
      {
        key: "club",
        title: "Nouveau club",
        icon: "people-outline" as const,
        onPress: () => setClubModalOpen(true),
      },
      {
        key: "event",
        title: "Nouvel événement",
        icon: "calendar-outline" as const,
        onPress: () => setEventModalOpen(true),
      },
      { key: "conv", title: "Nouvelle conversation", icon: "chatbubble-outline" as const, onPress: () => setConvOpen(true) },
    ],
    [profile, sportsCount]
  );


  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <Text className="text-2xl font-bold text-primary px-4 pt-4">Créer</Text>
      <ScrollView contentContainerClassName="px-4 py-6 gap-4">
        {cards.map((c) => (
          <Card key={c.key} onPress={c.onPress} className="p-5">
            <View className="flex-row items-center gap-4">
              <Ionicons name={c.icon} size={32} color="#1E6BFF" />
              <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{c.title}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>


      <Modal visible={postOpen} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4 max-h-[90%]">
            <Text className="text-xl font-bold mb-3">Nouveau post</Text>
            <Input label="Titre" value={title} onChangeText={setTitle} />
            <Input label="Description" value={desc} onChangeText={setDesc} multiline />
            <View className="flex-row gap-2 mb-3 flex-wrap">
              {(["text", "image", "gallery", "video"] as const).map((f) => (
                <Pressable key={f} onPress={() => setFormat(f)} className={`px-3 py-2 rounded-xl ${format === f ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"}`}>
                  <Text className={format === f ? "text-white font-medium" : "text-neutral-800 dark:text-neutral-100"}>{f}</Text>
                </Pressable>
              ))}
            </View>
            {format === "video" ? (
              videoUri ? (
                <View className="mt-3 flex-row items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-2 rounded-xl">
                  <Ionicons name="videocam" size={24} color="#1E6BFF" />
                  <Text className="flex-1 text-neutral-900 dark:text-neutral-100">Vidéo sélectionnée</Text>
                  <Pressable onPress={() => setVideoUri(null)}>
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </Pressable>
                </View>
              ) : (
                <Button 
                  title="Ajouter une vidéo (max 60s)" 
                  variant="secondary" 
                  onPress={async () => {
                    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (!p.granted) return;
                    const res = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ['videos'],
                      allowsEditing: true,
                      quality: 1,
                      videoMaxDuration: 60,
                    });
                    if (!res.canceled && res.assets[0]) {
                      setVideoUri(res.assets[0].uri);
                    }
                  }} 
                />
              )
            ) : format !== "text" ? (
              <Button title="Ajouter des photos" variant="secondary" onPress={pick} />
            ) : null}
            {media.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                {media.map((uri) => (
                  <View key={uri} className="mr-2 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                    <Image source={{ uri }} style={{ width: 96, height: 96 }} contentFit="cover" />
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <Input label="Tags" value={tags} onChangeText={setTags} placeholder="#course #club" />
            <View className="flex-row gap-2 mt-4">
              <Button title="Annuler" variant="ghost" onPress={() => setPostOpen(false)} />
              <Button title="Publier" onPress={() => publishMut.mutate()} loading={publishMut.isPending} />
            </View>
          </View>
        </View>
      </Modal>


      <Modal visible={convOpen} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-neutral-900 rounded-t-3xl p-4 h-[70%]">
            <Text className="text-xl font-bold mb-2">Nouvelle conversation</Text>
            <Input
              label="Recherche par @username"
              value={userQ}
              onChangeText={(t) => {
                setUserQ(t);
                void searchUsers(t);
              }}
              autoCapitalize="none"
            />
            <FlatList
              data={userHits}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <Pressable className="py-3 border-b border-neutral-100 dark:border-neutral-800" onPress={() => startConv.mutate(item.id)}>
                  <Text className="font-semibold">{item.full_name}</Text>
                  <Text className="text-neutral-500">@{item.username}</Text>
                </Pressable>
              )}
            />
            <Button title="Fermer" variant="ghost" onPress={() => setConvOpen(false)} />
          </View>
        </View>
      </Modal>

      <ClubCreationModal visible={clubModalOpen} onClose={() => setClubModalOpen(false)} />
      <EventCreationModal visible={eventModalOpen} onClose={() => setEventModalOpen(false)} />
    </SafeAreaView>
  );
}