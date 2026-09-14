import { View } from "react-native";
import { ErrorState } from "@/components/ui/ErrorState";
import { useRouter } from "expo-router";
import { t } from "@/hooks/useTranslation";
import { useEffect } from "react";
import { reportError } from "@/lib/reporting/errorReport";

/**
 * Expo Router global error boundary (`app/_error.tsx` convention).
 * Rendered for uncaught errors in any route segment.
 */
export default function GlobalErrorScreen({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    reportError(error, { operation: "render.global" });
  }, [error]);

  let title = "Une erreur est survenue";
  let body = "Quelque chose s'est mal passé. Réessaie.";
  let retryLabel = "Réessayer";
  let homeLabel = "Accueil";
  try {
    title = t("errors.crash.title");
    body = t("errors.crash.body");
    retryLabel = t("errors.crash.retry");
    homeLabel = t("common.back");
  } catch {
    // defaults above
  }

  return (
    <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-[#0A0F1E]">
      <ErrorState
        title={title}
        message={body}
        onRetry={retry}
        retryLabel={retryLabel}
        testID="global-error-screen"
      />
      <ErrorState
        message={homeLabel}
        onRetry={() => router.replace("/")}
        testID="global-error-home"
      />
    </View>
  );
}
