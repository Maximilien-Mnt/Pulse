// ---------------------------------------------------------------------------
// PULSE — Offline render tests
//
// Verifies that the OfflineBanner renders when offline, hides when online,
// and that its retry button triggers the expected invalidation path.
// ---------------------------------------------------------------------------

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import { queryClient } from "@/lib/queryClient";
import { translations } from "@/lib/translations";

jest.mock("@/lib/offline/useOnlineStatus", () => ({
  useOnlineStatus: jest.fn(),
}));

jest.mock("@/lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

const fr = translations.fr;

describe("OfflineBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when online", () => {
    (useOnlineStatus as jest.Mock).mockReturnValue({ online: true, transitionedAt: null });

    const { queryByRole } = render(<OfflineBanner />);
    // The banner returns null when online, so there should be no text from it.
    expect(queryByRole("banner")).toBeNull();
  });

  it("renders the offline banner when offline", () => {
    (useOnlineStatus as jest.Mock).mockReturnValue({ online: false, transitionedAt: Date.now() });

    const { getByText } = render(<OfflineBanner />);

    expect(getByText(fr["offline.banner.title"])).toBeTruthy();
    expect(getByText(fr["offline.banner.body"])).toBeTruthy();
  });

  it("calls invalidateQueries for read-only prefixes when retry is pressed", () => {
    (useOnlineStatus as jest.Mock).mockReturnValue({ online: false, transitionedAt: Date.now() });

    const { getByText } = render(<OfflineBanner />);

    fireEvent.press(getByText(fr["offline.banner.retryLabel"]));

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["feed"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["clubs"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["events"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["profile"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["public-profile"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(5);
  });
});
