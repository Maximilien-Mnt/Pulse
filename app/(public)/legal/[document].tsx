import { useLocalSearchParams } from "expo-router";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "@/components/ui/Icon";

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
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 text-center">
            Document introuvable
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-2 px-4 py-3 bg-primary rounded-xl active:opacity-80"
          >
            <Icon name="ChevronLeft" size={20} color="text-inverse" />
            <Text className="text-white font-semibold">Retour</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  return <LegalDocumentViewer title={doc.title} content={doc.content} />;
}