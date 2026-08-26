/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      transitionTimingFunction: {
        // A slow, settled ease — no overshoot/bounce — for the handful of
        // deliberate "something changed" moments (tab switches, the
        // difficulty bar filling in). Everyday hover/focus states stay on
        // Tailwind's default `transition-colors` timing.
        calm: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(3px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 450ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
