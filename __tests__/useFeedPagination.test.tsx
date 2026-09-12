/**
 * Focused feed-pagination tests: page progression, end-of-list, dedupe,
 * refresh reset. Supabase is fully mocked — no network.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import React

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
