import { useState, useEffect, useMemo, useCallback } from "react";
import { Dimensions } from "react-native";
import type { FeedPost } from "@/types";

type ViewMode = "list" | "grid";

export type PostHeightMap = Record<string, number>;

export type GridRow = {
  posts: FeedPost[];
  columnCount: number;
};

const GRID_MIN_WIDTH = 768;
const GAP = 12;
const PADDING = 16;

function getNumColumns(width: number, maxColumns: number): number {
  if (width < GRID_MIN_WIDTH) return 1;
  if (width < 1024) return Math.min(2, maxColumns);
  if (width < 1280) return Math.min(3, maxColumns);
  if (width < 1536) return Math.min(4, maxColumns);
  return Math.min(5, maxColumns);
}

function getCellWidth(totalWidth: number, columns: number): number {
  return (totalWidth - PADDING * 2 - GAP * (columns - 1)) / columns;
}

export function useFeedLayout(
  posts: FeedPost[],
  viewMode: ViewMode,
  screenWidth: number,
  maxColumns = 3
) {
  const [postHeights, setPostHeights] = useState<PostHeightMap>({});

  const registerHeight = useCallback((postId: string, height: number) => {
    setPostHeights((prev) => {
      if (prev[postId] === height) return prev;
      return { ...prev, [postId]: height };
    });
  }, []);

  const columns = useMemo(
    () => (viewMode === "grid" ? getNumColumns(screenWidth, maxColumns) : 1),
    [viewMode, screenWidth, maxColumns]
  );

  const cellWidth = useMemo(
    () =>
      viewMode === "grid"
        ? getCellWidth(screenWidth, columns)
        : screenWidth - PADDING * 2,
    [viewMode, screenWidth, columns]
  );

  const rows = useMemo((): GridRow[] => {
    if (viewMode !== "grid" || columns <= 1) {
      return posts.map((post) => ({ posts: [post], columnCount: 1 }));
    }

    const result: GridRow[] = [];
    let currentRow: FeedPost[] = [];
    let currentRowHeight = 0;
    let currentColumns = 1;

    const estimatePostHeight = (post: FeedPost): number => {
      const measured = postHeights[post.id];
      if (measured) return measured;

      let h = 120; // header + padding
      if (post.title) h += 40;
      if (post.body) {
        const bodyLen = post.body.length;
        if (bodyLen > 280) h += 80;
        else if (bodyLen > 100) h += 50;
        else h += 30;
      }
      if (post.media_urls && post.media_urls.length > 0) {
        h += (cellWidth * 9) / 16 + 16;
      }
      h += 60; // actions
      return h;
    };

    const tryFit = (post: FeedPost): boolean => {
      if (currentRow.length === 0) return true;
      if (currentColumns >= columns) return false;

      const testPosts = [...currentRow, post];
      const maxH = Math.max(...testPosts.map(estimatePostHeight));
      const rowHeight = maxH + 8;

      return rowHeight <= 720; // max row height threshold
    };

    for (const post of posts) {
      const postH = estimatePostHeight(post);
      const hasMedia = post.media_urls && post.media_urls.length > 0;

      if (hasMedia && currentRow.length === 0) {
        currentRow.push(post);
        currentRowHeight = postH;
        currentColumns = 1;
        continue;
      }

      if (tryFit(post)) {
        currentRow.push(post);
        currentColumns = currentRow.length;
        currentRowHeight = Math.max(currentRowHeight, postH);
      } else {
        if (currentRow.length > 0) {
          result.push({ posts: currentRow, columnCount: currentColumns });
        }
        currentRow = [post];
        currentColumns = 1;
        currentRowHeight = postH;
      }
    }

    if (currentRow.length > 0) {
      result.push({ posts: currentRow, columnCount: currentColumns });
    }

    return result;
  }, [posts, viewMode, columns, postHeights, cellWidth]);

  useEffect(() => {
    setPostHeights({});
  }, [posts]);

  return {
    registerHeight,
    postHeights,
    columns,
    cellWidth,
    rows,
    isGridAvailable: screenWidth >= GRID_MIN_WIDTH,
  };
}