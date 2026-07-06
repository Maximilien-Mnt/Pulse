import { Stack } from "expo-router";

export default function SignupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#F8FAFC" },
        headerTintColor: "#0F172A",
      }}
    />
  );
}
