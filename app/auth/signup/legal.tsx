import { lazy, Suspense } from "react";
import { useLocalSearchParams } from "expo-router";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";
import { View } from "react-native";
import { BackButton } from "@/components/ui/BackButton";
import { LEGAL_META, type LegalSlug } from "@/lib/legalMeta";

// Lazy boundary: LegalBody statically imports the markdown renderer + full
// content registry, so this pulls both into a separate chunk. The initial
// public/auth bundle only carries slugs/titles from legalMeta.
const LegalBody = lazy(() =>
  import("@/components/legal/LegalBody").then((m) => ({
    default: m.LegalBody,
  }))
);

export default function SignupLegalScreen() {
  const params = useLocalSearchParams<{ document?: string }>();
  const slug = params.document as LegalSlug | undefined;
  const meta = slug ? LEGAL_META[slug] : undefined;

  if (!meta || !slug) {
    return (
      <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Document introuvable
          </Text>
          <BackButton fallbackRoute="/" />
        </View>
      </SafeScreen>
    );
  }

  return (
    <Suspense
      fallback={
        <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
          <View className="flex-1 items-center justify-center">
            <Text className="text-neutral-500">Chargement…</Text>
          </View>
        </SafeScreen>
      }
    >
      <LegalBody slug={slug} title={meta.title} />
    </Suspense>
  );
}