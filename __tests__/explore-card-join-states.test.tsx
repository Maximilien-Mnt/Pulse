// ---------------------------------------------------------------------------
// PULSE EXPLORE — Club/Event card join states (integration)
//
// The footer unit test pins the box model of <CardJoinFooter>. This suite
// pins the *wiring*: every Club/Event card layout (grid, list-wide with the
// cover on the right, list-narrow with the cover on top) renders the same
// footer box model for each membership state, so the CTA never changes size
// or alignment when the user moves between layouts or states.
//
// Layout is driven by the window width (breakpoint at 700px) which is set
// through the public Dimensions API so no component internals are stubbed.
// ---------------------------------------------------------------------------

import React from "react";
import { Dimensions } from "react-native";
import { act, render } from "@testing-library/react-native";
import { ClubCard } from "@/components/explore/ClubCard";
import { EventCard } from "@/components/explore/EventCard";

let mockJoinStatus = { isMember: false, isPending: false };

jest.mock("@/hooks/useJoinRequestStatus", () => ({
  useJoinRequestStatus: () => ({ data: mockJoinStatus, isLoading: false }),
  deriveStatus: (isMember: boolean, isPending: boolean) =>
    isMember ? "member" : isPending ? "pending" : "none",
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (state: { userId: string }) => unknown) =>
    selector({ userId: "user-1" }),
}));

jest.mock("@/hooks/useToggleFavorite", () => ({
  useToggleFavorite: () => ({ isFavorited: false, isPending: false, toggle: jest.fn() }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

// Labels are asserted as keys/raw strings, so the translator is identity here.
jest.mock("@/hooks/useTranslation", () => ({
  t: (key: string) => key,
  useTranslation: () => ({ t: (key: string) => key, tp: (k: string) => k, language: "fr" }),
}));

/**
 * Drives the `width - 32 > 700` breakpoint in the cards through the public
 * Dimensions API (no component internals stubbed).
 */
function setWindowWidth(width: number) {
  act(() => {
    Dimensions.set({
      window: { width, height: 800, scale: 1, fontScale: 1 },
      screen: { width, height: 800, scale: 1, fontScale: 1 },
    } as never);
  });
}

beforeEach(() => {
  mockJoinStatus = { isMember: false, isPending: false };
  setWindowWidth(400);
});

const club = {
  id: "club-1",
  name: "Pulse Running Club",
  sport: "Running",
  logo_url: null,
  hero_urls: [],
  member_count: 42,
  is_external: false,
  creator: { id: "user-1", full_name: "Ada", username: "ada" },
};

const event = {
  id: "event-1",
  name: "Morning Run",
  sport: "Running",
  start_date: "2026-03-01T08:00:00.000Z",
  logo_url: null,
  cover_url: null,
  hero_urls: [],
  participant_count: 12,
  difficulty: 2,
  is_external: false,
  creator: { id: "user-1", full_name: "Ada", username: "ada" },
};

const BOX_MODEL = ["w-full", "h-12", "flex-row", "items-center", "justify-center"];

interface ClassNode {
  props: Record<string, unknown>;
  parent: ClassNode | null;
}

/**
 * Walks up from a label node to the closest ancestor carrying the shared
 * footer height (h-12) and returns its className. Walking (instead of reading
 * the direct parent) keeps the test agnostic to the css-interop wrapper layers
 * that `Text`/`Button` render. Throws when no footer box model exists at all,
 * so a missing footer fails loudly rather than silently passing.
 */
function footerClassOf(labelNode: unknown): string {
  let current = labelNode as ClassNode | null;
  while (current) {
    const className = typeof current.props.className === "string" ? current.props.className : "";
    if (className.split(/\s+/).includes("h-12")) return className;
    current = current.parent;
  }
  throw new Error("no ancestor with the shared h-12 footer box model");
}

describe("Explore card join states — unified footer", () => {
  describe("ClubCard", () => {
    it("renders the success member row in grid mode", () => {
      mockJoinStatus = { isMember: true, isPending: false };
      const { getByText } = render(<ClubCard club={club} grid />);

      const className = footerClassOf(getByText("Membre"));
      for (const token of BOX_MODEL) expect(className).toContain(token);
      expect(className).toContain("bg-success/10");
    });

    it("renders the neutral pending row in grid mode", () => {
      mockJoinStatus = { isMember: false, isPending: true };
      const { getByText } = render(<ClubCard club={club} grid />);

      const className = footerClassOf(getByText("Demande envoyée"));
      for (const token of BOX_MODEL) expect(className).toContain(token);
      expect(className).toContain("bg-neutral-100");
    });

    it("renders the join Button in grid mode", () => {
      const { getByText } = render(<ClubCard club={club} grid />);

      const className = footerClassOf(getByText("common.join"));
      for (const token of BOX_MODEL) expect(className).toContain(token);
    });

    it("keeps the same box model in the wide list layout (cover on the right)", () => {
      setWindowWidth(1200);
      mockJoinStatus = { isMember: false, isPending: true };
      const { getByText } = render(<ClubCard club={club} isCompact />);

      const className = footerClassOf(getByText("Demande envoyée"));
      for (const token of BOX_MODEL) expect(className).toContain(token);
    });

    it("keeps the same box model in the narrow list layout (cover on top)", () => {
      setWindowWidth(400);
      mockJoinStatus = { isMember: true, isPending: false };
      const { getByText } = render(<ClubCard club={club} isCompact />);

      const className = footerClassOf(getByText("Membre"));
      for (const token of BOX_MODEL) expect(className).toContain(token);
    });

    it("labels the join CTA with the registration label for external clubs", () => {
      const { getByText } = render(<ClubCard club={{ ...club, is_external: true }} grid />);

      // External clubs never offer an in-app join: the CTA registers instead.
      expect(getByText("common.register")).toBeTruthy();
    });
  });

  describe("EventCard", () => {
    it("renders the 'Inscrit' member row in grid mode", () => {
      mockJoinStatus = { isMember: true, isPending: false };
      const { getByText } = render(<EventCard event={event} grid />);

      const className = footerClassOf(getByText("Inscrit"));
      for (const token of BOX_MODEL) expect(className).toContain(token);
      expect(className).toContain("bg-success/10");
    });

    it("renders the neutral pending row in grid mode", () => {
      mockJoinStatus = { isMember: false, isPending: true };
      const { getByText } = render(<EventCard event={event} grid />);

      const className = footerClassOf(getByText("Demande envoyée"));
      for (const token of BOX_MODEL) expect(className).toContain(token);
      expect(className).toContain("bg-neutral-100");
    });

    it("renders the 'Participer' join Button in grid mode", () => {
      const { getByText } = render(<EventCard event={event} grid />);

      const className = footerClassOf(getByText("Participer"));
      for (const token of BOX_MODEL) expect(className).toContain(token);
    });

    it("keeps the same box model in the wide list layout (cover on the right)", () => {
      setWindowWidth(1200);
      mockJoinStatus = { isMember: true, isPending: false };
      const { getByText } = render(<EventCard event={event} isCompact />);

      const className = footerClassOf(getByText("Inscrit"));
      for (const token of BOX_MODEL) expect(className).toContain(token);
    });

    it("keeps the same box model in the narrow list layout (cover on top)", () => {
      setWindowWidth(400);
      mockJoinStatus = { isMember: false, isPending: true };
      const { getByText } = render(<EventCard event={event} isCompact />);

      const className = footerClassOf(getByText("Demande envoyée"));
      for (const token of BOX_MODEL) expect(className).toContain(token);
    });
  });
});