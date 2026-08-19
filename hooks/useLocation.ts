import { useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import Toast from "react-native-toast-message";

export type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "restricted" | "unsupported";

interface CoordsLike {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
}

interface LocationObjectLike {
  coords: CoordsLike;
  timestamp: number;
}

interface LocationState {
  status: LocationStatus;
  location: LocationObjectLike | null;
  error: string | null;
}

const isWeb = Platform.OS === "web";

// Try to import expo-location at the top level. On web this will be tree-shaken
// by Metro; on native it provides the real module. If the version is incompatible
// the import will fail and we fall back to navigator.geolocation.
type ExpoLocationModule = {
  Accuracy: { Balanced: number; High: number; Low: number };
  requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
  getForegroundPermissionsAsync: () => Promise<{ status: string }>;
  getCurrentPositionAsync: (opts: { accuracy: number }) => Promise<LocationObjectLike>;
};

let LocationModule: ExpoLocationModule | null = null;
function getLocationModule(): ExpoLocationModule | null {
  if (isWeb) return null;
  if (LocationModule) return LocationModule;
  try {
    // Dynamic import to avoid web bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoLocation = require("expo-location");
    // Validate the module has the expected API surface
    if (
      typeof expoLocation !== "object" ||
      expoLocation === null ||
      typeof expoLocation.requestForegroundPermissionsAsync !== "function"
    ) {
      console.warn("expo-location loaded but API surface is incomplete — version mismatch?");
      return null;
    }
    LocationModule = expoLocation as ExpoLocationModule;
    return LocationModule;
  } catch (e) {
    console.warn("expo-location not available, falling back to navigator.geolocation:", e);
    return null;
  }
}

/**
 * Web fallback using the browser's Geolocation API.
 */
function getWebCurrentPosition(): Promise<LocationObjectLike> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation API not available"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitude: pos.coords.altitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          },
          timestamp: pos.timestamp,
        }),
      (err) => reject(new Error(err.message || "Geolocation error")),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  });
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    status: isWeb ? "unsupported" : "idle",
    location: null,
    error: null,
  });

  const requestPermission = useCallback(async () => {
    if (isWeb) {
      try {
        const location = await getWebCurrentPosition();
        setState({ status: "granted", location, error: null });
        return true;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Geolocation error";
        setState({ status: "denied", location: null, error: message });
        Toast.show({ type: "error", text1: "Erreur de localisation", text2: message });
        return false;
      }
    }

    const Location = getLocationModule();
    if (!Location) {
      setState({ status: "unsupported", location: null, error: "expo-location unavailable" });
      return false;
    }

    setState((s) => ({ ...s, status: "requesting", error: null }));

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setState({ status: "granted", location, error: null });
        return true;
      } else if (status === "denied") {
        setState({ status: "denied", location: null, error: "Permission denied" });
        Toast.show({
          type: "info",
          text1: "Localisation désactivée",
          text2: "Active la localisation dans les paramètres pour voir les clubs et événements près de toi.",
        });
        return false;
      } else {
        setState({ status: "restricted", location: null, error: "Permission restricted" });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setState({ status: "denied", location: null, error: message });
      Toast.show({ type: "error", text1: "Erreur de localisation", text2: message });
      return false;
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    if (isWeb) return requestPermission();
    if (state.status !== "granted") return requestPermission();

    const Location = getLocationModule();
    if (!Location) return false;
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setState((s) => ({ ...s, location }));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get location";
      setState((s) => ({ ...s, error: message }));
      return false;
    }
  }, [state.status, requestPermission]);

  // Check permission on mount
  useEffect(() => {
    if (isWeb) {
      // On web, do nothing by default; the user can request permission explicitly.
      return;
    }
    const Location = getLocationModule();
    if (!Location) {
      setState({ status: "unsupported", location: null, error: null });
      return;
    }
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setState({ status: "granted", location, error: null });
        } else {
          setState({ status: "idle", location: null, error: null });
        }
      } catch {
        setState({ status: "unsupported", location: null, error: null });
      }
    })();
  }, []);

  return {
    ...state,
    requestPermission,
    refreshLocation,
    latitude: state.location?.coords.latitude ?? null,
    longitude: state.location?.coords.longitude ?? null,
    isLocationEnabled: state.status === "granted",
  };
}
