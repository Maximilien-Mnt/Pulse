import { useLocalSearchParams } from "expo-router";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";
import { View } from "react-native";
import { LegalDocumentViewer } from "@/components/legal/LegalDocumentViewer";
import { LEGAL_DOCUMENTS, type LegalSlug } from "@/lib/legalDocuments";
import { BackButton } from "@/components/ui/BackButton";

export default function SignupLegalScreen() {
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
          <BackButton fallbackRoute="/" />
        </View>
      </SafeScreen>
    );
  }

  return <LegalDocumentViewer title={doc.title} content={doc.content} />;
}