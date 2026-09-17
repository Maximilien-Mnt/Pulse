import { Pressable, Text, View } from "react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useTranslation } from "@/hooks/useTranslation";
import type { EventPublishingClub } from "@/lib/eventIdentity";
import type { Profile } from "@/types";

type Props = {
  profile: Pick<Profile, "full_name" | "username" | "avatar_url"> | null | undefined;
  clubs: EventPublishingClub[];
  value: string | null;
  onChange: (id: string | null) => void;
  loading: boolean;
  error: boolean;
  retry: () => void;
  disabled?: boolean;
};

export function EventIdentitySelector({ profile, clubs, value, onChange, loading, error, retry, disabled }: Props) {
  const { t } = useTranslation();
  const options = [
    { id: null, name: profile?.full_name || profile?.username || t("create.event.personalAccount"), image: profile?.avatar_url, caption: t("create.event.personalAccount") },
    ...clubs.map((c) => ({ id: c.id, name: c.name, image: c.logo_url, caption: t("create.event.clubAccount") })),
  ];
  return (
    <View className="mb-4">
      <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2">{t("create.event.createAs")}</Text>
      <Text className="text-sm text-neutral-500 mb-3">{t("create.event.identityHint")}</Text>
      <View accessibilityRole="radiogroup">
        {options.map((option) => (
          <Pressable key={option.id ?? "personal"} accessibilityRole="radio"
            accessibilityLabel={`${option.name}, ${option.caption}`}
            accessibilityState={{ checked: value === option.id, disabled: !!disabled || loading }}
            disabled={disabled || loading} onPress={() => onChange(option.id)}
            className={`flex-row items-center gap-3 p-3 mb-2 rounded-xl border ${value === option.id ? "border-primary bg-primary/10" : "border-neutral-200 dark:border-neutral-700"}`}>
            <Avatar uri={option.image} size={40} />
            <View className="flex-1">
              <Text className="font-semibold text-neutral-900 dark:text-neutral-50">{option.name}</Text>
              <Text className="text-sm text-neutral-500">{option.caption}</Text>
            </View>
            {value === option.id && <Icon name="CheckCircle2" size={22} color="primary" />}
          </Pressable>
        ))}
      </View>
      {loading && <Text className="text-sm text-neutral-500">{t("common.loading")}</Text>}
      {error && <View accessibilityRole="alert"><Text className="text-error mb-2">{t("create.event.identityError")}</Text><Button title={t("common.retry")} onPress={retry} variant="secondary" /></View>}
    </View>
  );
}
