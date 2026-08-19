import React, { useCallback } from "react";
import { View, ScrollView } from "react-native";
import type { FeedPost } from "@/types";
import { PostCard } from "./PostCard";
import { useFeedLayout, type GridRow } from "@/hooks/useFeedLayout";

type Props = {
  posts: FeedPost[];
  viewMode: "list" | "grid";
  screenWidth: number;
};

export function FeedGrid({ posts, viewMode, screenWidth }: Props) {
  const { registerHeight, cellWidth, rows } = useFeedLayout(
    posts,
    viewMode,
    screenWidth
  );

  const handlePostLayout = useCallback(
    (postId: string) => (event: any) => {
      const { height } = event.nativeEvent.layout;
      registerHeight(postId, height);
    },
    [registerHeight]
  );

  if (viewMode === "list" || rows.length === 0) {
    return null;
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 32,
        maxWidth: screenWidth,
        alignSelf: "center",
        width: "100%",
      }}
      showsVerticalScrollIndicator={false}
    >
      {rows.map((row: GridRow, rowIndex: number) => {
        const isSingleColumn = row.columnCount === 1;
        const cellStyle = {
          width: isSingleColumn ? "100%" : cellWidth,
          flex: isSingleColumn ? 1 : 0,
        };

        return (
          <View
            key={rowIndex}
            className="flex-row gap-3 mb-3 w-full"
            style={{
              justifyContent:
                row.columnCount < 3 ? "flex-start" : "space-between",
            }}
          >
            {row.posts.map((post) => (
              <View
                key={post.id}
                className={isSingleColumn ? "flex-1" : ""}
                style={isSingleColumn ? {} : { width: cellWidth }}
                onLayout={handlePostLayout(post.id)}
              >
                <PostCard post={post} />
              </View>
            ))}

            {/* Empty spacer cells to maintain grid alignment */}
            {row.columnCount >= 3 &&
              Array.from({ length: 3 - row.columnCount }).map((_, i) => (
                <View
                  key={`spacer-${i}`}
                  style={{ width: cellWidth }}
                />
              ))}
          </View>
        );
      })}
    </ScrollView>
  );
}