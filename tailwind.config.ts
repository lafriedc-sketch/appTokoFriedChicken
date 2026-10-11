import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        la: {
          bg: "#FDF2F4",
          soft: "#FCE7F3",
          card: "#FFFFFF",
          primary: "#F43F5E",
          primaryHover: "#E11D48",
          accent: "#FB7185",
          coral: "#FDA4AF",
          mint: "#6EE7B7",
          dark: "#1F2937",
          subtle: "#6B7280",
          border: "#FFE4E6",
        },
      },
      borderRadius: {
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      keyframes: {
        floatUp: {
          "0%": { transform: "translateY(0) scale(0.8)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateY(-60px) scale(1.1)", opacity: "0" },
        },
        popIn: {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "70%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        bloom: {
          "0%, 100%": { transform: "scale(0.9) rotate(0deg)" },
          "50%": { transform: "scale(1.1) rotate(180deg)" },
        },
      },
      animation: {
        "float-up": "floatUp 1.2s ease-out forwards",
        "pop-in": "popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        bloom: "bloom 2s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
