// @ts-check
import animate from "tailwindcss-animate"
import { iconsPlugin, getIconCollections } from "@egoist/tailwindcss-icons"

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["variant", [".dark &", ".frost &"]],
  content: ["./src/renderer/**/*.tsx"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        // Frost theme semantic colors (available via frost-ok, frost-warn, etc.)
        frost: {
          ok: "rgba(182, 245, 149, 0.95)",
          warn: "rgba(255, 208, 133, 0.95)",
          fail: "rgba(255, 128, 128, 0.96)",
          edge: "rgba(166, 255, 98, 0.62)",
          "edge-teal": "rgba(118, 185, 0, 0.42)",
          glass: "rgba(8, 12, 8, 0.66)",
          line: "rgba(166, 255, 98, 0.24)",
        },
      },
      fontFamily: {
        frost: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      animation: {
        "frost-breath": "frost-breath 3.5s ease-in-out infinite",
        "frost-pulse": "frost-svc-pulse 2.6s ease-in-out infinite",
        "frost-glow": "frost-glow-pulse 2.4s ease-in-out infinite",
        "frost-scan": "frost-scan-sweep 4s linear infinite",
      },
    },
  },
  plugins: [
    animate,
    iconsPlugin({
      collections: getIconCollections(["mingcute"]),
    }),
  ],
}
