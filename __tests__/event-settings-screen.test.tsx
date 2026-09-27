// ---------------------------------------------------------------------------
// Event settings screen (app/(tabs)/events/[eventId]/settings.tsx)
//
// Covers the three manager paths end to end at the UI level:
//   * the creator sees the hydrated form and can save a changed field,
//   * a club owner/admin sees the form too (club-published event),
//   * anyone else only gets the "managers only" state, never the form.
// ---------------------------------------------------------------------------

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import EventSettingsScreen from "@/app/(tabs)/events/[eventId]/settings";

type TableResult = { data: unknown; error: unknown };

const mockTables: Record<string, TableResult> = {};
const mockUpdates: { table: string; payload: Record<string, unknown> }[] = [];
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};

const mockFrom = (table: string) => {
  const result = mockTables[table] ?? { data: null, error: null };
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = chain;
  builder.eq = chain;
  builder.neq = chain;
  builder.order = chain;
  builder.single = chain;
  builder.maybeSingle = chain;
  builder.update = (payload: Record<string, unknown>) => {
    mockUpdates.push({ table, payload });
    return builder;
  };
  // Everything above resolves to the configured per-table result, which keeps
  // `await supabase.from(...).select(...).eq(...).single()` working like the
  // real postgrest builder in a test.
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
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key, tp: (key: string) => key, language: "fr" }),
  t: (key: string) => key,
}));

jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

// The media helpers pull in `expo-file-system/legacy`, which jest cannot
// transform; the screen only needs the picker option builder and the picked
// asset wrapper here (no upload happens in these tests).
jest.mock("@/lib/mediaPipeline", () => ({
  buildPickerImageOptions: (options: Record<string, unknown> = {}) => options,
  toPickedImage: (asset: unknown) => asset,
}));

jest.mock("@/lib/imageUpload", () => ({
  uploadImageToStorage: jest.fn(async () => "https://cdn.example.com/uploaded.jpg"),
  removeFromStorageByUrl: jest.fn(async () => undefined),
}));

jest.mock("react-native-safe-area-context", () => {
  const ReactMock = require("react");
  const { View } = require("react-native");
  const SafeAreaProvider = ({ children }: any) => ReactMock.createElement(View, null, children);
  const SafeAreaView = (props: any) => ReactMock.createElement(View, props);
  const useSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
  return {
    SafeAreaProvider,
    SafeAreaView,
    useSafeAreaInsets,
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 0, height: 0 },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  };
});

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  const MockDateTimePicker = (props: any) => <View testID="dt-picker" />;
  return {
    __esModule: true,
    default: MockDateTimePicker,
    DateTimePickerAndroid: { open: jest.fn() },
  };
});

let mockUserId: string | null = "creator";

const managerEvent = {
  id: "event-1",
  name: "Sunday match",
  sport: "football",
  sports: ["football"],
  required_level: "Intermédiaire",
  required_levels: { football: "Intermédiaire" },
  short_description: "5-a-side friendly",
  description: "",
  country: "France",
  city: "Paris",
  venue_address: "1 rue du Test",
  postal_code: "75011",
  contact_email: "club@example.com",
  league: "Ligue 1",
  website_url: null,
  registration_url: null,
  is_external: false,
  price_cents: 1200,
  is_paid: true,
  places_total: 12,
  places_left: 11,
  accepted_count: 1,
  age_min: 18,
  age_max: 40,
  start_date: "2030-05-01T18:00:00.000Z",
  end_date: null,
  cover_url: null,
  hero_urls: ["https://cdn.example.com/a.jpg"],
  created_by: "creator",
  publisher_club_id: null as string | null,
  club_id: null as string | null,
  is_private: false,
};

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EventSettingsScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUserId = "creator";
  mockUpdates.length = 0;
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockRouter.canGoBack.mockReset();
  mockRouter.canGoBack.mockReturnValue(true);
  (Toast.show as jest.Mock).mockClear();
  Object.keys(mockTables).forEach((key) => delete mockTables[key]);
  mockTables.events = { data: { ...managerEvent }, error: null };
  mockTables.clubs = { data: { created_by: "owner" }, error: null };
  mockTables.club_members = { data: { role: "member" }, error: null };
  mockTables.event_participants = { data: [], error: null };
});

test("the creator gets the form hydrated from the event", async () => {
  const view = renderScreen();

  expect(await view.findByTestId("event-settings-form")).toBeTruthy();
  expect(view.getByTestId("event-settings-name").props.value).toBe("Sunday match");
  expect(view.getByTestId("event-settings-city").props.value).toBe("Paris");
  expect(view.getByTestId("event-settings-places").props.value).toBe("12");
  // 1200 cents are edited as "12" euros.
  expect(view.getByTestId("event-settings-price").props.value).toBe("12");
  expect(view.getByTestId("event-settings-save")).toBeTruthy();
  expect(view.getByTestId("event-settings-cancel")).toBeTruthy();
  expect(view.getByText("events.settings.dangerZone")).toBeTruthy();
  expect(view.queryByTestId("event-settings-forbidden")).toBeNull();
});

test("a club admin gets the form for a club-published event", async () => {
  mockUserId = "admin-1";
  mockTables.events = {
    data: { ...managerEvent, created_by: "someone-else", publisher_club_id: "club-1", club_id: "club-1" },
    error: null,
  };
  mockTables.club_members = { data: { role: "admin" }, error: null };

  const view = renderScreen();

  expect(await view.findByTestId("event-settings-form")).toBeTruthy();
});

test("anyone else only gets the managers-only state", async () => {
  mockUserId = "stranger";
  mockTables.events = {
    data: { ...managerEvent, created_by: "someone-else", publisher_club_id: "club-1", club_id: "club-1" },
    error: null,
  };

  const view = renderScreen();

  expect(await view.findByTestId("event-settings-forbidden")).toBeTruthy();
  expect(view.getByText("events.settings.adminOnly")).toBeTruthy();
  expect(view.queryByTestId("event-settings-save")).toBeNull();
});

test("saving sends only the changed field, then returns to the event", async () => {
  const view = renderScreen();
  await view.findByTestId("event-settings-form");

  fireEvent.changeText(view.getByTestId("event-settings-name"), "Summer cup");
  fireEvent.press(view.getByTestId("event-settings-save"));

  await waitFor(() => expect(mockUpdates).toHaveLength(1));
  // An update diff means untouched fields are neither written nor announced.
  expect(Object.keys(mockUpdates[0]!.payload)).toEqual(["name"]);
  expect(mockUpdates[0]!.payload.name).toBe("Summer cup");

  await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
});

test("an invalid save is refused before touching the network", async () => {
  const view = renderScreen();
  await view.findByTestId("event-settings-form");

  fireEvent.changeText(view.getByTestId("event-settings-name"), "");
  fireEvent.press(view.getByTestId("event-settings-save"));

  await waitFor(() =>
    expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })),
  );
  expect(mockUpdates).toHaveLength(0);
  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(view.getByTestId("event-settings-form")).toBeTruthy();
});
