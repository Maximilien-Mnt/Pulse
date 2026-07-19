import { Avatar } from "@/components/ui/Avatar";
import type { ClubMember } from "@/hooks/useClubMembers";
import { FlatList, Text, View } from "react-native";

type Props = {
  members: ClubMember[];
};

/**
 * Horizontal FlatList of avatar + name, non-clickable (V1 spec).
 */
export function ClubMembersStrip({ members }: Props) {
  if (!members.length) return null;

  return (
    <View className="mt-4">
      <Text className="text-sm font-semibold text-neutral-500 mb-2 uppercase tracking-wide">
        Membres ({members.length})
      </Text>
      <FlatList
        horizontal
        data={members}
        keyExtractor={(m) => m.user_id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View className="items-center mr-4">
            <Avatar uri={item.avatar_url} size={40} />
            <Text className="text-xs text-neutral-500 mt-1" numberOfLines={1}>
              {item.full_name}
            </Text>
          </View>
        )}
      />
    </View>
  );
}