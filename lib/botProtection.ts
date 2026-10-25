/**
 * PULSE — Bot protection helpers for the client side.
 *
 * Responsibilities:
 *  - Build the `X-Device-Id` header attached to every Supabase request.
 *  - Render / verify Cloudflare Turnstile on web (signup + signin).
 *  - Native: skip Turnstile entirely; rely on device fingerprint + edge rate limit.
 */

import { Platform } from "react-native";
import { getDeviceId } from "./deviceId";

let _turnstileSiteKey: string | null = null;

/** Public site key (safe to ship). Set from app config / env at init. */
export function setTurnstileSiteKey(key: string | null): void {
  _turnstileSiteKey = key;
}

export function getTurnstileSiteKey(): string | null {
  return _turnstileSiteKey;
}

/** Whether Turnstile should be rendered (web only, with a configured key). */
export function shouldUseTurnstile(): boolean {
  return Platform.OS === "web" && !!_turnstileSiteKey;
}

/** Attach device id to a request init's headers. Mutates `init` in place. */
export function attachDeviceHeader(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers ?? {});
  // Fire-and-forget: device id is best-effort; never block a request on it.
  void getDeviceId().then((deviceId) => {
    if (deviceId) headers.set("X-Device-Id", deviceId);
  });
  return { ...init, headers };
}

/**
 * Render an invisible Turnstile widget and wait for a token.
 * Web-only. Resolves to the token string, or null if Turnstile is unavailable
 * (caller must degrade gracefully — native never calls this).
 *
 * @param containerId DOM element id where the widget is rendered.
 * @param timeoutMs Max wait for token before giving up.
 */
export async function getTurnstileToken(
  containerId = "pulse-turnstile-widget",
  timeoutMs = 120_000,
): Promise<string | null> {
  if (!shouldUseTurnstile() || !_turnstileSiteKey) return null;
  if (!document) return null;

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
      // Turnstile global may not exist on every page load; guard.
      const turnstile = (window as any).turnstile;
      if (turnstile?.render) {
        // widget already rendered; remove it so it can be re-rendered next time
        try {
          turnstile.reset();
        } catch {
          // ignore
        }
      }
    };

    const onTimeout = () => {
      cleanup();
      resolve(null);
    };

    timer = setTimeout(onTimeout, timeoutMs);

    (window as any).turnstileReady = () => {
      if (timer) clearTimeout(timer);
      const turnstile = (window as any).turnstile;
      if (!turnstile?.render) {
        cleanup();
        resolve(null);
        return;
      }
      turnstile.render(containerId, {
        sitekey: _turnstileSiteKey!,
        size: "invisible",
        theme: "light",
        callback: (token: string) => {
          cleanup();
          resolve(token);
        },
        "error-callback": () => {
          cleanup();
          resolve(null);
        },
        "expired-callback": () => {
          cleanup();
          resolve(null);
        },
      });
      // Kick off the challenge immediately for invisible widgets.
      try {
        turnstile.execute(containerId);
      } catch {
        // execute may not be needed for render+callback flow; ignore.
      }
    };

    // Load Turnstile script if not already present.
    if (!(window as any).turnstile) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=pulseTurnstileReady";
      script.async = true;
      script.defer = true;
      // Bridge the global onload name to our internal handler.
      script.onload = () => {
        (window as any).pulseTurnstileReady = (window as any).turnstileReady;
      };
      script.onerror = () => {
        if (timer) clearTimeout(timer);
        cleanup();
        resolve(null);
      };
      document.head?.appendChild(script);
    } else {
      // Script already loaded; trigger render.
      if ((window as any).turnstile?.render) {
        const turnstile = (window as any).turnstile;
        turnstile.render(containerId, {
          sitekey: _turnstileSiteKey!,
          size: "invisible",
          theme: "light",
          callback: (token: string) => {
            cleanup();
            resolve(token);
          },
          "error-callback": () => {
            cleanup();
            resolve(null);
          },
          "expired-callback": () => {
            cleanup();
            resolve(null);
          },
        });
        try {
          turnstile.execute(containerId);
        } catch {
          // ignore
        }
      } else {
        cleanup();
        resolve(null);
      }
    }
  });
}
