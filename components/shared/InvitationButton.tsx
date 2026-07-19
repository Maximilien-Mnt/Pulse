import { Button } from "@/components/ui/Button";
import { useCreateInvitation } from "@/hooks/useInvitations";
import { Share } from "react-native";
import Toast from "react-native-toast-message";

type Props = {
  type: "club" | "event";
  targetId: string;
  /** Only show for the owner of a private club/event. */
  visible: boolean;
  className?: string;
};

/**
 * Renders a "Copier le lien d'invitation" button that generates a one-off
 * invitation token deep link and opens the native share sheet.
 */
export function InvitationButton({ type, targetId, visible, className }: Props) {
  const createInvite = useCreateInvitation();

  if (!visible) return null;

  const handlePress = () => {
    createInvite.mutate(
      { type, targetId },
      {
        onSuccess: async ({ link }) => {
          try {
            await Share.share({
              message:
                type === "club"
                  ? `Rejoins mon club sur Pulse : ${link}`
                  : `Rejoins mon événement sur Pulse : ${link}`,
              url: link,
            });
          } catch {
            // User dismissed the share sheet — nothing to do.
          }
          Toast.show({ type: "success", text1: "Lien d'invitation généré" });
        },
        onError: (e) => {
          Toast.show({
            type: "error",
            text1: e instanceof Error ? e.message : "Erreur",
          });
        },
      }
    );
  };

  return (
    <Button
      title="Copier le lien d'invitation"
      variant="secondary"
      onPress={handlePress}
      loading={createInvite.isPending}
      className={className}
    />
  );
}
