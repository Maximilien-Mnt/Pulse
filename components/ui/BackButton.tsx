// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — BackButton
//
// Canonical "go back to previous page" button. Every subpage / detail page
// should use this component so the back affordance is identical everywhere:
// same icon, same size, same color, same position.
//
// Design:
//   - Icon: Lucide `ChevronLeft` (via the design-system <Icon> wrapper),
//     strokeWidth 1.75, size 24.
//   - Color: semantic `primary` token — auto-adapts to light (#3358FF) and
//     dark (#5C82FF) mode. No hardcoded hex.
//   - Shape: circular 44x44 touch target with a subtle primary tint so the
//     button stays clearly visible on any background.
//
// Behavior:
//   - Default: calls `router.back()` on press.
//   - If there is no navigation history to go back to, it falls back to
//     `fallbackRoute` (default: "/(tabs)/explore").
//   - If `alwaysUseFallbackRoute` is true, it always navigates to
//     `fallbackRoute` instead of `router.back()`.
// ---------------------------------------------------------------------------

import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { Icon } from "./Icon";
import { cn } from "@/utils/format";
import { hasNavigatedInSession, getPreviousRoute } from "@/lib/navigationSession";

type BackButtonProps = {
  /** Route to navigate to when there is no history to go back to. */
  fallbackRoute?: string;
  /** Extra tailwind className for the pressable. */
  className?: string;
  /** When true, always navigate to `fallbackRoute` instead of `router.back()`. */
  alwaysUseFallbackRoute?: boolean;
  /**
   * When true, `router.back()` is only used if the user actually navigated to
   * this screen within the current app session (not via a hard refresh or
   * deep link). Otherwise it falls back to `fallbackRoute`. This avoids
   * `router.canGoBack()` returning `true` on web after a reload due to stale
   * browser history.
   */
  useInAppSession?: boolean;
};

export function BackButton({
  fallbackRoute = "/(tabs)/explore",
  className,
  alwaysUseFallbackRoute = false,
  useInAppSession = false,
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (alwaysUseFallbackRoute) {
      router.replace(fallbackRoute);
    } else if (useInAppSession) {
      // Only go back when the user navigated here within this app session.
      // On a fresh load / refresh, `canGoBack()` can be misleading on web,
      // so we gate it behind our in-app navigation flag.
      //
      // Prefer the exact screen the user actually came from (tracked cross-tab
      // in `navigationSession.ts`) before relying on the navigation history or
      // the hardcoded `fallbackRoute`. This lets a club detail page opened from
      // profile return to profile, one opened from a clubs list return to that
      // list, etc.
      if (getPreviousRoute()) {
        router.replace(getPreviousRoute()!);
      } else if (hasNavigatedInSession() && router.canGoBack()) {
        router.back();
      } else {
        router.replace(fallbackRoute);
      }
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Retour"
      className={cn(
        "w-11 h-11 items-center justify-center rounded-full bg-primary/10 active:bg-primary/20",
        className
      )}
    >
      <Icon name="ChevronLeft" size={24} color="primary" />
    </Pressable>
  );
}