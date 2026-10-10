import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#202c28",
        parchment: "#f6ead3",
        apricot: "#ffb074",
        sage: "#b6d78a",
        pine: "#174b3c",
        berry: "#873f39",
        cream: "#fff7e9",
        orange: {
          50: "#fff0df",
          100: "#ffe0bc",
          200: "#ffc998",
          400: "#e47b48",
          500: "#b94d28",
          600: "#9f3e1e",
          700: "#843719",
        },
      },
      boxShadow: {
        halo: "0 24px 80px rgba(39, 22, 9, 0.15)",
      },
      backgroundImage: {
        "grain-glow":
          "radial-gradient(circle at top left, rgba(243, 154, 99, 0.35), transparent 35%), radial-gradient(circle at bottom right, rgba(154, 192, 140, 0.32), transparent 28%)",
      },
      fontFamily: {
        display: [
          "\"Nunito\"",
          "\"Avenir Next Rounded\"",
          "\"Trebuchet MS\"",
          "\"Segoe UI\"",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        body: [
          "\"Nunito\"",
          "\"Avenir Next Rounded\"",
          "\"Segoe UI\"",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
