// ---------------------------------------------------------------------------
// PULSE — EventCard loading skeleton
//
// Mirrors the compact EventCard (thumb + title + badge chips + date/city +
// price/stars row + trailing favorite/share) and the grid tile, so the list
// keeps its shape while events load.
// ---------------------------------------------------------------------------
import React from "react";
import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";

export function EventCardSkeleton() {
  return (
    <View
      className="flex-row bg-surface dark:bg-surface-dark rounded-2xl p-3 mb-3 border border-border dark:border-border-dark"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Skeleton className="w-12 h-12 rounded-xl" />
      <View className="flex-1 ml-3 gap-2">
        <Skeleton className="w-3/4 h-4 rounded-sm" />
        <View className="flex-row gap-2">
          <Skeleton className="w-16 h-5 rounded-full" />
          <Skeleton className="w-12 h-5 rounded-full" />
        </View>
        <Skeleton className="w-1/2 h-3 rounded-sm" />
        <View className="flex-row items-center justify-between mt-1">
          <Skeleton className="w-14 h-3 rounded-sm" />
          <Skeleton className="w-20 h-3 rounded-sm" />
        </View>
      </View>
      <View className="items-end justify-between gap-3">
        <Skeleton className="w-6 h-6 rounded-full" />
        <Skeleton className="w-6 h-6 rounded-full" />
      </View>
    </View>
  );
}

/** Portrait tile matching EventCardGrid's aspect for the grid view. */
export function EventCardGridSkeleton() {
  return (
    <View
      className="px-1"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden mb-2">
        <Skeleton className="w-full h-32 rounded-none" />
        <View className="p-3 gap-2">
          <Skeleton className="w-3/4 h-4 rounded-sm" />
          <Skeleton className="w-1/2 h-3 rounded-sm" />
        </View>
      </View>
    </View>
  );
}