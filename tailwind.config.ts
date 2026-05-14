import type { Config } from "tailwindcss";

/**
 * Docket palette: deep navy + warm off-white. Reads "professional, not techy".
 * Avoid loud color — this is a tool malpractice-conscious lawyers will sit in
 * front of for hours. No accent reds except for risk flags and contradictions.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f6f5",
          100: "#e7e6e3",
          200: "#cfccc6",
          300: "#a8a39a",
          400: "#7c766b",
          500: "#5b5549",
          600: "#454035",
          700: "#312e26",
          800: "#1f1d18",
          900: "#100f0c",
        },
        navy: {
          50: "#eef1f6",
          100: "#d4dbe7",
          200: "#a9b6cf",
          300: "#7e92b7",
          400: "#536d9f",
          500: "#384e7d",
          600: "#2a3c61",
          700: "#1f2c47",
          800: "#141d2f",
          900: "#0a0f18",
        },
        // Reserved exclusively for risk flags + contradictions.
        flag: {
          DEFAULT: "#b14545",
          subtle: "#f5e3e3",
        },
        // Reserved exclusively for "grounded" confirmations.
        grounded: {
          DEFAULT: "#39705a",
          subtle: "#e2efea",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        serif: ["Georgia", "Charter", "ui-serif", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      maxWidth: {
        prose: "68ch",
        brief: "82ch",
      },
    },
  },
  plugins: [],
};

export default config;
