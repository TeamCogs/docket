import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper:       "var(--paper)",
        "paper-2":   "var(--paper-2)",
        surface:     "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",

        ink: {
          DEFAULT: "var(--ink)",
          2:       "var(--ink-2)",
          3:       "var(--ink-3)",
          4:       "var(--ink-4)",
          5:       "var(--ink-5)",
        },

        rule: {
          DEFAULT: "var(--rule)",
          2:       "var(--rule-2)",
          strong:  "var(--rule-strong)",
        },

        navy: {
          DEFAULT:  "var(--navy)",
          2:        "var(--navy-2)",
          soft:     "var(--navy-soft)",
          "soft-2": "var(--navy-soft-2)",
        },
        sage: {
          DEFAULT:  "var(--sage)",
          soft:     "var(--sage-soft)",
          "soft-2": "var(--sage-soft-2)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          soft:    "var(--amber-soft)",
        },
        brick: {
          DEFAULT:  "var(--brick)",
          soft:     "var(--brick-soft)",
          "soft-2": "var(--brick-soft-2)",
        },
      },

      fontFamily: {
        sans:  ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono:  ["var(--font-mono)"],
      },

      fontSize: {
        display: ["44px", { lineHeight: "1.08", letterSpacing: "-0.028em", fontWeight: "500" }],
        h1:      ["32px", { lineHeight: "1.15", letterSpacing: "-0.022em", fontWeight: "500" }],
        h2:      ["22px", { lineHeight: "1.25", letterSpacing: "-0.014em", fontWeight: "500" }],
        h3:      ["16px", { lineHeight: "1.30", letterSpacing: "-0.008em", fontWeight: "500" }],
        body:    ["15px", { lineHeight: "1.55" }],
        "body-2":["14px", { lineHeight: "1.55" }],
        small:   ["13px", { lineHeight: "1.50" }],
        micro:   ["11.5px", { lineHeight: "1.40", letterSpacing: "0.04em" }],
      },

      borderRadius: {
        sm:      "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md:      "var(--radius-md)",
        lg:      "var(--radius-lg)",
        xl:      "var(--radius-xl)",
      },

      boxShadow: {
        "1": "var(--shadow-1)",
        "2": "var(--shadow-2)",
        "3": "var(--shadow-3)",
      },

      maxWidth: {
        prose: "68ch",
        brief: "82ch",
      },

      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },

      keyframes: {
        "slide-right": {
          from: { transform: "translateX(20px)", opacity: "0" },
          to:   { transform: "translateX(0)",     opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to:   { transform: "translateY(0)",     opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" }, to: { opacity: "1" },
        },
        "docket-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.55" },
        },
      },
      animation: {
        "slide-right":  "slide-right 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "slide-up":     "slide-up 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "fade-in":      "fade-in 200ms ease",
        "docket-pulse": "docket-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
