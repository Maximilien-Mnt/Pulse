// ---------------------------------------------------------------------------
// PULSE EXPLORE — Card Join Footer
//
// Single source of truth for the bottom CTA of Club/Event cards so the three
// membership states share the exact same box model (width / height / layout):
//   - member  → success-tinted status row (icon + label, centered)
//   - pending → neutral disabled-looking row (icon + label, centered)
//   - default → primary Button
//
// Height: a single h-12 everywhere (grid, list, wide, narrow) so the footer
// matches the primary Button md reference and never jumps between states.
// Grid compactness comes from the smaller cover / paddings, not a shorter CTA.
// ---------------------------------------------------------------------------

import React from "react";
import { View } from "react-native";
import { cn } from "@/utils/format";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import type { IconName } from "@/components/ui/Icon";

export type CardJoinStatus = "member" | "pending" | "none";

interface CardJoinFooterProps {
  status: CardJoinStatus;
  /** Label for the join button (e.g. "Rejoindre" / "Participer" / "S'inscrire") */
  joinLabel: string;
  /** Optional leading icon for the join button (e.g. Globe for external clubs) */
  joinIcon?: IconName;
  /** Label for the member state (e.g. "Membre" for clubs, "Inscrit" for events) */
  memberLabel: string;
  /** Label for the pending state */
  pendingLabel?: string;
  onPress: () => void;
  testID?: string;
}

export function CardJoinFooter({
  status,
  joinLabel,
  joinIcon,
  memberLabel,
  pendingLabel = "Demande envoyée",
  onPress,
  testID,
}: CardJoinFooterProps) {
  // One single height everywhere (list + wide + narrow + grid) so the card
  // footer never jumps between states or layouts — this mirrors the primary
  // Button md reference (h-12 + a 20px leading icon).
  const rowHeight = "h-12";
  const iconSize = 20;

  // Shared box model for the two non-interactive states — mirrors the
  // primary Button: full width, fixed height, centered row with gap.
  const statusRowClass = cn(
    "w-full flex-row items-center justify-center gap-2 rounded-md",
    rowHeight
  );

  if (status === "member") {
    return (
      <View
        className={cn(statusRowClass, "bg-success/10 dark:bg-success/15")}
        testID={testID ? `${testID}-member` : undefined}
        accessibilityRole="text"
        accessible
        accessibilityLabel={memberLabel}
      >
        <Icon name="CheckCircle2" size={iconSize} color="success" />
        <Text variant="buttonLabel" className="text-success">
          {memberLabel}
        </Text>
      </View>
    );
  }

  if (status === "pending") {
    return (
      <View
        className={cn(statusRowClass, "bg-neutral-100 dark:bg-neutral-800")}
        testID={testID ? `${testID}-pending` : undefined}
        accessibilityRole="text"
        accessible
        accessibilityLabel={pendingLabel}
      >
        <Icon name="Clock" size={iconSize} color="text-tertiary" />
        <Text variant="buttonLabel" className="text-neutral-500 dark:text-neutral-400">
          {pendingLabel}
        </Text>
      </View>
    );
  }

  return (
    <Button
      variant="primary"
      icon={joinIcon}
      onPress={onPress}
      className="w-full"
      testID={testID ? `${testID}-join` : undefined}
    >
      {joinLabel}
    </Button>
  );
}
