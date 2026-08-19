import { Redirect, Link } from "expo-router";
import { ScrollView, View, Pressable } from "react-native";
import { useAuthStore } from "@/stores/authStore";

import { SafeScreen } from "@/components/shared/SafeScreen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";

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
        <View className="px-6 pt-4 pb-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-3xl font-bold text-primary">Pulse</Text>
            <View className="flex-row gap-2">
              <Link href="/legal" asChild>
                <Pressable className="px-3 py-2">
                  <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    Informations légales
                  </Text>
                </Pressable>
              </Link>
              <Link href="/auth/signin" asChild>
                <Pressable className="px-3 py-2">
                  <Text className="text-sm font-semibold text-primary">Se connecter</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>

        <View className="px-6 py-8 gap-4">
          <Text className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 leading-tight">
            Le réseau social du sport
          </Text>
          <Text className="text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Rejoignez une communauté de sportifs, partagez vos activités, trouvez des événements
            et des clubs près de chez vous.
          </Text>
          <View className="flex-row flex-wrap gap-3 mt-2">
            <Link href="/auth/signup/step1" asChild>
              <Button title="Créer un compte" className="flex-1" />
            </Link>
            <Link href="/auth/signin" asChild>
              <Button title="Se connecter" variant="secondary" className="flex-1" />
            </Link>
          </View>
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
            Web disponible — Apps iOS & Android bientôt.
          </Text>
        </View>

        <View className="px-6 py-6 gap-4">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
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
          <View className="bg-primary rounded-2xl p-6 gap-3">
            <Text className="text-xl font-bold text-white">
              Prêt à rejoindre la communauté ?
            </Text>
            <Text className="text-white/90 leading-relaxed">
              Créez votre compte gratuitement et commencez à explorer Pulse dès maintenant.
            </Text>
            <Link href="/auth/signup/step1" asChild>
              <Button title="S'inscrire" className="mt-2 bg-white" />
            </Link>
          </View>
        </View>

        <View className="px-6 py-6 gap-3">
          <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Informations légales
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Link href="/legal/terms" asChild>
              <Pressable>
                <Text className="text-sm text-primary">Conditions d'utilisation</Text>
              </Pressable>
            </Link>
            <Link href="/legal/privacy" asChild>
              <Pressable>
                <Text className="text-sm text-primary">Politique de confidentialité</Text>
              </Pressable>
            </Link>
            <Link href="/legal/imprint" asChild>
              <Pressable>
                <Text className="text-sm text-primary">Mentions légales</Text>
              </Pressable>
            </Link>
            <Link href="/legal/contact" asChild>
              <Pressable>
                <Text className="text-sm text-primary">Contact</Text>
              </Pressable>
            </Link>
          </View>
          <Text className="text-xs text-neutral-500">
            Éditeur : Maximilien MONTANT — maximilien.montant@gmail.com
          </Text>
          <Text className="text-xs text-neutral-500">
            © {new Date().getFullYear()} Pulse. Tous droits réservés.
          </Text>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}