import { Link, useRouter } from "expo-router";
import { View, Pressable } from "react-native";
import { LEGAL_DOCUMENTS, type LegalSlug } from "@/lib/legalDocuments";

import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";

export default function PublicLegalHubScreen() {
  const router = useRouter();

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <Pressable onPress={() => router.replace("/")} hitSlop={8}>
          <Text className="text-primary font-semibold">← Retour</Text>
        </Pressable>
        <Text className="flex-1 text-center text-lg font-bold text-neutral-900 dark:text-neutral-50">
          Informations légales
        </Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 gap-3 p-4">
        {(Object.keys(LEGAL_DOCUMENTS) as LegalSlug[]).map((slug) => {
          const doc = LEGAL_DOCUMENTS[slug];
          return (
            <Link key={slug} href={`/legal/${slug}`} asChild>
              <Pressable className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700">
                <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{doc.title}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </SafeScreen>
  );
}