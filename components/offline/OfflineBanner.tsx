// ---------------------------------------------------------------------------
// PULSE — Offline banner
//
// Small fixed banner shown when the device loses connectivity. Keeps cached
// content visible and offers an explicit retry after reconnect. Never blocks
// the screen — just informs.
// ---------------------------------------------------------------------------

import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import { queryClient } from "@/lib/queryClient";
import { useTranslation, t } from "@/hooks/useTranslation";
import { Pressable, Text, View } from "react-native";
import { cn } from "@/utils/format";

export function OfflineBanner() {
  const { online } = useOnlineStatus();
  const { t } = useTranslation();

  if (online) return null;

  return (
    <View className="fixed top-0 left-0 right-0 z-50 bg-amber-600 dark:bg-amber-700 px-4 py-2 shadow-lg">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2 min-w-0">
          <Text className="text-sm font-medium text-white shrink-0">
            {t("offline.banner.title")}
          </Text>
          <Text className="text-sm text-white/90 shrink-0">
            {t("offline.banner.body")}
          </Text>
        </View>
        <Pressable
          className={cn(
            "shrink-0 rounded-full bg-white/20 px-3 py-1.5",
            "active:bg-white/30",
          )}
          onPress={() => {
            // Explicit retry: invalidate the read-only query prefixes so the
            // next render pulls fresh data from the server (if still online).
            void queryClient.invalidateQueries({ queryKey: ["feed"] });
            void queryClient.invalidateQueries({ queryKey: ["clubs"] });
            void queryClient.invalidateQueries({ queryKey: ["events"] });
            void queryClient.invalidateQueries({ queryKey: ["profile"] });
            void queryClient.invalidateQueries({ queryKey: ["public-profile"] });
          }}
        >
          <Text className="text-sm font-medium text-white">
            {t("offline.banner.retryLabel")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
