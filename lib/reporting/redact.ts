// ---------------------------------------------------------------------------
// PULSE — Privacy-safe redaction
//
// Central place that strips PII / user-generated content before anything is
// logged or sent to analytics. Never capture raw message/post bodies, emails,
// tokens, coordinates, or full Supabase payloads.
// ---------------------------------------------------------------------------

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BEARER_RE = /bearer\s+[A-Za-z0-9._~+/-]+=* /gi;

const SENSITIVE_KEY_RE =
  /email|e-mail|mail|password|passwd|secret|authorization|access[_-]?token|refresh[_-]?token|api[_-]?key|session[_-]?token|cookie|set-cookie/i;
const CONTENT_KEY_RE =
  /^(body|message|content|text|caption|bio|biography|comment|description|title|name|username|full_name|display_name|first_name|last_name|avatar_url|photo|image|payload|data|rows?|result|response|request|params|query|variables|user|profile|author|member|post|posts|conversation|conversations)$/i;
const COORD_KEY_RE = /^(lat|lng|lon|latitude|longitude|coords?|coordinates?|location|position|geo.*|address|city|zip.*|postal.*)$/i;

export const REDACTED = "[REDACTED]";
export const REDACTED_EMAIL = "[REDACTED_EMAIL]";
export const REDACTED_TOKEN = "[REDACTED_TOKEN]";
export const REDACTED_COORDS = "[REDACTED_COORDS]";
export const REDACTED_CONTENT = "[REDACTED_CONTENT]";

const MAX_STRING = 500;
const MAX_DEPTH = 6;
const MAX_KEYS = 50;

function redactString(value: string): string {
  let out = value;
  out = out.replace(EMAIL_RE, REDACTED_EMAIL);
  out = out.replace(JWT_RE, REDACTED_TOKEN);
  out = out.replace(BEARER_RE, `Bearer ${REDACTED_TOKEN} `);
  if (out.length > MAX_STRING) out = out.slice(0, MAX_STRING) + "…[truncated]";
  return out;
}

/** Redact a single key/value pair based on the key name. */
export function redactField(key: string, value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (SENSITIVE_KEY_RE.test(key)) {
    if (typeof value === "string" && EMAIL_RE.test(value)) return REDACTED_EMAIL;
    return REDACTED_TOKEN;
  }
  if (COORD_KEY_RE.test(key)) {
    if (typeof value === "number" || typeof value === "string") return REDACTED_COORDS;
    return REDACTED;
  }
  if (CONTENT_KEY_RE.test(key)) {
    if (typeof value === "string") return REDACTED_CONTENT;
    if (Array.isArray(value)) return `[array(${value.length})]`;
    if (typeof value === "object") return REDACTED;
    return value;
  }
  return redactValue(value, depth + 1);
}

/** Recursively redact unknown values. Safe for logging/analytics only. */
export function redactValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message).slice(0, 300) };
  }
  if (depth > MAX_DEPTH) return REDACTED;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((v) => redactValue(v, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_KEYS);
    for (const [k, v] of entries) {
      try {
        out[k] = redactField(k, v, depth);
      } catch {
        out[k] = REDACTED;
      }
    }
    return out;
  }
  try {
    return redactString(String(value));
  } catch {
    return REDACTED;
  }
}

/** Redact a free-form fields bag for logging. Never throws. */
export function redactFields(fields?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!fields) return undefined;
  try {
    return redactValue(fields) as Record<string, unknown>;
  } catch {
    return { error: REDACTED };
  }
}

/** Redact a free-form string safely (never throws). */
export function redactStringSafe(value: unknown): string {
  try {
    if (typeof value !== "string") return "Unknown error";
    if (!value) return "Unknown error";
    return redactString(value);
  } catch {
    return "Unknown error";
  }
}

/** Strip query-string PII from a URL, keeping only origin + pathname. */
export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return redactString(url).split("?")[0] as string;
  }
}
