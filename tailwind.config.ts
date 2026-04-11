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
        ink: "#1b120d",
        parchment: "#f7efe3",
        apricot: "#f39a63",
        sage: "#9ac08c",
        pine: "#33563c",
        berry: "#7e3e44",
        cream: "#fffaf3",
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
          "\"Iowan Old Style\"",
          "\"Palatino Linotype\"",
          "\"Book Antiqua\"",
          "Georgia",
          "serif",
        ],
        body: [
          "\"Avenir Next\"",
          "Avenir",
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
