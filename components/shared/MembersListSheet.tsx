import { useState } from "react";
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator } from "react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { useRemoveClubMember } from "@/hooks/useRemoveClubMember";
import { useRemoveEventParticipant } from "@/hooks/useRemoveEventParticipant";

export type Member = {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  type: "club" | "event";
  targetId: string;
  createdBy: string | null;
  currentUserId: string | null;
};

export function MembersListSheet({ visible, onClose, members, type, targetId, createdBy, currentUserId }: Props) {
  const isManager = currentUserId !== null && createdBy === currentUserId;
  const removeClubMember = useRemoveClubMember();
  const removeEventParticipant = useRemoveEventParticipant();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = (member: Member) => {
    const memberName = member.full_name || member.username;
    
    Alert.alert(
      "Confirmer la suppression",
      `Voulez-vous vraiment retirer ${memberName} de ${type === "club" ? "ce club" : "cet événement"} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: async () => {
            setRemovingId(member.user_id);
            try {
              if (type === "club") {
                await removeClubMember.mutateAsync({ clubId: targetId, memberId: member.user_id });
              } else {
                await removeEventParticipant.mutateAsync({ eventId: targetId, participantId: member.user_id });
              }
            } catch (error) {
              console.error("Failed to remove member:", error);
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50">
      {/* Backdrop */}
      <Pressable className="absolute inset-0 bg-black/50" onPress={onClose} />
      
      {/* Bottom Sheet */}
      <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 rounded-t-3xl max-h-[80%]">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            {type === "club" ? "Membres" : "Participants"} ({members.length})
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Icon name="X" size={24} color="text-primary" />
          </Pressable>
        </View>

        {/* Members List */}
        <FlatList
          data={members}
          keyExtractor={(m) => m.user_id}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={
            <View className="p-8 items-center">
              <Text className="text-neutral-500 text-center">Aucun membre pour le moment</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isRemoving = removingId === item.user_id;
            
            return (
              <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0">
                <Avatar uri={item.avatar_url} size={48} />
                <View className="flex-1 ml-3">
                  <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  <Text className="text-sm text-neutral-500" numberOfLines={1}>
                    @{item.username}
                  </Text>
                </View>
                
                {isManager && item.user_id !== currentUserId && (
                  <Pressable
                    onPress={() => handleRemove(item)}
                    disabled={isRemoving}
                    className="p-2 ml-2"
                    hitSlop={8}
                  >
                    {isRemoving ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Icon name="Trash2" size={24} color="error-500" />
                    )}
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}