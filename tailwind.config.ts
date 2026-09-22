import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // US flag palette. The official flag colors are Old Glory Blue
        // (#0A3161) and Old Glory Red (#B31942) — used as the real brand
        // colors rather than a decorative stars-and-stripes motif, which
        // keeps the site patriotic-adjacent but professional.
        ink: "#0A2240",      // deepest navy — body text
        navy: "#0A3161",     // Old Glory Blue — primary brand
        navyLight: "#14427C",
        navyDeep: "#071F3D",
        paper: "#F6F8FB",
        usRed: "#B31942",    // Old Glory Red — CTAs, key alerts
        usRedDark: "#8F1435",
        usRedLight: "#D93A60",
        taxi: "#FFC627",     // legacy accent, kept for minor highlights (flags, etc.)
        signal: "#1B7A43",
        alert: "#C6402B",
        slate: "#5A6678",
        mist: "#EDF1F7",
        cloud: "#E3E9F2",
        line: "#DDE4EE",     // single border token — was a scatter of hex literals
      },
      boxShadow: {
        card: "0 1px 2px rgba(10, 34, 64, 0.06), 0 1px 3px rgba(10, 34, 64, 0.04)",
        cardHover: "0 10px 30px rgba(10, 34, 64, 0.12)",
        nav: "0 1px 0 rgba(10, 34, 64, 0.06)",
      },
      fontFamily: {
        display: ["Manrope", "Noto Sans Bengali", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter", "Noto Sans Bengali", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: {
        prose: "68ch",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
