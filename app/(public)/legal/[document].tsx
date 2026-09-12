// ---------------------------------------------------------------------------
// PULSE — Legal document screen (public)
//
// The 30 kB of legal markdown (lib/legalContent.ts) and the markdown
// renderer (LegalDocumentViewer) load lazily here so the landing page and
// legal hub stay light. Deep links (/legal/:slug) and the back / not-found
// fallbacks are preserved; only the document body itself is deferred behind
// a Suspense loading state.
// ---------------------------------------------------------------------------

import { lazy, Suspense } from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "@/components/ui/Icon";
import { useTranslation } from "@/hooks/useTranslation";

import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";
import { LEGAL_META, type LegalSlug } from "@/lib/legalMeta";

// Lazy boundary: LegalBody statically imports the markdown renderer + full
// content registry, so this React.lazy() pulls both into a separate chunk.
// The initial public bundle only carries slugs/titles from legalMeta.
const LegalBody = lazy(() =>
  import("@/components/legal/LegalBody").then((m) => ({
    default: m.LegalBody,
  }))
);
function LegalLoadingFallback() {
  const { t } = useTranslation();
  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <ActivityIndicator size="large" />
        <Text className="text-neutral-500 dark:text-neutral-400">
          {t("common.loading")}
        </Text>
      </View>
    </SafeScreen>
  );
}

function LegalNotFound() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 text-center">
          {t("common.notFound")}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-2 px-4 py-3 bg-primary rounded-xl active:opacity-80"
        >
          <Icon name="ChevronLeft" size={20} color="text-inverse" />
          <Text className="text-white font-semibold">{t("common.back")}</Text>
        </Pressable>
      </View>
    </SafeScreen>
  );
}

export default function PublicLegalDocumentScreen() {
  const params = useLocalSearchParams<{ document?: string }>();

  const slug = params.document as LegalSlug | undefined;
  // Titles resolve synchronously from the lightweight meta registry (no document
  // bodies) so the header renders instantly; the body streams in via Suspense and
  // the markdown renderer + markdown content load lazily on demand.
  const meta = slug ? LEGAL_META[slug] : undefined;

  if (!meta || !slug) {
    return <LegalNotFound />;
  }

  return (
    <Suspense fallback={<LegalLoadingFallback />}>
      <LegalBody slug={slug} title={meta.title} />
    </Suspense>
  );
}
