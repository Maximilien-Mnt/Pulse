import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Stack, useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CheckEmailScreen() {
  const router = useRouter();

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <Stack.Screen options={{ title: "" }} />
<ScrollView contentContainerClassName="px-6 pt-4 pb-10" keyboardShouldPersistTaps="handled">
        <View className="items-center mt-12 mb-8">
          <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6">
            <Ionicons name="mail-outline" size={48} color="#1E6BFF" />
          </View>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">Vérifiez votre email</Text>
          <Text className="text-neutral-600 dark:text-neutral-300 text-center">
            Un email de confirmation vient d'être envoyé. Cliquez sur le lien pour activer votre compte.
          </Text>
        </View>

        <View className="mt-8">
          <Button title="Retour à la connexion" onPress={() => router.replace("/auth/signin")} variant="secondary" />
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
