import { create } from "zustand";

export type FeedFilter =
  | { type: "for-you" }
  | { type: "following" }
  | { type: "sport"; sport: string }
  | { type: "tag"; tag: string };

type FeedState = {
  activeTag: string | null | undefined;
  setActiveTag: (tag: string | null | undefined) => void;
  filter: FeedFilter;
  setFilter: (filter: FeedFilter) => void;
  viewMode: "list" | "grid";
  setViewMode: (mode: "list" | "grid") => void;
  selectedPostId: string | null;
  setSelectedPostId: (postId: string | null) => void;
};

export const useFeedStore = create<FeedState>((set) => ({
  activeTag: null,
  setActiveTag: (activeTag) => set({ activeTag }),
  filter: { type: "for-you" },
  setFilter: (filter) => set({ filter }),
  viewMode: "list",
  setViewMode: (viewMode) => set({ viewMode }),
  selectedPostId: null,
  setSelectedPostId: (selectedPostId) => set({ selectedPostId }),
}));
