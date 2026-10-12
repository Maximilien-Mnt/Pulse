// ---------------------------------------------------------------------------
// PULSE — conversation export path-traversal guard
//
// exportConversationToJsonl writes a cache file whose name embeds the
// conversation id. A malicious / malformed id must never reach the filesystem
// path, so the guard must reject it before any write.
// ---------------------------------------------------------------------------

const mockWriteAsStringAsync = jest.fn(() => Promise.resolve());
const mockIsAvailableAsync = jest.fn(() => Promise.resolve(true));
const mockShareAsync = jest.fn(() => Promise.resolve());

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  EncodingType: { UTF8: "utf8" },
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

const mockEq = jest.fn(() => ({ order: () => Promise.resolve({ data: [], error: null }) }));
const mockFrom = jest.fn(() => ({ select: () => ({ eq: (col: string, val: unknown) => mockEq(col, val) }) }));

jest.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { exportConversationToJsonl } = require("@/utils/conversationExport");

describe("exportConversationToJsonl (path traversal)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteAsStringAsync.mockResolvedValue(undefined);
    mockIsAvailableAsync.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
  });

  it("writes a well-formed UUID export inside the cache directory", async () => {
    const id = "11111111-2222-4333-8444-555555555555";
    await exportConversationToJsonl(id);

    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    const [uri] = mockWriteAsStringAsync.mock.calls[0];
    expect(uri).toBe(`file:///cache/pulse-conversation-${id}.jsonl`);
    // The queried id must be the validated one.
    expect(mockEq).toHaveBeenCalledWith("conversation_id", id);
  });

  it.each([
    ["traversal", "../../etc/passwd"],
    ["path separator", "a/b"],
    ["null byte", "abc\u0000def"],
    ["query/space", "abc def"],
    ["empty", ""],
    ["too long", "x".repeat(101)],
  ])("rejects a %s id without touching the filesystem", async (_label, bad) => {
    await expect(exportConversationToJsonl(bad)).rejects.toThrow(/Invalid conversation id/i);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
  });
});

