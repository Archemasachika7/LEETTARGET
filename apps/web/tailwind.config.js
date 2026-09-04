/** Tailwind reads every color/space/motion value from the CSS custom
 * properties defined in src/index.css, so there is exactly one place a token
 * is defined and both themes stay in lockstep. Colors use space-separated RGB
 * channels so alpha modifiers (`bg-brand/10`) work off the same token.
 *
 * @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        elevated: "rgb(var(--elevated) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",

        text: "rgb(var(--text) / <alpha-value>)",
        "text-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        "text-muted": "rgb(var(--text-muted) / <alpha-value>)",

        brand: "rgb(var(--brand) / <alpha-value>)",
        "brand-contrast": "rgb(var(--brand-contrast) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",

        easy: "rgb(var(--easy) / <alpha-value>)",
        medium: "rgb(var(--medium) / <alpha-value>)",
        hard: "rgb(var(--hard) / <alpha-value>)",
        unknown: "rgb(var(--unknown) / <alpha-value>)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      fontFamily: {
        sans: ["Geist", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      // Fluid steps for the few figures that carry a page (see index.css).
      // Tracking tightens as size grows, which is what keeps large numerals
      // reading as display type rather than as inflated body text.
      fontSize: {
        display: ["var(--step-display)", { lineHeight: "0.95", letterSpacing: "-0.03em" }],
        headline: ["var(--step-headline)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        title: ["var(--step-title)", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
      },
      transitionDuration: {
        fast: "var(--motion-fast)",
        normal: "var(--motion-normal)",
        progress: "var(--motion-progress)",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--ease)",
        smooth: "var(--ease)",
      },
      maxWidth: {
        content: "1400px",
      },
    },
  },
  plugins: [],
};
