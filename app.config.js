export default {
  expo: {
    name: "Pulse",
    slug: "pulse",
    scheme: "pulse",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1E6BFF",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.pulse.app",
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          "Pulse a besoin d'accéder à vos photos pour votre profil et vos publications.",
        NSCameraUsageDescription:
          "Pulse utilise l'appareil photo pour ajouter des images à vos posts.",
      },
    },
    android: {
      package: "com.pulse.app",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#1E6BFF",
      },
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          photosPermission:
            "Pulse accède à vos photos pour les publications et le profil.",
        },
      ],
      "expo-notifications",
      "expo-localization",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
      posthogHost: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",
    },
  },
};
