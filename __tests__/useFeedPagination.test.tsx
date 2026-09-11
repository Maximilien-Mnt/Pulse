/**
 * Focused feed-pagination tests: page progression, end-of-list, dedupe,
 * refresh reset. Supabase is fully mocked — no network.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import React from "react";

type MockRow = { id: string; author_id: string; title: string; created_at: string };

function toDbRow(r: MockRow) {
  return {
    ...r, body: null, format: "text", media_urls: [], tags: [],
    likes_count: 0, comments_count: 0, shares_count: 0,
    updated_at: r.created_at, video_url: null, video_thumbnail: null,
    video_duration: null,
    author: { id: "a1", full_name: "A", username: "a", avatar_url: null },
  };
}

const mockState = {
  pages: [] as MockRow[][],
  callIndex: 0,
  orCalls: [] as string[],
};

function chainFor(rows: MockRow[]) {
  const chain: any = {};
  chain.select = () => chain;
  chain.order = () => chain;
  chain.limit = () => chain;
  chain.contains = () => chain;
  chain.in = () => chain;
  chain.not = () => chain;
  chain.lt = () => chain;
  chain.eq = () => chain;
  chain.or = (expr: string) => { mockState.orCalls.push(expr); return chain; };
  chain.then = (resolve: any) =>
    Promise.resolve({ data: rows.map(toDbRow), error: null }).then(resolve);
  return chain;
}

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      const st = (jest as any).mockFeedState as typeof mockState;
      if (table === "posts") {
        const rows = st.pages[Math.min(st.callIndex++, st.pages.length - 1)] ?? [];
        return (jest as any).mockChainFor(rows);
      }
      return (jest as any).mockChainFor([]);
    },
  },
}));

jest.mock("@/stores/authStore", () => ({ useAuthStore: () => null }));

import { FEED_PAGE_SIZE, mergeFeedPages, useFeed } from "@/hooks/useFeed";

(jest as any).mockFeedState = mockState;
(jest as any).mockChainFor = chainFor;
(global as any).__DEV__ = false;

function page1(): MockRow[] {
  return Array.from({ length: 26 }, (_, i) => ({
    id: `p${String(26 - i).padStart(2, "0")}`,
    author_id: "a1",
    title: `post ${26 - i}`,
    created_at: `2026-09-${String(10 - Math.floor(i / 10)).padStart(2, "0")}T12:00:00.000Z`,
  }));
}

const page2: MockRow[] = [
  { id: "p02", author_id: "a1", title: "post 2", created_at: "2026-09-08T12:00:00.000Z" },
  { id: "p01", author_id: "a1", title: "post 1", created_at: "2026-09-09T12:00:00.000Z" },
  { id: "p00", author_id: "a1", title: "post 0", created_at: "2026-09-09T12:00:00.000Z" },
];

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const W = (p: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{p.children}</QueryClientProvider>
  );
  return W;
}

beforeEach(() => {
  mockState.pages = [page1(), page2];
  mockState.callIndex = 0;
  mockState.orCalls = [];
});

describe("feed pagination", () => {
  it("fetches a bounded page of 25 with lookahead cursor", async () => {
    expect(FEED_PAGE_SIZE).toBe(25);
    const { result } = renderHook(() => useFeed(null, { type: "for-you" }), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data!.pages[0]!;
    expect(first.items).toHaveLength(25);
    expect(first.nextCursor).toEqual({
      created_at: first.items[24]!.created_at,
      id: first.items[24]!.id,
    });
    expect(result.current.hasNextPage).toBe(true);
  });

  it("pages with composite cursor and ends cleanly", async () => {
    const { result } = renderHook(() => useFeed(null, { type: "for-you" }), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    act(() => { void result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.data!.pages).toHaveLength(2));
    expect(mockState.orCalls.length).toBe(1);
    expect(mockState.orCalls[0]).toMatch(/created_at/);
    expect(mockState.orCalls[0]).toMatch(/id/);
    const pages = result.current.data!.pages;
    expect(pages).toHaveLength(2);
    expect(pages[1]!.nextCursor).toBeNull();
    expect(result.current.hasNextPage).toBe(false);
    const ids = mergeFeedPages(pages).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(27); // 25 + 3, with p02 probe overlap deduped
  });

  it("mergeFeedPages dedupes and tolerates deleted rows", () => {
    const mk = (id: string) => ({ id }) as any;
    const out = mergeFeedPages([
      { items: [mk("a"), mk("b")], nextCursor: null },
      { items: [mk("b"), mk("c")], nextCursor: null },
    ]);
    expect(out.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(mergeFeedPages([{ items: [], nextCursor: null }])).toEqual([]);
  });

  it("refresh resets to the first page", async () => {
    const { result } = renderHook(() => useFeed(null, { type: "for-you" }), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    act(() => { void result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.data!.pages).toHaveLength(2));
    mockState.pages = [[{ id: "n", author_id: "a1", title: "n", created_at: "2026-09-11T12:00:00Z" }]];
    mockState.callIndex = 0;
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.data!.pages).toHaveLength(1));
    const pages = result.current.data!.pages;
    expect(pages).toHaveLength(1);
    expect(pages[0]!.items[0]!.id).toBe("n");
  });
});
