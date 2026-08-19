import { Linking, Alert, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { LEGAL_DOCUMENTS } from "@/lib/legalDocuments";

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
      <ScrollView contentContainerClassName="p-4 pb-24 gap-4">
        <View className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700 gap-2">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Email</Text>
          <Text className="text-neutral-700 dark:text-neutral-300">maximilien.montant@gmail.com</Text>
          <Button title="Ouvrir mon mail" onPress={openMailto} className="mt-2" />
        </View>

        <View className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700 gap-2">
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

        <View className="flex-row flex-wrap gap-2">
          {Object.entries(LEGAL_DOCUMENTS).map(([slug, doc]) => (
            <Button
              key={slug}
              title={doc.title}
              variant="secondary"
              onPress={() => router.push(`/legal/${slug}`)}
              className="flex-1"
            />
          ))}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}