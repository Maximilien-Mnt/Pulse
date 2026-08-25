/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@react-native|react-native|@react-navigation|expo(-[a-z0-9]+)?|expo-modules-core|expo-font|@expo|@expo/vector-icons|@hookform|@tanstack|zustand|react-hook-form|@supabase|posthog-react-native|lucide-react-native|lucide-react)/)",
  ],
  testPathIgnorePatterns: ["/node_modules/"],
};
