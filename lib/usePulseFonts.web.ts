import { useEffect, useState } from "react";

export type UsePulseFontsResult = [loaded: boolean, error: Error | null];

/**
 * Google Fonts URL for the three Pulse families (optimized woff2).
 * Weights match exactly what is bundled on native:
 *   - Inter: 400, 500, 600, 700
 *   - Outfit: 400, 500, 600, 700
 *   - Space Grotesk: 500, 700
 * The `display=swap` parameter makes text render in a fallback face
 * immediately while the fonts download (no invisible-text flash).
 */
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap";

let injected = false;

function injectGoogleFonts() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const existing = document.getElementById("pulse-google-fonts");
  if (existing) return;
  const link = document.createElement("link");
  link.id = "pulse-google-fonts";
  link.rel = "stylesheet";
  link.href = FONTS_HREF;
  document.head.appendChild(link);
}

/**
 * Web font loading for Pulse.
 *
 * No `.ttf` files are bundled on web — they cannot be served reliably by
 * Cloudflare Pages (the request would 404 and fall back to `index.html`,
 * breaking the font). Instead the same families load from Google Fonts as
 * optimized woff2 files, whose HTTP responses come from Google's CDN.
 *
 * The app renders immediately; `loaded` flips once the load attempt has
 * settled (which always resolves, even on network failure, so the 10s
 * splash safety net in the root layout still works as before).
 */
export function usePulseFonts(): UsePulseFontsResult {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    injectGoogleFonts();
    if (typeof document === "undefined" || typeof document.fonts === "undefined") {
      setReady(true);
      return;
    }
    document.fonts.ready
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  return [ready, null];
}