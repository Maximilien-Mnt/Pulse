import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OBJECTIVES, SPORTS } from "@/lib/constants";
import { useSignupStore } from "@/stores/signupStore";
import { signupStep4Schema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Stack, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";
import { z } from "zod";

type Form = z.infer<typeof signupStep4Schema>;

export default function SignupStep4() {
  const router = useRouter();
  const setStep4 = useSignupStore((s) => s.setStep4);
  const { control, handleSubmit, watch, setValue } = useForm<Form>({
    resolver: zodResolver(signupStep4Schema),
    defaultValues: { interestedSports: [], objectives: [], heightCm: "", weightKg: "" },
  });

  const interested = watch("interestedSports");
  const objectives = watch("objectives");

  const toggle = (field: "interestedSports" | "objectives", value: string) => {
    const cur = watch(field);
    if (cur.includes(value)) setValue(field, cur.filter((x) => x !== value), { shouldValidate: true });
    else setValue(field, [...cur, value], { shouldValidate: true });
  };

  const onSubmit = handleSubmit((values) => {
    setStep4({
      interestedSports: values.interestedSports,
      objectives: values.objectives,
      heightCm: values.heightCm,
      weightKg: values.weightKg,
    });
    router.push("/auth/signup/step5");
  });

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]">
      <Stack.Screen options={{ title: "Étape 4/5" }} />
      <ScrollView contentContainerClassName="px-4 py-4 pb-24">
        <Text className="text-base font-semibold mb-2">Sports intéressés (optionnel)</Text>
        <View className="flex-row flex-wrap mb-4">
          {SPORTS.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => toggle("interestedSports", s.id)}
              className={`px-3 py-2 rounded-full mr-2 mb-2 ${interested.includes(s.id) ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"}`}
            >
              <Text className={interested.includes(s.id) ? "text-white" : "text-neutral-800 dark:text-neutral-100"}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="text-base font-semibold mb-2">Objectifs (optionnel)</Text>
        <View className="flex-row flex-wrap mb-4">
          {OBJECTIVES.map((o) => (
            <Pressable
              key={o}
              onPress={() => toggle("objectives", o)}
              className={`px-3 py-2 rounded-full mr-2 mb-2 ${objectives.includes(o) ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-800"}`}
            >
              <Text className={objectives.includes(o) ? "text-white text-xs" : "text-xs text-neutral-800 dark:text-neutral-100"}>{o}</Text>
            </Pressable>
          ))}
        </View>
        <Controller
          control={control}
          name="heightCm"
          render={({ field: { value, onChange } }) => (
            <Input label="Taille (cm, optionnel)" value={value ?? ""} onChangeText={onChange} keyboardType="number-pad" />
          )}
        />
        <Controller
          control={control}
          name="weightKg"
          render={({ field: { value, onChange } }) => (
            <Input label="Poids (kg, optionnel)" value={value ?? ""} onChangeText={onChange} keyboardType="numeric" />
          )}
        />
        <View className="flex-row gap-3 mt-4">
          <Button title="Précédent" variant="secondary" onPress={() => router.back()} />
          <Button title="Continuer" onPress={onSubmit} className="flex-1" />
        </View>
      </ScrollView>
    </View>
  );
}
