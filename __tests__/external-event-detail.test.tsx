// ---------------------------------------------------------------------------
// Event detail screen (app/(tabs)/events/[eventId].tsx) — external events
//
// Pins the external-event contract of the detail screen:
//   * the full external-source badge and a clickable source attribution link,
//   * the register action opens the registration URL (falling back to the
//     source page) and stays available under stale membership/pending/full
//     state — without ever creating an in-app join request,
//   * an unknown price renders as "check the price on the source", never free,
//   * no in-app participation is implied (no Places row for imported rows),
//   * internal events keep their existing Places row and join button.
// ---------------------------------------------------------------------------

import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EventDetailScreen from "@/app/(tabs)/events/[eventId]";

type TableResult = { data: unknown; error: unknown };

const mockTables: Record<string, TableResult> = {};
const mockInserts: string[] = [];
const mockJoinStatus = { isMember: false, isPending: false };
const mockCapture = jest.fn();
const mockOpenBrowserAsync = jest.fn(async (_url: string) => undefined);
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};

let mockUserId: string | null = "user-1";

const mockFrom = (table: string) => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = chain;
  builder.eq = chain;
  builder.neq = chain;
  builder.in = chain;
  builder.order = chain;
  builder.single = chain;
  builder.maybeSingle = chain;
  builder.insert = (payload: Record<string, unknown>) => {
    void payload;
    mockInserts.push(table);
    return builder;
  };
  // Every awaited builder resolves to the configured per-table result, like
  // the real postgrest builder (`await ...select(...).eq(...).maybeSingle()`).
  const result = mockTables[table] ?? { data: [], error: null };
  builder.then = (resolve: (value: TableResult) => unknown) => resolve(result);
  return builder;
};

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: jest.fn(async () => ({ data: null, error: null })),
  },
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (state: { userId: string | null }) => unknown) =>
    selector({ userId: mockUserId }),
}));

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ eventId: "event-1" }),
  useRouter: () => mockRouter,
  usePathname: () => "/events/event-1",
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key, tp: (key: string) => key, language: "fr" }),
  t: (key: string) => key,
}));

jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock("react-native-safe-area-context", () => {
  // Require inside the factory: the nativewind/css-interop transform rewrites
  // module-scope `React.createElement(<rn component>)` calls, which the jest
  // hoist guard then rejects inside mock factories.
  const ReactMock = require("react");
  const { View } = require("react-native");
  const SafeAreaProvider = ({ children }: { children?: unknown }) =>
    ReactMock.createElement(View, null, children);
  const SafeAreaView = (props: Record<string, unknown>) => ReactMock.createElement(View, props);
  return {
    SafeAreaProvider,
    SafeAreaView,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 0, height: 0 },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  };
});

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: (url: string) => mockOpenBrowserAsync(url),
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(async () => undefined),
}));

jest.mock("posthog-react-native", () => ({
  usePostHog: () => ({ capture: mockCapture }),
}));

jest.mock("@/hooks/useJoinRequestStatus", () => ({
  useJoinRequestStatus: () => ({ data: mockJoinStatus, isLoading: false }),
  deriveStatus: (isMember: boolean, isPending: boolean) =>
    isMember ? "member" : isPending ? "pending" : "none",
}));

jest.mock("@/hooks/useInvitations", () => ({
  useCreateInvitation: () => ({ mutate: jest.fn(), mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/useCanManageEvent", () => ({
  useCanManageEvent: () => ({ canManage: false }),
}));

jest.mock("@/lib/eventIdentity", () => ({
  attachEventCreators: jest.fn(async (rows: unknown[]) => rows),
}));

jest.mock("@/hooks/useToggleFavorite", () => ({
  useToggleFavorite: () => ({
    isFavorited: false,
    favCount: 0,
    isPending: false,
    toggle: jest.fn(),
  }),
}));

/** An OpenAgenda-imported row as the sync function writes it (price unknown). */
const externalEvent = {
  id: "event-1",
  name: "Trail night run",
  sport: "running",
  sports: ["running"],
  category: "course",
  short_description: "Night trail run through the forest",
  description: "Long description of the night trail run.",
  country: "LU",
  city: "Luxembourg",
  venue_address: null,
  postal_code: null,
  start_date: "2030-06-01T18:00:00.000Z",
  end_date: null,
  // Unknown price: the schema stores 0/false, the UI must not read it as free.
  price_cents: 0,
  is_paid: false,
  difficulty: 1,
  registration_url: "https://openagenda.example/lux/night-trail-run/register",
  is_external: true,
  source_url: "https://openagenda.example/lux/events/night-trail-run",
  source_name: "OpenAgenda",
  is_private: false,
  places_total: null,
  places_left: null,
  accepted_count: 0,
  created_by: null,
  publisher_club_id: null,
  club_id: null,
  logo_url: null,
  cover_url: null,
  hero_urls: [],
  required_level: null,
  required_levels: {},
  age_min: null,
  age_max: null,
  league: null,
  contact_email: null,
  website_url: null,
};

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EventDetailScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = "user-1";
  mockJoinStatus.isMember = false;
  mockJoinStatus.isPending = false;
  mockInserts.length = 0;
  Object.keys(mockTables).forEach((key) => delete mockTables[key]);
  mockTables.events = { data: { ...externalEvent }, error: null };
  mockTables.event_participants = { data: [], error: null };
  mockTables.profiles = { data: [], error: null };
});

