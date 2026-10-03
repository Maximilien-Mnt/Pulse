import { View } from "react-native";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { getMemberStatusCategoryStyle } from "@/lib/clubMemberStatus";
import { cn } from "@/utils/format";

// ---------------------------------------------------------------------------
// PULSE — Member status badge
// ---------------------------------------------------------------------------
// Renders a member's `member_status` with the icon + color of its category
// (7 distinct combinations, see CLUB_MEMBER_STATUS_CATEGORIES). The label is
// resolved by the caller so the badge stays a pure presentational component.
// ---------------------------------------------------------------------------

export interface MemberStatusBadgeProps {
  /** Raw `member_status` value (a vocabulary code or `other`). */
  memberStatus: string;
  /** Already-resolved display label (translated, or the custom free text). */
  label: string;
  /** Free-text status — only relevant when `memberStatus === "other"`. */
  customMemberStatus?: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function MemberStatusBadge({
  memberStatus,
  label,
  size = "sm",
  className,
}: MemberStatusBadgeProps) {
  const category = getMemberStatusCategoryStyle(memberStatus);
  const iconSize = size === "sm" ? 12 : 14;

  if (!label) return null;

  return (
    <View
      className={cn(
        "flex-row items-center gap-1 px-2 py-0.5 rounded-full self-start",
        category.badgeClass,
        className
      )}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Icon name={category.icon} size={iconSize} color={category.iconColor} />
      <Text
        variant="caption"
        className={cn("font-semibold", category.textClass)}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
