import { useRouter, useLocalSearchParams } from "expo-router";
import { View, Pressable } from "react-native";

import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";
import { LegalDocumentViewer } from "@/components/legal/LegalDocumentViewer";
import { LEGAL_DOCUMENTS, type LegalSlug } from "@/lib/legalDocuments";

export default function PublicLegalDocumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ document?: string }>();

  const slug = params.document as LegalSlug | undefined;
  const doc = slug ? LEGAL_DOCUMENTS[slug] : undefined;

  if (!doc) {
    return (
      <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Document introuvable
          </Text>
          <Pressable
            onPress={() => router.replace("/")}
            className="px-4 py-2 bg-primary rounded-lg"
          >
            <Text className="text-white font-semibold">Retour à l'accueil</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  return <LegalDocumentViewer title={doc.title} content={doc.content} />;
}