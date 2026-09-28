import { useRouter } from "expo-router";
import { View, Pressable } from "react-native";
import { LEGAL_META, type LegalSlug } from "@/lib/legalMeta";

import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Arrow, useArrowNudge } from "@/components/ui/Arrow";
import { BackButton } from "@/components/ui/BackButton";
import { useTranslation , t } from "@/hooks/useTranslation";
import { cn } from "@/utils/format";

const iconMap: Record<LegalSlug, IconName> = {
  terms: "FileText",
  privacy: "Shield",
  moderation: "Shield",
  "bug-report": "MessageSquare",
  imprint: "Info",
};

/** One legal document entry — forward navigation with the shared arrow nudge. */
function LegalDocRow({ slug, onPress }: { slug: LegalSlug; onPress: () => void }) {
  const { active, ...nudge } = useArrowNudge();
  const doc = LEGAL_META[slug];
  const iconName = iconMap[slug] ?? "FileText";

  return (
    <Pressable
      {...nudge}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 bg-white dark:bg-neutral-800 rounded-xl p-4",
        "border border-neutral-100 dark:border-neutral-700 active:opacity-80",
        active && "bg-primary-tint dark:bg-primary-tint-dark"
      )}
    >
      <View className="w-11 h-11 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
        <Icon name={iconName} size={24} color="text-primary" />
      </View>

      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          {doc.title}
        </Text>
      </View>

      <Arrow active={active} name="ChevronRight" size={20} color="text-tertiary" />
    </Pressable>
  );
}

export default function PublicLegalHubScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const docs = Object.keys(LEGAL_META) as LegalSlug[];

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <View className="px-4 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <View className="flex-row items-center gap-3">
          <BackButton fallbackRoute="/" />
          <Text className="flex-1 text-center text-lg font-bold text-neutral-900 dark:text-neutral-50">
            {t("legal.title")}
          </Text>
          <View className="w-11" />
        </View>
      </View>

      <View className="flex-1 gap-3 p-4">
        {docs.map((slug) => (
          <LegalDocRow
            key={slug}
            slug={slug}
            onPress={() => router.push(`/legal/${slug}`)}
          />
        ))}
      </View>
    </SafeScreen>
  );
}
