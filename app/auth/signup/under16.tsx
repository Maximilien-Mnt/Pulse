import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Header } from "@/components/shared/Header";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { useTranslation } from "@/hooks/useTranslation";
import { Icon } from "@/components/ui/Icon";
import { useSignupStore } from "@/stores/signupStore";

export default function Under16Screen() {
  const router = useRouter();
  const { t } = useTranslation();
  const resetSignup = useSignupStore((s) => s.reset);

  useEffect(() => {
    void resetSignup();
  }, [resetSignup]);

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <Header
        title={t("signup.underage.title")}
        showBackButton
        backToLanding
        className="px-0 mb-2"
        titleClassName="text-2xl text-neutral-900 dark:text-neutral-50"
      />
      <ScrollView contentContainerClassName="px-6 pt-8 pb-10" keyboardShouldPersistTaps="handled">
        <View className="items-center mt-12 mb-8">
          <View className="w-20 h-20 rounded-full bg-error/10 items-center justify-center mb-6">
            <Icon name="AlertCircle" size={32} color="error-500" />
          </View>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2 text-center">
            {t("signup.underage.title")}
          </Text>
          <Text className="text-neutral-600 dark:text-neutral-300 text-center leading-relaxed">
            {t("signup.underage.message")}
          </Text>
        </View>

        <View className="mt-8">
          <Button
            title={t("signup.underage.backToSignin")}
            onPress={() => router.replace("/auth/signin")}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
