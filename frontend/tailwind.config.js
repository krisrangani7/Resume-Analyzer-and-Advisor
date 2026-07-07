/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F5F6F3",
        surface: "#FFFFFF",
        ink: "#1C1E26",
        muted: "#6B7280",
        border: "#E3E3DE",
        recruiter: {
          DEFAULT: "#1F6F5C",
          soft: "#E4F0EC",
        },
        student: {
          DEFAULT: "#B8862B",
          soft: "#F5EBD8",
        },
        reject: {
          DEFAULT: "#B3441E",
          soft: "#F5E5DE",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
