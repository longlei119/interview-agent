import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          25: "#fefaf7",
          50: "#fef3ed",
          100: "#fde4d5",
          200: "#fbc6aa",
          300: "#f8a07e",
          400: "#f47a52",
          500: "#d6492f",
          600: "#b8381f",
          700: "#9a2d18",
          800: "#7c2314",
          900: "#5e1a0f",
        },
        canvas: "#f6f1e7",
        "canvas-deep": "#efe9dc",
        surface: "#fbf8f1",
        ink: "#1c1a17",
        "ink-soft": "#4a463f",
        muted: "#8c867a",
        line: "#ddd5c4",
        accent: {
          25: "#f5f8ff",
          50: "#eef4ff",
          100: "#dbe7ff",
          200: "#bcd0ff",
          300: "#8fb0ff",
          400: "#5e87ff",
          500: "#3b6cff",
          600: "#2f55e0",
          700: "#2544b8",
          800: "#1e3791",
          900: "#172b6e",
        },
        gold: "#b88a3e",
        green: "#5f7a4d",
        blue: "#3a5e7a",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
        serif: [
          "var(--font-serif)",
          "Noto Serif SC",
          "Source Han Serif SC",
          "SimSun",
          "serif",
        ],
        mono: [
          "var(--font-mono)",
          "Space Mono",
          "JetBrains Mono",
          "SFMono-Regular",
          "Consolas",
          "monospace",
        ],
      },
      maxWidth: {
        content: "68rem",
      },
      letterSpacing: {
        tight: "-0.01em",
        tighter: "-0.02em",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(28,26,23,0.04), 0 1px 3px 0 rgba(28,26,23,0.06)",
        card: "0 1px 2px 0 rgba(28,26,23,0.04), 0 2px 8px -2px rgba(28,26,23,0.06)",
        hover:
          "0 4px 12px -2px rgba(28,26,23,0.08), 0 2px 6px -2px rgba(28,26,23,0.06)",
        pop: "0 12px 32px -8px rgba(28,26,23,0.18), 0 4px 12px -4px rgba(28,26,23,0.1)",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(0.22, 0.61, 0.36, 1)",
        "scale-in": "scale-in 150ms cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
