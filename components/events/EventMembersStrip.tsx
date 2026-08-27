import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Text as PulseText } from "@/components/ui/Text";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

type Participant = {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
};

type Props = {
  participants: Participant[];
  onSeeAll?: () => void;
  count?: number;
};

export function EventMembersStrip({
  participants,
  onSeeAll,
  count,
}: Props) {
  const router = useRouter();
  const total = count ?? participants.length;

  if (!participants.length) return null;

  const seeAll = onSeeAll ?? (() => {});

  return (
    <View className="px-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row items-center"
        contentContainerStyle={{ gap: 16, paddingRight: 8 }}
      >
        {participants.map((p) => (
          <Pressable
            key={p.user_id}
            onPress={() => router.push(`/profile/${p.user_id}`)}
            className="items-center"
            hitSlop={8}
          >
            <Avatar uri={p.avatar_url} size={40} />
            <PulseText
              variant="caption"
              numberOfLines={1}
              className="mt-1 text-neutral-700 dark:text-neutral-200 max-w-[64px]"
            >
              {p.full_name}
            </PulseText>
          </Pressable>
        ))}
        <Pressable
          onPress={seeAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Voir tous les participants"
          className="w-10 h-10 shrink-0 rounded-full bg-primary/10 items-center justify-center"
        >
          <Icon name="ChevronRight" size={20} color="primary" />
        </Pressable>
      </ScrollView>
    </View>
  );
}
