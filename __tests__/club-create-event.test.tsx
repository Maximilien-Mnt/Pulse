import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useCanCreateClubEvent } from "@/hooks/useCanCreateClubEvent";

jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));
import { supabase } from "@/lib/supabase";

jest.mock("@/stores/authStore", () => ({
  useAuthStore: jest.fn(),
}));
import { useAuthStore } from "@/stores/authStore";

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function mockRole(role: string | null) {
  (supabase.from as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: role ? { role } : null, error: null }),
        }),
      }),
    }),
  });
}

const OWNER = "owner-id";
const CLUB = "club-id";

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ userId: "user-1" }),
  );
});

test("club owner can create without a membership lookup", () => {
  (useAuthStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ userId: OWNER }),
  );
  const { result } = renderHook(() => useCanCreateClubEvent(CLUB, OWNER), {
    wrapper: wrapper(),
  });
  expect(result.current).toBe(true);
  expect(supabase.from).not.toHaveBeenCalled();
});

test("admin member can create", async () => {
  mockRole("admin");
  const { result } = renderHook(() => useCanCreateClubEvent(CLUB, OWNER), {
    wrapper: wrapper(),
  });
  await waitFor(() => expect(result.current).toBe(true));
});

test("legacy owner role can create", async () => {
  mockRole("owner");
  const { result } = renderHook(() => useCanCreateClubEvent(CLUB, OWNER), {
    wrapper: wrapper(),
  });
  await waitFor(() => expect(result.current).toBe(true));
});

test("ordinary member cannot create", async () => {
  mockRole("member");
  const { result } = renderHook(() => useCanCreateClubEvent(CLUB, OWNER), {
    wrapper: wrapper(),
  });
  await waitFor(() => expect(result.current).toBe(false));
});

test("signed-out visitor cannot create", () => {
  (useAuthStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ userId: null }),
  );
  const { result } = renderHook(() => useCanCreateClubEvent(CLUB, OWNER), {
    wrapper: wrapper(),
  });
  expect(result.current).toBe(false);
});
