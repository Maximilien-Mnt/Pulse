// ---------------------------------------------------------------------------
// PULSE DESIGN SYSTEM — SafeScreen
//
// Canonical safe-area wrapper. EVERY screen root should be wrapped in
// <SafeScreen> so content is never drawn under the status bar / battery icon,
// the home indicator, or (on web) the browser chrome.
//
// Why a wrapper instead of relying on the system: expo-router's <Stack> is not
// wrapped in a SafeAreaView at the root layout, so each route is responsible for
// its own insets. SafeScreen centralises that responsibility so it can't be
// forgotten (the original cause of the feed/explore top bars being hidden
// under the battery icon).
//
// Defaults:
//   - edges: ["top", "bottom"]  (the two insets that matter on mobile)
//   - background: bg-bg / dark:bg-[#0A0F1E]  (matches the app surface)
//
// On tab screens the TabBar already reserves the bottom inset, so pass
// edges={["top"]} there to avoid double padding (matches clubs/events/discover).
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { cn } from "@/utils/format";
import type { ViewStyle } from "react-native";

export type SafeScreenProps = {
  children: ReactNode;
  /** Extra tailwind className (merges with defaults). */
  className?: string;
  /** Which edges to pad. Defaults to top + bottom. */
  edges?: Edge[];
  /** Inline style override. */
  style?: ViewStyle;
};

export function SafeScreen({
  children,
  className,
  edges = ["top", "bottom"],
  style,
}: SafeScreenProps) {
  return (
    <SafeAreaView
      className={cn("flex-1 bg-bg dark:bg-[#0A0F1E]", className)}
      edges={edges}
      style={style}
    >
      {children}
    </SafeAreaView>
  );
}
