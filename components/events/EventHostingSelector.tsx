// ---------------------------------------------------------------------------
// PULSE — EventHostingSelector
//
// Lets the creator (personal or club profile) declare whether the event is
// hosted in-app or via an external website. When external, the link field
// becomes mandatory and only accepts valid links.
// ---------------------------------------------------------------------------

import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { t } from "@/hooks/useTranslation";

export type EventHosting = "in_app" | "external";

type Props = {
  value: EventHosting;
  onChange: (v: EventHosting) => void;
  link: string;
  onChangeLink: (v: string) => void;
  linkError?: string;
  disabled?: boolean;
};

export function EventHostingSelector({ value, onChange, link, onChangeLink, linkError, disabled }: Props) {
  const options: { id: EventHosting; label: string; icon: "Smartphone" | "Globe" }[] = [
    { id: "in_app", label: t("create.event.hostingInApp"), icon: "Smartphone" },
    { id: "external", label: t("create.event.hostingExternal"), icon: "Globe" },
  ];
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {t("create.event.hosting")}
      </Text>
      <View className="flex-row gap-2">
        {options.map((o) => {
          const selected = value === o.id;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !!disabled }}
              disabled={disabled}
              onPress={() => onChange(o.id)}
              className={`flex-1 flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl border ${
                selected
                  ? "bg-primary/10 border-primary"
                  : "bg-neutral-100 dark:bg-neutral-800 border-transparent"
              }`}
            >
              <Icon name={o.icon} size={18} color={selected ? "primary" : "text-tertiary"} />
              <Text className={selected ? "text-primary font-semibold text-sm" : "text-neutral-600 dark:text-neutral-300 text-sm"}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-xs text-neutral-500 mt-1 mb-2">{t("create.event.hostingHint")}</Text>
      <Input
        label={`${t("create.event.registrationLink")} *`}
        value={link}
        onChangeText={onChangeLink}
        placeholder={t("create.event.registrationLinkPlaceholder")}
        help={t("create.event.registrationLinkHint")}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        textContentType="URL"
        error={linkError}
        testID="event-registration-link"
      />
    </View>
  );
}
