import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070b16",
          900: "#0b1120",
          850: "#0f1626",
          800: "#151d31",
          700: "#1e293b",
          600: "#334155",
        },
        brand: {
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 30px -18px rgba(0,0,0,0.7)",
      },
    },
  },
  plugins: [],
};
export default config;
