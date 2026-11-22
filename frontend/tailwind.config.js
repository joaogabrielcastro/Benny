/** @type {import('tailwindcss').Config} */

/**
 * Identidade Benny's — "oficina de precisão".
 * Neutros em grafite frio + um único azul de marca (alinhado ao logo #1e4bb8).
 *
 * `gray`, `slate` e `zinc` apontam para a mesma escala de neutros e
 * `blue`/`indigo` para a escala da marca: telas antigas que ainda usam
 * essas classes ficam automaticamente consistentes com o novo sistema.
 */
const ink = {
  50: "#f7f8fa",
  100: "#eef0f3",
  200: "#e2e5ea",
  300: "#cbd0d8",
  400: "#9aa2ae",
  500: "#6b7482",
  600: "#4e5663",
  700: "#3a414c",
  800: "#272c34",
  850: "#1d2128",
  900: "#15181d",
  950: "#0d0f13",
};

const brand = {
  50: "#eef4ff",
  100: "#dce7fe",
  200: "#c0d4fd",
  300: "#94b5fb",
  400: "#6190f7",
  500: "#3c6ef1",
  600: "#2655dc",
  700: "#1e4bb8",
  800: "#1d3f93",
  900: "#1c3774",
  950: "#132246",
};

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink,
        gray: ink,
        slate: ink,
        zinc: ink,
        brand,
        blue: brand,
        indigo: brand,
        surface: {
          DEFAULT: ink[100],
          card: "#ffffff",
          muted: ink[50],
        },
        sidebar: {
          DEFAULT: ink[950],
          hover: ink[850],
          active: brand[900],
        },
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(13 15 19 / 0.05)",
        "card-hover": "0 4px 12px -2px rgb(13 15 19 / 0.08), 0 2px 4px -2px rgb(13 15 19 / 0.05)",
        pop: "0 16px 40px -12px rgb(13 15 19 / 0.25), 0 4px 12px -4px rgb(13 15 19 / 0.12)",
        sidebar: "1px 0 0 0 rgb(13 15 19 / 0.06)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
        "slide-up": "slide-up 0.22s ease-out",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
