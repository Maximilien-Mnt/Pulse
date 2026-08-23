// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — Landing Footer
//
// Reusable footer for the public landing page. Lists every legal document
// dynamically from the LEGAL_DOCUMENTS registry (plus a Contact link),
// followed by the editor identity and copyright line.
//
// Usage:
//   <LandingFooter />
// ---------------------------------------------------------------------------

import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { LEGAL_DOCUMENTS } from "@/lib/legalDocuments";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <View className="px-6 pt-8 pb-6 border-t border-neutral-200 dark:border-neutral-800">
      {/* Section label */}
      <Text
        variant="caption"
        className="font-semibold text-base text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3"
      >
        Informations légales
      </Text>

      {/* Legal document links — dynamically mapped from the registry */}
      <View className="flex-row flex-wrap gap-3 mb-6">
        {Object.entries(LEGAL_DOCUMENTS).map(([slug, doc]) => (
          <Link key={slug} href={`/legal/${slug}`} asChild>
            <Pressable className="py-1">
              <Text className="text-base text-neutral-600 dark:text-neutral-400">
                {doc.title}
              </Text>
            </Pressable>
          </Link>
        ))}
        <Link href="/legal/contact" asChild>
          <Pressable className="py-1">
            <Text className="text-base text-neutral-600 dark:text-neutral-400">
            Support
          </Text>
          </Pressable>
        </Link>
      </View>

      {/* Editor identity */}
      <Text variant="body" className="text-neutral-500 dark:text-neutral-400">
        Éditeur : Maximilien MONTANT — maximilien.montant@gmail.com
      </Text>

      {/* Copyright */}
      <Text variant="body" className="text-neutral-500 dark:text-neutral-400">
        © {currentYear} Pulse. Tous droits réservés.
      </Text>
    </View>
  );
}
