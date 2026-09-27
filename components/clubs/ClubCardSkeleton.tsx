// ---------------------------------------------------------------------------
// PULSE — ClubCard loading skeleton
//
// Mirrors the compact ClubCard layout (thumb + title + badge chips + meta line
// + trailing favorite/share) so the list doesn't reflow when data lands.
// ---------------------------------------------------------------------------
import React from "react";
import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";

export function ClubCardSkeleton() {
  return (
    <View
      className="flex-row bg-white dark:bg-neutral-800 rounded-2xl p-2 mb-2 border border-neutral-100 dark:border-neutral-700"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Skeleton className="w-12 h-12 rounded-xl" />
      <View className="flex-1 ml-3 gap-2">
        <Skeleton className="w-2/3 h-4 rounded-sm" />
        <View className="flex-row gap-2">
          <Skeleton className="w-16 h-5 rounded-full" />
          <Skeleton className="w-12 h-5 rounded-full" />
        </View>
        <Skeleton className="w-1/2 h-3 rounded-sm" />
      </View>
      <View className="items-end justify-between gap-3">
        <Skeleton className="w-6 h-6 rounded-full" />
        <Skeleton className="w-6 h-6 rounded-full" />
      </View>
    </View>
  );
}

/** A vertical stack of club-card placeholders for the initial list load. */
export function ClubCardListSkeleton({ count = 6, testID }: { count?: number; testID?: string }) {
  return (
    <View testID={testID} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }).map((_, i) => (
        <ClubCardSkeleton key={i} />
      ))}
    </View>
  );
}