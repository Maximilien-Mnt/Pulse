import {
  sanitizeOpeningHours,
  groupSlotsByWeekday,
  getOpeningStatus,
  mondayFirstWeekday,
  formatHour,
} from "@/lib/openingHours";

describe("sanitizeOpeningHours", () => {
  it("returns [] for non-array input", () => {
    expect(sanitizeOpeningHours(null)).toEqual([]);
    expect(sanitizeOpeningHours(undefined)).toEqual([]);
    expect(sanitizeOpeningHours("monday")).toEqual([]);
    expect(sanitizeOpeningHours({})).toEqual([]);
  });

  it("drops invalid entries (bad weekday, bad hours, end <= start, out of range)", () => {
    expect(
      sanitizeOpeningHours([
        { weekday: 7, startHour: 8, endHour: 10 },
        { weekday: -1, startHour: 8, endHour: 10 },
        { weekday: 1, startHour: 5, endHour: 10 }, // below MIN_HOUR
        { weekday: 1, startHour: 8, endHour: 24 }, // above MAX_HOUR
        { weekday: 1, startHour: 10, endHour: 10 }, // empty window
        { weekday: 1, startHour: 12, endHour: 9 }, // inverted
        { weekday: 1, startHour: 8.5, endHour: 10 }, // non-integer
        "garbage",
        null,
      ])
    ).toEqual([]);
  });

  it("keeps valid entries, sorts and dedupes", () => {
    const input = [
      { weekday: 4, startHour: 18, endHour: 21 },
      { weekday: 0, startHour: 8, endHour: 12 },
      { weekday: 0, startHour: 8, endHour: 12 }, // duplicate
      { weekday: 0, startHour: 6, endHour: 8 },
    ];
    expect(sanitizeOpeningHours(input)).toEqual([
      { weekday: 0, startHour: 6, endHour: 8 },
      { weekday: 0, startHour: 8, endHour: 12 },
      { weekday: 4, startHour: 18, endHour: 21 },
    ]);
  });
});

describe("mondayFirstWeekday", () => {
  it("maps JS days to Monday-first indexes", () => {
    // 2024-01-01 is a Monday, 2024-01-07 a Sunday.
    expect(mondayFirstWeekday(new Date(2024, 0, 1))).toBe(0);
    expect(mondayFirstWeekday(new Date(2024, 0, 5))).toBe(4); // Friday
    expect(mondayFirstWeekday(new Date(2024, 0, 7))).toBe(6); // Sunday
  });
});

describe("formatHour", () => {
  it("pads hours", () => {
    expect(formatHour(6)).toBe("06:00");
    expect(formatHour(23)).toBe("23:00");
  });
});

describe("groupSlotsByWeekday", () => {
  it("returns 7 buckets Monday-first with empty days", () => {
    const buckets = groupSlotsByWeekday([
      { weekday: 6, startHour: 10, endHour: 12 },
      { weekday: 0, startHour: 8, endHour: 10 },
    ]);
    expect(buckets).toHaveLength(7);
    expect(buckets[0]).toEqual([{ weekday: 0, startHour: 8, endHour: 10 }]);
    expect(buckets[6]).toEqual([{ weekday: 6, startHour: 10, endHour: 12 }]);
    expect(buckets[3]).toEqual([]);
  });
});

describe("getOpeningStatus", () => {
  // Wednesday 2024-01-03, local time.
  const wednesday = (hour: number) => new Date(2024, 0, 3, hour, 0, 0);
  const slots = [
    { weekday: 2, startHour: 18, endHour: 21 }, // Wednesday 18-21
    { weekday: 3, startHour: 8, endHour: 12 }, // Thursday 8-12
  ];

  it("is open inside a window", () => {
    const status = getOpeningStatus(slots, wednesday(19));
    expect(status).toEqual({ open: true, closesAt: 21 });
  });

  it("is closed before a same-day window, with next opening info", () => {
    const status = getOpeningStatus(slots, wednesday(10));
    expect(status).toEqual({ open: false, opensAt: 18, opensWeekday: 0 });
  });

  it("rolls over to the next day", () => {
    const status = getOpeningStatus(slots, wednesday(22));
    expect(status).toEqual({ open: false, opensAt: 8, opensWeekday: 1 });
  });

  it("wraps to the same weekday next week when that is the next opening", () => {
    expect(getOpeningStatus([{ weekday: 1, startHour: 8, endHour: 10 }], wednesday(12))).toEqual({
      open: false,
      opensAt: 8,
      opensWeekday: 6,
    });
  });

  it("is closed for empty input", () => {
    expect(getOpeningStatus([], wednesday(12))).toEqual({ open: false });
  });

  it("never throws on malformed input", () => {
    expect(getOpeningStatus([null, "x", {}] as any, wednesday(12))).toEqual({ open: false });
  });
});
