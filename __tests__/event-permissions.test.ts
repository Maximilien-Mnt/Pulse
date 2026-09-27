// ---------------------------------------------------------------------------
// Event management rights — client mirror of the RLS policies in
// supabase/migrations/057.
//
// Managers are: the event creator, or the owner (`clubs.created_by`) /
// admin (`club_members.role = 'admin'`) of the club the event was published
// through (`publisher_club_id`, falling back to the legacy `club_id`).
// ---------------------------------------------------------------------------

import { renderHook } from "@testing-library/react-native";
import { assertCanManageEvent } from "@/lib/eventPermissions";
import { useCanManageEvent } from "@/hooks/useCanManageEvent";

type QueryResult = { data: unknown; error: unknown };

let mockEventResult: QueryResult;
let mockClubResult: QueryResult;
let mockMembershipResult: QueryResult;
let mockQueryResult: { data?: unknown; isLoading: boolean };
let mockQueryOptions: { enabled?: boolean; queryKey?: unknown[] } | undefined;
let mockUserId: string | null = "creator";

const mockChain = (result: QueryResult) => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.single = () => Promise.resolve(result);
  builder.maybeSingle = () => Promise.resolve(result);
  return builder;
};

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "events") return mockChain(mockEventResult);
      if (table === "clubs") return mockChain(mockClubResult);
      return mockChain(mockMembershipResult);
    },
  },
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: { enabled?: boolean; queryKey?: unknown[] }) => {
    mockQueryOptions = options;
    return mockQueryResult;
  },
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (state: { userId: string | null }) => unknown) =>
    selector({ userId: mockUserId }),
}));

const eventRow = {
  id: "event-1",
  created_by: "creator",
  name: "Sunday match",
  publisher_club_id: null as string | null,
  club_id: null as string | null,
};

beforeEach(() => {
  mockUserId = "creator";
  mockEventResult = { data: { ...eventRow }, error: null };
  mockClubResult = { data: { created_by: "owner" }, error: null };
  mockMembershipResult = { data: { role: "member" }, error: null };
  mockQueryResult = { data: undefined, isLoading: false };
  mockQueryOptions = undefined;
});

describe("assertCanManageEvent", () => {
  test("the creator manages their own event", async () => {
    await expect(assertCanManageEvent("event-1", "creator")).resolves.toMatchObject({
      id: "event-1",
    });
  });

  test("a member with no rights is rejected", async () => {
    await expect(assertCanManageEvent("event-1", "stranger")).rejects.toThrow("unauthorized");
  });

  test("the club owner manages an event published through the club", async () => {
    mockEventResult = {
      data: { ...eventRow, created_by: "someone-else", publisher_club_id: "club-1" },
      error: null,
    };
    mockClubResult = { data: { created_by: "owner" }, error: null };

    await expect(assertCanManageEvent("event-1", "owner")).resolves.toMatchObject({
      publisher_club_id: "club-1",
    });
  });

  test("a club admin manages an event published through the club", async () => {
    mockEventResult = {
      data: { ...eventRow, created_by: "someone-else", publisher_club_id: "club-1" },
      error: null,
    };
    mockClubResult = { data: { created_by: "owner" }, error: null };
    mockMembershipResult = { data: { role: "admin" }, error: null };

    await expect(assertCanManageEvent("event-1", "admin-1")).resolves.toMatchObject({
      id: "event-1",
    });
  });

  test("a plain club member cannot manage the club's event", async () => {
    mockEventResult = {
      data: { ...eventRow, created_by: "someone-else", publisher_club_id: "club-1" },
      error: null,
    };

    await expect(assertCanManageEvent("event-1", "member-1")).rejects.toThrow("unauthorized");
  });

  test("legacy club_id links grant the same rights as publisher_club_id", async () => {
    mockEventResult = {
      data: { ...eventRow, created_by: "someone-else", publisher_club_id: null, club_id: "club-1" },
      error: null,
    };
    mockClubResult = { data: { created_by: "owner" }, error: null };

    await expect(assertCanManageEvent("event-1", "owner")).resolves.toMatchObject({
      club_id: "club-1",
    });
  });

  test("a failed event lookup surfaces the underlying error", async () => {
    mockEventResult = { data: null, error: new Error("network") };

    await expect(assertCanManageEvent("event-1", "creator")).rejects.toThrow("network");
  });
});

describe("useCanManageEvent", () => {
  test("the creator is a manager without any club lookup", () => {
    const { result } = renderHook(() =>
      useCanManageEvent({ created_by: "creator", publisher_club_id: "club-1" }),
    );

    expect(result.current.canManage).toBe(true);
    expect(result.current.isCreator).toBe(true);
    expect(result.current.managingClubId).toBe("club-1");
    // The club role query stays disabled: the creator check is enough.
    expect(mockQueryOptions?.enabled).toBe(false);
  });

  test("a club admin is a manager once the role is loaded", () => {
    mockUserId = "admin-1";
    mockQueryResult = { data: { ownerId: "owner", role: "admin" }, isLoading: false };

    const { result } = renderHook(() =>
      useCanManageEvent({ created_by: "someone-else", publisher_club_id: "club-1" }),
    );

    expect(mockQueryOptions?.enabled).toBe(true);
    expect(result.current.canManage).toBe(true);
  });

  test("the club owner (clubs.created_by) is a manager", () => {
    mockUserId = "owner";
    mockQueryResult = { data: { ownerId: "owner", role: null }, isLoading: false };

    const { result } = renderHook(() =>
      useCanManageEvent({ created_by: "someone-else", publisher_club_id: "club-1" }),
    );

    expect(result.current.canManage).toBe(true);
  });

  test("a plain member is not a manager", () => {
    mockUserId = "member-1";
    mockQueryResult = { data: { ownerId: "owner", role: "member" }, isLoading: false };

    const { result } = renderHook(() =>
      useCanManageEvent({ created_by: "someone-else", publisher_club_id: "club-1" }),
    );

    expect(result.current.canManage).toBe(false);
  });

  test("the legacy club_id link is used when no publisher is set", () => {
    mockUserId = "admin-1";
    mockQueryResult = { data: { ownerId: "owner", role: "admin" }, isLoading: false };

    const { result } = renderHook(() =>
      useCanManageEvent({ created_by: "someone-else", publisher_club_id: null, club_id: "club-1" }),
    );

    expect(result.current.managingClubId).toBe("club-1");
    expect(mockQueryOptions?.queryKey).toContain("club-1");
    expect(result.current.canManage).toBe(true);
  });

  test("an event without a club is only manageable by its creator", () => {
    mockUserId = "stranger";

    const { result } = renderHook(() =>
      useCanManageEvent({ created_by: "creator", publisher_club_id: null, club_id: null }),
    );

    expect(result.current.canManage).toBe(false);
    expect(mockQueryOptions?.enabled).toBe(false);
  });

  test("no event means no rights", () => {
    const { result } = renderHook(() => useCanManageEvent(null));

    expect(result.current.canManage).toBe(false);
    expect(result.current.isCreator).toBe(false);
  });
});
