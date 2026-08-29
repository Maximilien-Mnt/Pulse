// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Landing Footer
//
// Reusable footer for the public landing page. Lists every legal document
// dynamically from the LEGAL_DOCUMENTS registry (plus a Contact link),
// followed by the editor identity and copyright line.
//
// Usage:
//   <LandingFooter />
// ---------------------------------------------------------------------------

import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LEGAL_DOCUMENTS, type LegalSlug } from "@/lib/legalDocuments";
import { useTranslation , t } from "@/hooks/useTranslation";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  const iconMap: Record<LegalSlug, IconName> = {
    terms: "FileText",
    privacy: "Shield",
    moderation: "Shield",
    "bug-report": "MessageSquare",
    imprint: "Info",
  };

  return (
    <View className="px-6 pt-8 pb-6 border-t border-neutral-200 dark:border-neutral-800">
      {/* Section label */}
      <Text
        variant="caption"
        className="font-semibold text-base text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4"
      >
        {t("landing.footer.legalLabel")}
      </Text>

      {/* Legal document links — dynamically mapped from the registry */}
      <View className="flex-col gap-3 mb-6">
        {Object.entries(LEGAL_DOCUMENTS).map(([slug, doc]) => {
          const iconName = iconMap[slug as LegalSlug] ?? "FileText";

          return (
            <Link key={slug} href={`/legal/${slug}`} asChild>
              <Pressable className="flex-row items-center gap-3 bg-white dark:bg-neutral-800 rounded-xl px-4 py-3 border border-neutral-100 dark:border-neutral-700 active:opacity-80">
                <View className="w-9 h-9 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
                  <Icon name={iconName} size={20} color="text-primary" />
                </View>
                <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  {doc.title}
                </Text>
              </Pressable>
            </Link>
          );
        })}
        <Link href="/legal/contact" asChild>
          <Pressable className="flex-row items-center gap-3 bg-white dark:bg-neutral-800 rounded-xl px-4 py-3 border border-neutral-100 dark:border-neutral-700 active:opacity-80">
            <View className="w-9 h-9 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
              <Icon name="MessageSquare" size={20} color="text-primary" />
            </View>
            <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              {t("landing.footer.support")}
            </Text>
          </Pressable>
        </Link>
      </View>

      {/* Editor identity */}
      <Text variant="body" className="text-neutral-500 dark:text-neutral-400">
        {t("landing.footer.editor")}
      </Text>

      {/* Copyright */}
      <Text variant="body" className="text-neutral-500 dark:text-neutral-400">
        {t("landing.footer.copyright", { year: currentYear })}
      </Text>
    </View>
  );
}


