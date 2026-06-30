import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f1115",
        card: "#1a1d24",
        cardalt: "#252a36",
        line: "#2e3340",
        accent: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
        },
        ok: "#10b981",
        warn: "#f59e0b",
        bad: "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
