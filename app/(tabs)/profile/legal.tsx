// ---------------------------------------------------------------------------
// LEGAL DOCUMENT VIEWER
// ---------------------------------------------------------------------------

import { useLocalSearchParams } from "expo-router";
import { LegalDocumentViewer } from "@/components/legal/LegalDocumentViewer";
import { LEGAL_DOCUMENTS } from "@/lib/legalDocuments";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";
import { Pressable, View } from "react-native";

export default function LegalScreen() {
  const params = useLocalSearchParams<{ filePath?: string; title?: string }>();

  // Map legacy filePath param to the new registry when possible.
  const legacyToSlug: Record<string, keyof typeof LEGAL_DOCUMENTS | undefined> = {
    "01-conditions-utilisation.md": "terms",
    "02-politique-confidentialite.md": "privacy",
    "04-politique-de-moderation.md": "moderation",
    "03-signaler-un-bug.md": "bug-report",
    "05-mentions-legales.md": "imprint",
  };

  const slug = legacyToSlug[params.filePath ?? ""];
  const doc = slug ? LEGAL_DOCUMENTS[slug] : undefined;
  const title = doc?.title ?? params.title ?? "Document juridique";

  if (!doc) {
    return (
      <SafeScreen className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]" edges={["top"]}>
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Document non disponible
          </Text>
          <Pressable
            onPress={() => (globalThis?.history?.length ? (globalThis.history as any).back() : null)}
            className="px-4 py-2 bg-primary rounded-lg"
          >
            <Text className="text-white font-semibold">Retour</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  return <LegalDocumentViewer title={title} content={doc.content} />;
}
