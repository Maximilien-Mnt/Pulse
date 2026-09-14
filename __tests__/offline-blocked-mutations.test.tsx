// PULSE - blocked destructive mutations when offline.
import { renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useDeleteClub } from "@/hooks/useDeleteClub";
import { useLeaveClub } from "@/hooks/useLeaveClub";
import { useBlockUser } from "@/hooks/useBlockUser";
import { useReport } from "@/hooks/useReport";
import { useDeleteAccount } from "@/hooks/useDeleteAccount";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import { translations } from "@/lib/translations";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/offline/useOnlineStatus", () => ({
  useOnlineStatus: jest.fn(),
}));

function makeChain(final: any) {
  const chain: any = {};
  chain.delete = jest.fn().mockReturnValue(chain);
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(final);
  chain.single = jest.fn().mockResolvedValue(final);
  return chain;
}

jest.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: jest.fn().mockResolvedValue({ error: null }),
    auth: { signOut: jest.fn().mockResolvedValue({ error: null }) },
    from: jest.fn(),
  },
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: Object.assign(jest.fn(() => "user-123"), {
    getState: () => ({ userId: "user-123" }),
  }),
}));

jest.mock("@/stores/signupStore", () => ({
  useSignupStore: {
    getState: () => ({ reset: jest.fn().mockResolvedValue(undefined) }),
  },
}));

jest.mock("posthog-react-native", () => ({
  usePostHog: () => ({ capture: jest.fn() }),
}));

jest.mock("react-native-toast-message", () => ({ show: jest.fn() }));

const fr = translations.fr;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

function setOnline(online: boolean) {
  (useOnlineStatus as jest.Mock).mockReturnValue({
    online,
    transitionedAt: Date.now(),
  });
}

describe("offline blocked destructive mutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue(
      makeChain({ data: { id: "row-1" }, error: null })
    );
  });

  it("deleteClub + leaveClub refuse offline, proceed online", async () => {
    setOnline(false);
    const del = renderHook(() => useDeleteClub(), { wrapper: makeWrapper() });
    await expect(
      del.result.current.mutateAsync(["club-1", "Le Club"] as any)
    ).rejects.toThrow(fr["offline.deleteClub"]);

    const leave = renderHook(() => useLeaveClub(), { wrapper: makeWrapper() });
    const leaveArgs = { clubId: "club-1", clubName: "A", creatorId: "c-1" };
    await expect(
      leave.result.current.mutateAsync(leaveArgs as any)
    ).rejects.toThrow(fr["offline.leaveClub"]);

    setOnline(true);
    const delOn = renderHook(() => useDeleteClub(), { wrapper: makeWrapper() });
    await expect(
      delOn.result.current.mutateAsync(["club-1", "Le Club"] as any)
    ).resolves.toEqual({ ok: true });
    expect(supabase.rpc).toHaveBeenCalled();
  });

  it("blockUser refuses offline without API call, proceeds online", async () => {
    setOnline(false);
    const blocked = renderHook(() => useBlockUser(), { wrapper: makeWrapper() });
    await expect(
      blocked.result.current.mutateAsync({ userId: "target-1" } as any)
    ).rejects.toThrow(fr["offline.blockUser"]);
    expect(supabase.from).not.toHaveBeenCalled();

    setOnline(true);
    const online = renderHook(() => useBlockUser(), { wrapper: makeWrapper() });
    await expect(
      online.result.current.mutateAsync({ userId: "target-1" } as any)
    ).resolves.toBeTruthy();
    expect(supabase.from).toHaveBeenCalled();
  });

  it("report + deleteAccount refuse offline, proceed online", async () => {
    setOnline(false);
    const rep = renderHook(() => useReport(), { wrapper: makeWrapper() });
    const repArgs = { targetType: "post", targetId: "p-1", targetAuthorId: "u-1" };
    await expect(
      rep.result.current.mutateAsync(repArgs as any)
    ).rejects.toThrow(fr["offline.report"]);

    const delAcc = renderHook(() => useDeleteAccount(), { wrapper: makeWrapper() });
    await expect(
      delAcc.result.current.mutateAsync("password123")
    ).rejects.toThrow(fr["offline.deleteAccount"]);
    expect(supabase.rpc).not.toHaveBeenCalled();

    setOnline(true);
    const repOn = renderHook(() => useReport(), { wrapper: makeWrapper() });
    await expect(
      repOn.result.current.mutateAsync(repArgs as any)
    ).resolves.toBeUndefined();

    const delOn = renderHook(() => useDeleteAccount(), { wrapper: makeWrapper() });
    await expect(delOn.result.current.mutateAsync("password123")).resolves.toBeUndefined();
    expect(supabase.rpc).toHaveBeenCalledWith("delete_my_account", {
      p_password: "password123",
    });
  });
});
