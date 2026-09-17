/**
 * Regression: a club's events list must show only events PUBLISHED as the club
 * (events.publisher_club_id), never every event merely linked to it
 * (events.club_id) — an event attached to a club by a different publisher is
 * not the club's event. See supabase/migrations/048_event_publishing_identity.
 *
 * Supabase is fully mocked — no network.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useClubEvents } from "@/hooks/useClubEvents";

type EqCall = [column: string, value: unknown];

const mockState = {
  eqCalls: [] as EqCall[],
  orderCalls: [] as [column: string, options: unknown][],
  rows: [] as any[],
};

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => {
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = (column: string, value: unknown) => {
        mockState.eqCalls.push([column, value]);
        return chain;
      };
      chain.order = (column: string, options: unknown) => {
        mockState.orderCalls.push([column, options]);
        return chain;
      };
      chain.then = (resolve: any) =>
        Promise.resolve({ data: mockState.rows, error: null }).then(resolve);
      return chain;
    },
  },
}));

function wrap() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const eventRow = {
  id: "e1",
  name: "Tournoi de printemps",
  sport: "Football",
  city: "Paris",
  start_date: "2026-10-01T10:00:00.000Z",
  logo_url: null,
  is_external: false,
  is_paid: false,
  price_cents: 0,
  difficulty: 3,
};

describe("useClubEvents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.eqCalls = [];
    mockState.orderCalls = [];
    mockState.rows = [];
  });

  it("filters on publisher_club_id and never on the club_id link", async () => {
    mockState.rows = [eventRow];

    const { result } = renderHook(() => useClubEvents("club-1"), {
      wrapper: wrap(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Filtering on `club_id` would surface every event linked to the club,
    // including ones published by someone else.
    expect(mockState.eqCalls).toEqual([["publisher_club_id", "club-1"]]);
    expect(mockState.eqCalls.map(([column]) => column)).not.toContain("club_id");
  });

  it("keeps the most-recent-start_date-first ordering", async () => {
    mockState.rows = [eventRow];

    const { result } = renderHook(() => useClubEvents("club-1"), {
      wrapper: wrap(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockState.orderCalls).toEqual([
      ["start_date", { ascending: false }],
    ]);
  });

  it("returns the fetched rows untouched", async () => {
    mockState.rows = [eventRow];

    const { result } = renderHook(() => useClubEvents("club-1"), {
      wrapper: wrap(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([eventRow]);
  });

  it("does not query without a clubId", async () => {
    const { result } = renderHook(() => useClubEvents(null), {
      wrapper: wrap(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockState.eqCalls).toHaveLength(0);
  });
});
