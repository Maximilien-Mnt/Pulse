import { attachEventCreators, fetchEventPublishingClubs } from "@/lib/eventIdentity";
import { supabase } from "@/lib/supabase";

const mockIn = jest.fn();
jest.mock("@/lib/supabase", () => ({ supabase: {
  rpc: jest.fn(),
  from: jest.fn(() => ({ select: jest.fn(() => ({ in: mockIn })) })),
} }));

const person = { id: "john", full_name: "John", username: "john", avatar_url: "john.jpg" };
const event = { id: "event", created_by: "john", publisher_club_id: null as string | null };

beforeEach(() => { jest.clearAllMocks(); mockIn.mockResolvedValue({ data: [person], error: null }); });

test("loads the authorized owner/admin club list from the server", async () => {
  const clubs = [{ id: "club", name: "Foot club", logo_url: null }];
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: clubs, error: null });
  expect(await fetchEventPublishingClubs()).toEqual(clubs);
  expect(supabase.rpc).toHaveBeenCalledWith("get_event_publishing_clubs");
});

test("does not hide a club discovery failure as an empty list", async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error("offline") });
  await expect(fetchEventPublishingClubs()).rejects.toThrow("offline");
});

test("personal and legacy linked events keep their personal creator", async () => {
  const [result] = await attachEventCreators([{ ...event, club_id: "legacy-linked-club" }]);
  expect(result?.creator).toEqual({ ...person, kind: "person" });
  expect(supabase.rpc).not.toHaveBeenCalled();
});

test("club attribution uses name/logo and never queries the operator's profile", async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: [{ event_id: "event", id: "club", name: "Foot club", logo_url: "club.jpg" }], error: null });
  const [result] = await attachEventCreators([{ ...event, publisher_club_id: "club" }]);
  expect(result?.creator).toEqual({ id: "club", full_name: "Foot club", username: "", avatar_url: "club.jpg", kind: "club" });
  expect(supabase.from).not.toHaveBeenCalled();
  expect(supabase.rpc).toHaveBeenCalledWith("get_event_club_publishers", { p_event_ids: ["event"] });
});

test("inaccessible club attribution does not fall back to the human creator", async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });
  const [result] = await attachEventCreators([{ ...event, publisher_club_id: "club", creator: person }]);
  expect(result?.creator).toBeUndefined();
});

test("mixed batches resolve both identity types and preserve ordering", async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: [{ event_id: "club-event", id: "club", name: "Foot club", logo_url: null }], error: null });
  const results = await attachEventCreators([event, { ...event, id: "club-event", publisher_club_id: "club" }]);
  expect(results.map((r) => r.creator?.kind)).toEqual(["person", "club"]);
  expect(mockIn).toHaveBeenCalledWith("id", ["john"]);
});

test("empty batches do not issue requests", async () => {
  expect(await attachEventCreators([])).toEqual([]);
  expect(supabase.from).not.toHaveBeenCalled();
  expect(supabase.rpc).not.toHaveBeenCalled();
});
