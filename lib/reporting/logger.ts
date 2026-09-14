// ---------------------------------------------------------------------------
// PULSE — Typed logger with environment gating + redaction
//
// Use everywhere instead of console.*:
//   logger.debug(scope, message, fields?) — dev only
//   logger.info(scope, message, fields?)  — dev only
//   logger.warn(scope, message, fields?)  — dev console + prod buffer
//   logger.error(scope, message, fields?) — dev console + prod buffer
//
// Fields are redacted (see ./redact). console.error/warn stay available in
// development; in production nothing is printed.
// ---------------------------------------------------------------------------

import { redactFields } from "./redact";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  level: LogLevel;
  scope: string;
  message: string;
  fields?: Record<string, unknown>;
  timestamp: number;
};

declare const __DEV__: boolean | undefined;

function isDev(): boolean {
  try {
    if (typeof __DEV__ !== "undefined") return __DEV__;
  } catch {
    /* fall through */
  }
  return typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
}

const BUFFER_MAX = 50;
const buffer: LogEntry[] = [];

/** In-memory ring of recent warn/error entries (attach to crash reports). */
export function drainLogBuffer(): LogEntry[] {
  const out = buffer.slice();
  buffer.length = 0;
  return out;
}

export function peekLogBuffer(): LogEntry[] {
  return buffer.slice();
}

function emit(level: LogLevel, scope: string, message: string, fields?: Record<string, unknown>): void {
  let safeFields: Record<string, unknown> | undefined;
  try {
    safeFields = redactFields(fields);
  } catch {
    safeFields = undefined;
  }
  const entry: LogEntry = { level, scope, message, fields: safeFields, timestamp: Date.now() };
  const dev = isDev();

  if (level === "warn" || level === "error") {
    buffer.push(entry);
    if (buffer.length > BUFFER_MAX) buffer.splice(0, buffer.length - BUFFER_MAX);
  }

  if (!dev) return;
  try {
    const prefix = `[${scope}] ${message}`;
    if (level === "debug") console.log(prefix, safeFields ?? "");
    else if (level === "info") console.log(prefix, safeFields ?? "");
    else if (level === "warn") console.warn(prefix, safeFields ?? "");
    else console.error(prefix, safeFields ?? "");
  } catch {
    // Logging must never throw.
  }
}

export const logger = {
  debug(scope: string, message: string, fields?: Record<string, unknown>): void {
    emit("debug", scope, message, fields);
  },
  info(scope: string, message: string, fields?: Record<string, unknown>): void {
    emit("info", scope, message, fields);
  },
  warn(scope: string, message: string, fields?: Record<string, unknown>): void {
    emit("warn", scope, message, fields);
  },
  error(scope: string, message: string, fields?: Record<string, unknown>): void {
    emit("error", scope, message, fields);
  },
};
