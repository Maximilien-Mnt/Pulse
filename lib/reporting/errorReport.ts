// ---------------------------------------------------------------------------
// PULSE — Safe error normalizer + privacy-gated PostHog reporting (part 1)
// ---------------------------------------------------------------------------

import { Platform } from "react-native";
import Constants from "expo-constants";
import { redactStringSafe, redactValue } from "./redact";
import { isAnalyticsEnabled } from "./analyticsConsent";
import { drainLogBuffer, logger } from "./logger";

export type ErrorContext = {
  operation: string;
  route?: string;
  extra?: Record<string, unknown>;
};

export type NormalizedError = {
  name: string;
  message: string;
  code?: string;
  status?: number;
  operation: string;
  route?: string;
  appVersion: string;
  platform: string;
  correlationId: string;
  timestamp: string;
  extra?: Record<string, unknown>;
};

function safeAppVersion(): string {
  try {
    const v =
      Constants.expoConfig?.version ??
      (Constants as unknown as { manifest?: { version?: string } }).manifest?.version ??
      process.env.EXPO_PUBLIC_APP_VERSION;
    return typeof v === "string" && v.length > 0 ? v : "unknown";
  } catch {
    return "unknown";
  }
}

function safePlatform(): string {
  try {
    return Platform.OS ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function createCorrelationId(): string {
  try {
    const rand = Math.floor(Math.random() * 0xffffffff).toString(16);
    return `${Date.now().toString(36)}-${rand}`;
  } catch {
    return `${Date.now()}`;
  }
}

function extractCodeStatus(err: unknown): { code?: string; status?: number } {
  if (typeof err !== "object" || err === null) return {};
  const rec = err as Record<string, unknown>;
  let code: string | undefined;
  const rawCode = rec.code;
  if (typeof rawCode === "string" && rawCode.length <= 64) code = rawCode;
  else if (typeof rawCode === "number") code = String(rawCode);
  let status: number | undefined;
  const rawStatus = rec.status ?? rec.statusCode;
  if (typeof rawStatus === "number" && Number.isFinite(rawStatus)) status = rawStatus;
  return { code, status };
}


/** Normalize any thrown value into a redacted, typed error report. Never throws. */
export function normalizeError(error: unknown, ctx: ErrorContext): NormalizedError {
  try {
    const name =
      error instanceof Error
        ? error.name || "Error"
        : typeof error === "object" && error !== null
          ? "QueryError"
          : "UnknownError";
    const rawMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: unknown }).message ?? "")
            : "Unknown error";
    const { code, status } = extractCodeStatus(error);
    let extra: Record<string, unknown> | undefined;
    try {
      extra = ctx.extra ? (redactValue(ctx.extra) as Record<string, unknown>) : undefined;
    } catch {
      extra = undefined;
    }
    return {
      name: name.slice(0, 80),
      message: redactStringSafe(rawMessage).slice(0, 300),
      code,
      status,
      operation: ctx.operation.slice(0, 120),
      route: ctx.route?.slice(0, 200),
      appVersion: safeAppVersion(),
      platform: safePlatform(),
      correlationId: createCorrelationId(),
      timestamp: new Date().toISOString(),
      extra,
    };
  } catch {
    return {
      name: "UnknownError",
      message: "Unknown error",
      operation: "unknown",
      appVersion: "unknown",
      platform: "unknown",
      correlationId: createCorrelationId(),
      timestamp: new Date().toISOString(),
    };
  }
}

function isPostHogAllowed(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cfg = require("@/src/config/posthog") as { isPostHogConfigured?: boolean };
    if (!cfg.isPostHogConfigured) return false;
  } catch {
    return false;
  }
  return isAnalyticsEnabled();
}

/** Report an error: dev console + optional PostHog `app_error` event. */
export function reportError(error: unknown, ctx: ErrorContext): NormalizedError {
  const normalized = normalizeError(error, ctx);
  try {
    logger.error(ctx.operation, `${normalized.name}: ${normalized.message}`, {
      code: normalized.code,
      status: normalized.status,
      route: normalized.route,
      correlationId: normalized.correlationId,
    });
  } catch {
    // ignore
  }
  try {
    if (!isPostHogAllowed()) return normalized;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { posthog } = require("@/src/config/posthog") as {
      posthog?: { capture?: (event: string, props?: Record<string, unknown>) => void };
    };
    const recentLogs = drainLogBuffer().map((e) => ({
      level: e.level,
      scope: e.scope,
      message: e.message,
    }));
    posthog?.capture?.("app_error", {
      error_name: normalized.name,
      error_code: normalized.code ?? null,
      error_status: normalized.status ?? null,
      operation: normalized.operation,
      route: normalized.route ?? null,
      app_version: normalized.appVersion,
      platform: normalized.platform,
      correlation_id: normalized.correlationId,
      recent_logs: recentLogs.slice(-10),
    });
  } catch {
    // Analytics is best-effort.
  }
  return normalized;
}

/** Report a slow-operation sample. Gated the same way. Never throws. */
export function reportPerformance(
  operation: string,
  durationMs: number,
  extra?: Record<string, unknown>
): void {
  try {
    if (!Number.isFinite(durationMs)) return;
    const ms = Math.round(durationMs);
    if (ms < 0) return;
    logger.debug(operation, `performance sample: ${ms}ms`);
    if (!isPostHogAllowed()) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { posthog } = require("@/src/config/posthog") as {
      posthog?: { capture?: (event: string, props?: Record<string, unknown>) => void };
    };
    let safeExtra: Record<string, unknown> | undefined;
    try {
      safeExtra = extra ? (redactValue(extra) as Record<string, unknown>) : undefined;
    } catch {
      safeExtra = undefined;
    }
    posthog?.capture?.("app_performance", {
      operation: operation.slice(0, 120),
      duration_ms: ms,
      app_version: safeAppVersion(),
      platform: safePlatform(),
      ...(safeExtra ?? {}),
    });
  } catch {
    // ignore
  }
}
