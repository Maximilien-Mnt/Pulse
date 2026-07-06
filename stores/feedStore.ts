import { create } from "zustand";

type FeedState = {
  activeTag: string | null;
  setActiveTag: (tag: string | null) => void;
};

export const useFeedStore = create<FeedState>((set) => ({
  activeTag: null,
  setActiveTag: (activeTag) => set({ activeTag }),
}));
