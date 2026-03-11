/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        secondary: "#64748b",
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        'fade-in': {
          'from': {
            opacity: '0',
            transform: 'translateY(20px) scale(0.95)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [],
};
