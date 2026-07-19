import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SPORTS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { clubPrivateSchema } from "@/utils/validation";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useMutation, useQuery } from "@tanstack/react-query";

export default function CreatePrivateClubScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);

  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [description, setDescription] = useState("");
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

      const validation = clubPrivateSchema.safeParse({ name, sport, description, invitees });
      if (!validation.success) {
        throw new Error(validation.error.errors[0]?.message ?? "Validation error");
      }

      // Create club
      const { data: club, error: clubErr } = await supabase
        .from("clubs")
        .insert({
          name: name.trim(),
          sport,
          description: description.trim() || null,
          is_private: true,
          country: profile?.country || "",
          city: profile?.city || "",
          created_by: userId,
        } as any)
        .select("id")
        .single();

      if (clubErr || !club) throw clubErr ?? new Error("club creation failed");

      // Add creator as owner
      const { error: memberErr } = await supabase.from("club_members").insert({
        club_id: club.id,
        user_id: userId,
        role: "owner",
      });
      if (memberErr) throw memberErr;

      // Send invitations
      for (const inviteeId of invitees) {
        await supabase.from("notifications").insert({
          user_id: inviteeId,
          type: "club_invitation",
          title: "Invitation à rejoindre un club",
          body: `${profile?.full_name ?? "Quelqu'un"} t'a invité à rejoindre "${name}"`,
          data: { club_id: club.id, inviter_id: userId },
        });
      }

      return club.id;
    },
    onSuccess: (clubId) => {
      Toast.show({ type: "success", text1: "Club privé créé !" });
      router.replace(`/(tabs)/clubs/${clubId}`);
    },
    onError: (err) => {
      Toast.show({ type: "error", text1: err instanceof Error ? err.message : "Erreur" });
    },
  });

  const isValid = name.trim().length > 0 && sport.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#1E6BFF" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-center text-neutral-900 dark:text-neutral-50">
          Club privé
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView contentContainerClassName="p-4 pb-24">
        <Card className="p-4 mb-4">
          <Text className="text-sm text-neutral-500 mb-4">
            Crée un club privé pour inviter uniquement tes amis et contacts.
          </Text>

          <Input
            label="Nom du club *"
            value={name}
            onChangeText={setName}
            placeholder="Ex: Équipe de tennis du周末"
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
                  sport === s.id
                    ? "bg-primary"
                    : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                <Text
                  className={
                    sport === s.id
                      ? "text-white font-medium"
                      : "text-neutral-700 dark:text-neutral-200"
                  }
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Description optionnelle..."
          />
        </Card>

        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-3">Inviter des membres</Text>
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
              {searchHits.map((user) => (
                <Pressable
                  key={user.id}
                  onPress={() => toggleInvitee(user.id)}
                  className="flex-row items-center p-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                >
                  <Avatar uri={user.avatar_url} size={32} />
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
                {invitees.length} membre{invitees.length > 1 ? "s" : ""} invité{invitees.length > 1 ? "s" : ""}
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
          title="Créer le club"
          onPress={() => createMut.mutate()}
          loading={createMut.isPending}
          disabled={!isValid}
          className="mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
