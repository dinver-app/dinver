/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        app: {
          primary: {
            DEFAULT: "#0B6958",
            dark: "#0B6958",
          },
          secondary: {
            DEFAULT: "#5617E9",
            dark: "#8b5cf6",
          },
          icon: {
            DEFAULT: "#71717a",
            dark: "#a1a1aa",
          },
          star: "#F3B200",
        },
        background: {
          light: "#f9fafb",
          dark: "#0d0d0d",
        },
        card: {
          light: "#f2f2f2",
          dark: "#1A1A1A",
        },
        searchBar: {
          light: "#f2f2f2",
          dark: "#222222",
        },
        text: {
          primary: {
            light: "#000",
            dark: "#F5F5F5",
          },
          secondary: {
            light: "#71717a",
            dark: "#8b8b8b",
          },
        },
        border: {
          light: "#e5e7eb",
          dark: "#1F2937",
          primary: "#446F67"
        },
        bottomBar: {
          active: {
            light: "#059669",
            dark: "#10b981",
          },
          inactive: {
            light: "#71717a",
            dark: "#a1a1aa",
          },
          background: {
            light: "#ffffff",
            dark: "#1a1a1a",
          },
        },
      },
      fontFamily: {
        sans: ["Degular-Regular"],
        degular: ["Degular-Regular"],
        "degular-light": ["Degular-Light"],
        "degular-thin": ["Degular-Thin"],
        "degular-bold": ["Degular-Bold"],
        "degular-semibold": ["Degular-Semibold"],
        "degular-black": ["Degular-Black"],
        "degular-medium": ["Degular-Medium"],
      },
    },
  },
  plugins: [],
  corePlugins: {
    backgroundOpacity: true,
  },
};