test("an imported event shows the external badge, a clickable source link, and never implies in-app participation", async () => {
  const view = renderScreen();

  // Hydration gate: the register button only renders once the event loads.
  await view.findByTestId("event-detail-register-button");
  expect(view.getAllByText("Trail night run").length).toBeGreaterThan(0);

  // 1. External-source badge (full variant on the detail screen).
  expect(view.getByText("source.external")).toBeTruthy();

  // 2. Clickable attribution opens the source page in the browser.
  fireEvent.press(view.getByText("OpenAgenda · events.viewOriginal"));
  await waitFor(() =>
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith(
      "https://openagenda.example/lux/events/night-trail-run",
    ),
  );

  // 6. Unknown price never renders as free.
  expect(view.getByText("events.externalPrice")).toBeTruthy();
  expect(view.queryByText("events.priceFree")).toBeNull();

  // 4. No in-app participation surface for an imported row: no Places row
  // ("0 registered"), no participants list, and no in-app join button.
  expect(view.queryByText("Places")).toBeNull();
  expect(view.queryByText(/events\.participants/)).toBeNull();
  expect(view.queryByTestId("event-detail-join-button")).toBeNull();

  // 3. The registration link row backs the external action.
  expect(view.queryByText("create.event.registrationLink")).toBeTruthy();
  // Generous timeout: the first test absorbs module-init warm-up when the
  // Jest transform cache is cold (CI runs); the assertions themselves are fast.
}, 15000);

test("the register action stays available under stale membership/pending/full state and never joins in-app", async () => {
  mockJoinStatus.isMember = true;
  mockJoinStatus.isPending = true;
  // Stale in-app state on an external row: already "full" by Pulse counters.
  mockTables.events = {
    data: { ...externalEvent, places_total: 8, places_left: 0, accepted_count: 8 },
    error: null,
  };

  const view = renderScreen();
  const registerButton = await view.findByTestId("event-detail-register-button");

  // External action available despite member/pending/full state, and the
  // internal member/pending CTAs are never rendered for external rows.
  expect(registerButton.props.accessibilityState?.disabled).toBe(false);
  expect(view.queryByTestId("event-detail-join-button")).toBeNull();
  expect(view.queryByText("events.participant")).toBeNull();
  expect(view.queryByText("events.requestSent")).toBeNull();

  fireEvent.press(registerButton);
  await waitFor(() =>
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith(
      "https://openagenda.example/lux/night-trail-run/register",
    ),
  );

  // Registration happens off-platform: no in-app join request is written.
  expect(mockInserts.filter((entry) => entry === "event_join_requests")).toHaveLength(0);
});

test("the register action falls back to the source page when no registration link exists", async () => {
  mockTables.events = {
    data: { ...externalEvent, registration_url: null },
    error: null,
  };

  const view = renderScreen();
  const registerButton = await view.findByTestId("event-detail-register-button");

  // 3. Fallback: with no registration link the action still opens the source
  // page instead of being disabled (requirement: never dead-end external).
  expect(registerButton.props.accessibilityState?.disabled).toBe(false);
  fireEvent.press(registerButton);
  await waitFor(() =>
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith(
      "https://openagenda.example/lux/events/night-trail-run",
    ),
  );
  expect(mockInserts.filter((entry) => entry === "event_join_requests")).toHaveLength(0);
});

test("internal events keep their Places row, join button, and free price label", async () => {
  mockTables.events = {
    data: {
      ...externalEvent,
      is_external: false,
      registration_url: null,
      source_url: null,
      source_name: null,
      created_by: "someone",
    },
    error: null,
  };

  const view = renderScreen();
  await view.findByTestId("event-detail-join-button");

  // Internal behavior unchanged: the Places row stays and no external
  // surfaces (badge link, register button) leak into internal rows.
  expect(view.getByText("Places")).toBeTruthy();
  expect(view.queryByTestId("event-detail-register-button")).toBeNull();
  expect(view.queryByText("source.external")).toBeNull();
  expect(view.getByText("source.inApp")).toBeTruthy();
  // A free in-app event still shows the free label: the OpenAgenda price
  // guard must not leak into internal rows.
  expect(view.getByText("events.priceFree")).toBeTruthy();
  expect(view.queryByText("events.externalPrice")).toBeNull();
});
