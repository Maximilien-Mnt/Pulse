import { Linking, Alert, ScrollView, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LEGAL_DOCUMENTS, type LegalSlug } from "@/lib/legalDocuments";
import { BackButton } from "@/components/ui/BackButton";


const iconMap: Record<LegalSlug, IconName> = {
  terms: "FileText",
  privacy: "Shield",
  moderation: "Shield",
  "bug-report": "MessageSquare",
  imprint: "Info",
};

export default function PublicContactScreen() {
  const router = useRouter();

  const openMailto = () => {
    const address = "maximilien.montant@gmail.com";
    const subject = encodeURIComponent("Contact Pulse");
    const body = encodeURIComponent(
      "Bonjour,\n\nJe vous contacte à propos de l'application Pulse.\n\n"
    );
    const url = `mailto:${address}?subject=${subject}&body=${body}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert("Email non disponible", "Impossible d'ouvrir votre application mail.");
          return;
        }
        return Linking.openURL(url);
      })
      .catch(() => {
        Alert.alert("Erreur", "Impossible d'ouvrir votre application mail.");
      });
  };

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <View className="px-4 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <View className="flex-row items-center gap-3">
          <BackButton fallbackRoute="/(tabs)/explore" />
          <Text className="flex-1 text-center text-lg font-bold text-neutral-900 dark:text-neutral-50">
            Aide et contact
          </Text>
          <View className="w-11" />
        </View>
      </View>
      <ScrollView contentContainerClassName="p-4 pb-24 gap-4">
        <View className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-100 dark:border-neutral-700 gap-2">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Email</Text>
          <Text className="text-neutral-700 dark:text-neutral-300">maximilien.montant@gmail.com</Text>
          <Button title="Ouvrir mon mail" onPress={openMailto} className="mt-2" />
        </View>

        <View className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-100 dark:border-neutral-700 gap-2">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Pourquoi me contacter ?
          </Text>
          <Text className="text-neutral-700 dark:text-neutral-300">
            - Signalement de contenu ou d’un utilisateur
          </Text>
          <Text className="text-neutral-700 dark:text-neutral-300">
            - Demande liée à vos données personnelles
          </Text>
          <Text className="text-neutral-700 dark:text-neutral-300">
            - Question sur le service ou un bug
          </Text>
        </View>

        <View className="flex-col gap-2">
          {Object.entries(LEGAL_DOCUMENTS).map(([slug, doc]) => {
            const iconName = iconMap[slug as LegalSlug] ?? "FileText";

            return (
              <Pressable
                key={slug}
                onPress={() => router.push(`/legal/${slug}`)}
                className="flex-row items-center gap-3 bg-white dark:bg-neutral-800 rounded-xl px-4 py-3 border border-neutral-100 dark:border-neutral-700 active:opacity-80"
              >
                <View className="w-9 h-9 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
                  <Icon name={iconName} size={20} color="text-primary" />
                </View>
                <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  {doc.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
