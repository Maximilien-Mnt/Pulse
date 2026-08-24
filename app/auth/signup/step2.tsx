import { Button } from "@/components/ui/Button";
import { SafeScreen } from "@/components/shared/SafeScreen";
import { Input } from "@/components/ui/Input";
import { Header } from "@/components/shared/Header";
import { COMMON_COUNTRIES, flagEmoji } from "@/utils/countries";
import { useSignupStore } from "@/stores/signupStore";
import { signupStep2Schema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { z } from "zod";
import { usePostHog } from "posthog-react-native";

type Form = z.infer<typeof signupStep2Schema>;

export default function SignupStep2() {
  const router = useRouter();
  const posthog = usePostHog();
  const setStep2 = useSignupStore((s) => s.setStep2);
  const [countryOpen, setCountryOpen] = useState(false);
  const [showDate, setShowDate] = useState(Platform.OS === "ios");

  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(signupStep2Schema),
    defaultValues: {
      birthDate: dayjs().subtract(16, "year").toDate(),
      country: "FR",
      city: "",
    },
  });

  const country = watch("country");
  const countryLabel = useMemo(
    () => COMMON_COUNTRIES.find((c) => c.code === country)?.label ?? "",
    [country]
  );

  const onSubmit = handleSubmit((values) => {
    setStep2({
      birthDate: values.birthDate,
      country: values.country,
      city: values.city?.trim() || undefined,
    });
    posthog.capture("signup_step_completed", { step: 2, country: values.country });
    router.push("/auth/signup/step3");
  });

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Header title="Étape 2/5" showBackButton backToLanding className="mb-2" />
        <ScrollView contentContainerClassName="px-6 py-4 pb-4" keyboardShouldPersistTaps="handled">
          <Text className="text-sm text-neutral-500 mb-2">Date de naissance</Text>
          {showDate ? (
            <DateTimePicker
              value={watch("birthDate")}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={dayjs().subtract(16, "year").toDate()}
              onChange={(_, d) => {
                if (d) setValue("birthDate", d, { shouldValidate: true });
                if (Platform.OS !== "ios") setShowDate(false);
              }}
            />
          ) : (
            <Pressable onPress={() => setShowDate(true)} className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-4">
              <Text>{dayjs(watch("birthDate")).format("DD/MM/YYYY")}</Text>
            </Pressable>
          )}
          {errors.birthDate ? <Text className="text-error text-sm mb-2">{errors.birthDate.message}</Text> : null}
          <Text className="text-sm text-neutral-500 mb-2">Pays</Text>
          <Pressable onPress={() => setCountryOpen(true)} className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-4">
            <Text>{country ? `${flagEmoji(country)} ${countryLabel}` : "Sélectionne un pays"}</Text>
          </Pressable>
          <Modal visible={countryOpen} transparent animationType="fade">
            <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setCountryOpen(false)}>
              <View className="bg-white dark:bg-neutral-900 rounded-t-2xl p-2 max-h-[70%]">
                <FlatList
                  data={COMMON_COUNTRIES}
                  keyExtractor={(c) => c.code}
                  renderItem={({ item }) => (
                    <Pressable
                      className="py-3 px-3 border-b border-neutral-100 dark:border-neutral-800"
                      onPress={() => {
                        setValue("country", item.code, { shouldValidate: true });
                        setCountryOpen(false);
                      }}
                    >
                      <Text className="text-base text-neutral-900 dark:text-neutral-50">
                        {flagEmoji(item.code)} {item.label}
                      </Text>
                    </Pressable>
                  )}
                />
              </View>
            </Pressable>
          </Modal>
          <Controller
            control={control}
            name="city"
            render={({ field: { value, onChange } }) => (
              <Input label="Ville (optionnel)" value={value ?? ""} onChangeText={onChange} />
            )}
          />
          <View className="flex-row gap-3 mt-4">
            <Button title="Précédent" variant="secondary" onPress={() => router.back()} />
            <Button title="Continuer" onPress={onSubmit} loading={isSubmitting} className="flex-1" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
