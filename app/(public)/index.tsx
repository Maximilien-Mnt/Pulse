import { Redirect, Link } from "expo-router";
import { ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { useAuthStore } from "@/stores/authStore";

import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LandingFooter } from "@/components/landing/LandingFooter";

const FEATURES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "FileText",
    title: "Posts & médias",
    description:
      "Partagez vos moments sportifs avec du texte, des photos, des galeries et des vidéos courtes.",
  },
  {
    icon: "Users",
    title: "Clubs",
    description:
      "Rejoignez ou créez des clubs autour de votre sport, organisez des sorties et créez du lien.",
  },
  {
    icon: "Calendar",
    title: "Événements",
    description:
      "Découvrez des événements près de chez vous et inscrivez-vous en un clic.",
  },
  {
    icon: "MessageCircle",
    title: "Messagerie",
    description:
      "Échangez en direct avec les autres membres et les organisateurs.",
  },
  {
    icon: "Shield",
    title: "Profils privé / public",
    description:
      "Contrôlez votre visibilité : profil privé sur invitation ou profil public ouvert.",
  },
  {
    icon: "Activity",
    title: "Géolocalisation",
    description:
      "Trouvez des clubs et événements à proximité, si vous autorisez la localisation.",
  },
];

export default function LandingScreen() {
  const initialized = useAuthStore((s) => s.initialized);
  const userId = useAuthStore((s) => s.userId);

  if (initialized && userId) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return (
    <SafeScreen edges={["top"]} className="bg-neutral-50 dark:bg-[#0A0F1E]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24">
        {/* ── Logo / brand mark (no header buttons or links) ── */}
        <View className="pt-12 pb-6 items-center">
          <View className="w-20 h-20 rounded-2xl bg-primary items-center justify-center overflow-hidden">
            <Image
              source={require("@/assets/logo/pulse-icon.png")}
              style={{ width: 56, height: 56 }}
              contentFit="contain"
            />
          </View>
        </View>

        {/* ── Hero section ── */}
        <View className="px-6 py-8 gap-6 items-center">
          <Text variant="display" className="text-center leading-tight">
            Le réseau social du sport
          </Text>

          <Text
            variant="bodyLarge"
            className="text-center text-neutral-600 dark:text-neutral-300 max-w-sm leading-relaxed"
          >
            Rejoignez une communauté de sportifs, partagez vos activités, trouvez
            des événements et des clubs près de chez vous.
          </Text>

          {/* Big, wide, full-width CTA buttons (stacked for mobile UX) */}
          <View className="w-full gap-4 mt-2">
            <Link href="/auth/signup/step1" asChild>
              <Button
                title="Créer mon compte"
                className="h-14 w-full px-6"
                icon="PlusCircle"
              />
            </Link>
            <Link href="/auth/signin" asChild>
              <Button
                title="Se connecter"
                variant="secondary"
                className="h-14 w-full px-6"
                icon="User"
              />
            </Link>
          </View>

          <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Web disponible — Apps iOS & Android bientôt.
          </Text>
        </View>

        <View className="px-6 py-6 gap-4">
          <Text variant="h2" className="text-neutral-900 dark:text-neutral-50 mb-2">
            Fonctionnalités
          </Text>
          <View className="gap-3">
            {FEATURES.map((feature) => (
              <View
                key={feature.title}
                className="bg-white dark:bg-neutral-800 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-700 gap-3"
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center">
                    <Icon name={feature.icon} size={20} color="primary" />
                  </View>
                  <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                    {feature.title}
                  </Text>
                </View>
                <Text className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="px-6 py-8">
          <View className="bg-primary dark:bg-primary-dark rounded-2xl p-6 gap-3">
            <Text variant="subtitle" className="text-white font-semibold">
              Prêt à rejoindre la communauté ?
            </Text>
            <Text className="text-white/90 dark:text-white/90 leading-relaxed">
              Créez votre compte gratuitement et commencez à explorer Pulse dès
              maintenant.
            </Text>
            <Link href="/auth/signup/step1" asChild>
              <Button
                title="S'inscrire gratuitement"
                variant="ghost"
                className="h-14 w-full mt-2 bg-white dark:bg-white"
                icon="PlusCircle"
              />
            </Link>
          </View>
        </View>

        {/* ── Footer with all legal documents ── */}
        <LandingFooter />
      </ScrollView>
    </SafeScreen>
  );
}
