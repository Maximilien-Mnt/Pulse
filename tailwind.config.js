/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1E6BFF",
        "primary-dark": "#1550CC",
        accent: "#FFD600",
        success: "#22C55E",
        error: "#EF4444",
        warning: "#F59E0B",
        neutral: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
      },
      fontFamily: {
        outfit: ["Outfit_400Regular", "sans-serif"],
        "outfit-medium": ["Outfit_500Medium", "sans-serif"],
        "outfit-semibold": ["Outfit_600SemiBold", "sans-serif"],
        "outfit-bold": ["Outfit_700Bold", "sans-serif"],
      },
    },
  },
  plugins: [],
};
