import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { signInSchema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { z } from "zod";

type Form = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    });
    if (error) {
      Toast.show({
        type: "error",
        text1: error.message.includes("fetch") ? "Vérifiez votre connexion internet" : error.message,
      });
      return;
    }
    router.replace("/(tabs)/feed");
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neutral-50 dark:bg-[#0A0F1E]"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="px-6 pt-16 pb-10" keyboardShouldPersistTaps="handled">
        <Text className="text-3xl font-bold text-primary mb-2">Pulse</Text>
        <Text className="text-neutral-600 dark:text-neutral-300 mb-8">Connecte-toi pour continuer</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange } }) => (
            <Input label="Email" value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange } }) => (
            <Input label="Mot de passe" value={value} onChangeText={onChange} secureTextEntry error={errors.password?.message} />
          )}
        />
        <Pressable className="mb-6">
          <Text className="text-primary font-semibold">Mot de passe oublié</Text>
        </Pressable>
        <Button title="Se connecter" onPress={onSubmit} loading={isSubmitting} />
        <View className="flex-row justify-center mt-8">
          <Text className="text-neutral-600 dark:text-neutral-300">Pas encore de compte ? </Text>
          <Link href="/auth/signup/step1" asChild>
            <Pressable>
              <Text className="text-primary font-semibold">S&apos;inscrire</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
