import { useEffect, useState } from "react";
import * as Font from "expo-font";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

export type UsePulseFontsResult = [loaded: boolean, error: Error | null];

/**
 * Loads the Pulse font families.
 *
 * Native: the five bundled TTF families (Outfit, Inter, Space Grotesk)
 * are loaded once via expo-font and registered by their family names
 * (e.g. "Outfit_400Regular"), which Tailwind's fontFamily entries reference.
 *
 * Web is handled by `usePulseFonts.web.ts` (Google Fonts woff2), so the
 * `@expo-google-fonts/*` TTFs are never bundled into the web export —
 * Cloudflare Pages cannot serve virtual font files.
 */
export function usePulseFonts(): UsePulseFontsResult {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        await Font.loadAsync({
          Outfit_400Regular,
          Outfit_500Medium,
          Outfit_600SemiBold,
          Outfit_700Bold,
          SpaceGrotesk_500Medium,
          SpaceGrotesk_700Bold,
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
        });
        if (active) setLoaded(true);
      } catch (e) {
        if (active) setError(e instanceof Error ? e : new Error(String(e)));
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  return [loaded, error];
}