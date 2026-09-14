// Mock expo-constants to avoid native module issues in Jest
jest.mock("expo-constants", () => ({
  default: {
    expoConfig: { version: "1.0.0" },
    manifest: { version: "1.0.0" },
  },
}));

// Also mock Platform to ensure OS is defined
jest.mock("react-native", () => ({
  Platform: { OS: "test", Version: 17, select: (opts: any) => Object.values(opts)[0] },
  View: () => null,
  Text: () => null,
}));

import { logger, peekLogBuffer, drainLogBuffer } from "@/lib/reporting/logger";
import { normalizeError, reportError } from "@/lib/reporting/errorReport";

describe("logger", () => {
  it("buffers warn/error but not debug/info", () => {
    drainLogBuffer();
    logger.debug("s", "d");
    logger.info("s", "i");
    expect(peekLogBuffer()).toHaveLength(0);
    logger.warn("s", "w");
    logger.error("s", "e");
    expect(peekLogBuffer()).toHaveLength(2);
    drainLogBuffer();
  });

  it("redacts emails from logged fields", () => {
    drainLogBuffer();
    logger.error("s", "m", { email: "a@b.com" });
    const [entry] = peekLogBuffer();
    expect(JSON.stringify(entry?.fields)).not.toContain("a@b.com");
    drainLogBuffer();
  });
});

describe("normalizeError", () => {
  it("records operation, route, platform, correlationId and redacts content", () => {
    const n = normalizeError(new Error("oops user@x.com"), {
      operation: "feed.load",
      route: "/feed",
      extra: { body: "secret post", status: 500 },
    });
    expect(n.operation).toBe("feed.load");
    expect(n.route).toBe("/feed");
    expect(n.correlationId.length).toBeGreaterThan(3);
    expect(n.platform.length).toBeGreaterThan(0);
    expect(n.message).not.toContain("user@x.com");
    expect(JSON.stringify(n.extra)).not.toContain("secret post");
  });

  it("reportError never throws and returns normalized error", () => {
    const n = reportError("boom", { operation: "test.op" });
    expect(n.operation).toBe("test.op");
    expect(n.name).toBe("UnknownError");
  });
});
