import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useEventPublishingIdentity } from "@/hooks/useEventPublishingIdentity";

let mockQuery: any;
jest.mock("@tanstack/react-query", () => ({ useQuery: () => mockQuery }));
jest.mock("@/lib/eventIdentity", () => ({ fetchEventPublishingClubs: jest.fn() }));
const clubs = [{ id: "club", name: "Foot club", logo_url: null }];
beforeEach(() => { mockQuery = { data: clubs, isPending: false, isError: false }; });

test("personal profile is selected by default even with managed clubs", () => {
  const { result } = renderHook(() => useEventPublishingIdentity("john"));
  expect(result.current.publisherClubId).toBeNull();
  expect(result.current.isValid).toBe(true);
});

test("can switch to an admin club and back to the personal profile", () => {
  const { result } = renderHook(() => useEventPublishingIdentity("john"));
  act(() => result.current.setPublisherClubId("club"));
  expect(result.current.selectedClub?.name).toBe("Foot club");
  expect(result.current.isValid).toBe(true);
  act(() => result.current.setPublisherClubId(null));
  expect(result.current.publisherClubId).toBeNull();
});

test("authorized club deep link is selected once and does not override a manual change", async () => {
  const { result, rerender } = renderHook(() => useEventPublishingIdentity("john", "club"));
  await waitFor(() => expect(result.current.publisherClubId).toBe("club"));
  act(() => result.current.setPublisherClubId(null));
  mockQuery = { ...mockQuery, data: [...clubs] };
  rerender({});
  expect(result.current.publisherClubId).toBeNull();
});

test("unmanaged deep links never become publishing identities", () => {
  const { result } = renderHook(() => useEventPublishingIdentity("john", "other-club"));
  expect(result.current.publisherClubId).toBeNull();
});

test("loading, errors, and revoked membership block publication", () => {
  const { result, rerender } = renderHook(() => useEventPublishingIdentity("john"));
  act(() => result.current.setPublisherClubId("club"));
  mockQuery = { ...mockQuery, data: [] };
  rerender({});
  expect(result.current.isValid).toBe(false);
  act(() => result.current.setPublisherClubId(null));
  mockQuery = { ...mockQuery, isError: true };
  rerender({});
  expect(result.current.isValid).toBe(false);
  mockQuery = { data: undefined, isPending: true, isError: false };
  rerender({});
  expect(result.current.isValid).toBe(false);
});
