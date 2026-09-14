/**
 * Focused feed-pagination tests: page progression, end-of-list, dedupe,
 * refresh reset. Supabase is fully mocked — no network.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { FEED_PAGE_SIZE, mergeFeedPages, useFeed } from "@/hooks/useFeed";

type MockRow = { id: string; author_id: string; title: string; created_at: string };

function mockToDbRow(r: MockRow) {
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

function mockChainFor() {
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
  chain.then = (resolve: any) => {
    const rows = mockState.pages[Math.min(mockState.callIndex, mockState.pages.length - 1)] ?? [];
    mockState.callIndex += 1;
    return Promise.resolve({ data: rows.map(mockToDbRow), error: null }).then(resolve);
  };
  return chain;
}

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "posts") return mockChainFor();
      // blocked_users / post_likes / follows lookups: empty results
      const c: any = {};
      c.select = () => c;
      c.eq = () => c;
      c.in = () => c;
      c.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
      return c;
    },
  },
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: any) => selector({ userId: null }),
}));

function wrap() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function makeRows(count: number, baseIndex = 0): MockRow[] {
  return Array.from({ length: count }, (_, i) => {
    const n = baseIndex + i;
    return {
      id: `p${n}`,
      author_id: "a1",
      title: `Post ${n}`,
      created_at: new Date(Date.UTC(2026, 8, 14, 12, 0, 0) - n * 1000).toISOString(),
    };
  });
}

describe("useFeed pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.pages = [];
    mockState.callIndex = 0;
    mockState.orCalls = [];
  });

  it("a page shorter than FEED_PAGE_SIZE means end of list (no nextCursor)", async () => {
    mockState.pages = [makeRows(FEED_PAGE_SIZE - 1)];
    const { result } = renderHook(() => useFeed(null, { type: "for-you" }), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.pages).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("a full page yields a nextCursor and fetchNextPage loads the second page", async () => {
    mockState.pages = [makeRows(FEED_PAGE_SIZE + 1), makeRows(5, FEED_PAGE_SIZE + 1)];
    const { result } = renderHook(() => useFeed(null, { type: "for-you" }), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // +1 lookahead probe row is trimmed
    expect(result.current.data!.pages[0]!.items).toHaveLength(FEED_PAGE_SIZE);
    expect(result.current.hasNextPage).toBe(true);
    // First page has no cursor → no keyset predicate was sent
    expect(mockState.orCalls).toHaveLength(0);

    await act(async () => { await result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.data!.pages).toHaveLength(2));
    expect(result.current.data!.pages[1]!.items.map((p: any) => p.id)).toEqual(
      makeRows(5, FEED_PAGE_SIZE + 1).map((r) => r.id)
    );
    // Page 2 was fetched with the keyset cursor of the last page-1 item
    const last = result.current.data!.pages[0]!.items[FEED_PAGE_SIZE - 1]!;
    const cursorExpr = mockState.orCalls[mockState.orCalls.length - 1];
    expect(cursorExpr).toContain(last.created_at);
    expect(cursorExpr).toContain(last.id);
    // Both pages flattened via mergeFeedPages keep order without duplicates
    const flat = mergeFeedPages(result.current.data!.pages);
    expect(flat).toHaveLength(FEED_PAGE_SIZE + 5);
  });

  it("dedupes overlapping rows across pages (mergeFeedPages)", () => {
    const page1: any = { items: makeRows(3), nextCursor: { created_at: "2026-09-14T00:00:00Z", id: "p2" } };
    const page2: any = { items: [...makeRows(3), ...makeRows(2, 3)], nextCursor: null };
    const flat = mergeFeedPages([page1, page2]);
    expect(flat.map((p) => p.id)).toEqual(["p0", "p1", "p2", "p3", "p4"]);
  });

  it("refresh resets to the first page (pages collapse to one, fresh data)", async () => {
    mockState.pages = [makeRows(FEED_PAGE_SIZE + 1), makeRows(3, FEED_PAGE_SIZE + 1)];
    const { result, rerender } = renderHook(() => useFeed(null, { type: "for-you" }), { wrapper: wrap() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => { await result.current.fetchNextPage(); });
    // The RNTL observer can miss the query-cache notification after
    // fetchNextPage; an explicit rerender flushes the new pages into it.
    await act(async () => { rerender({} as never); });
    await waitFor(() => expect(result.current.data!.pages).toHaveLength(2));

    // New content arrives; a refresh must return exactly one fresh page.
    mockState.pages = [[{ id: "n", author_id: "a1", title: "n", created_at: "2026-09-11T12:00:00Z" }]];
    mockState.callIndex = 0;
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.data!.pages).toHaveLength(1));
    const pages = result.current.data!.pages;
    expect(pages).toHaveLength(1);
    expect(pages[0]!.items[0]!.id).toBe("n");
  });
});
