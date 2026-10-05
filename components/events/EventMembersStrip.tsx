import { Avatar } from "@/components/ui/Avatar";
import { useTranslation } from "@/hooks/useTranslation";
import { Arrow, useArrowNudge } from "@/components/ui/Arrow";
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
  const { t } = useTranslation();
  const { active, ...nudge } = useArrowNudge();
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
              className="mt-1 text-text-secondary dark:text-text-secondary-dark max-w-[64px]"
            >
              {p.full_name}
            </PulseText>
          </Pressable>
        ))}
        <Pressable
          {...nudge}
          onPress={seeAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("events.members.seeAll")}
          className={
            // Reference hover treatment for arrow navigation controls: the tint
            // replaces the base circle, since `bg-primary/10` is emitted after
            // `bg-primary-tint` in the generated web CSS.
            "w-11 h-11 shrink-0 rounded-full items-center justify-center" + // Standard 44x44 — all circular buttons share this dimension.
            (active
              ? " bg-primary-tint dark:bg-primary-tint-dark"
              : " bg-primary/10")
          }
        >
          <Arrow active={active} name="ChevronRight" size={20} color="primary" />
        </Pressable>
      </ScrollView>
    </View>
  );
}
