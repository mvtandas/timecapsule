/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#FAC638',
        'primary-light': '#A7F3D0',
        'primary-dark': '#047857',
        'background-light': '#f8f8f5',
        'background-dark': '#231e0f',
        'text-light': '#111827',
        'text-dark': '#F9FAFB',
        'accent-light': '#FFD166',
        'accent-dark': '#06D6A0',
      },
      fontFamily: {
        'display': ['PlusJakartaSans_400Regular', 'PlusJakartaSans_500Medium', 'PlusJakartaSans_700Bold', 'PlusJakartaSans_800ExtraBold'],
      },
      borderRadius: {
        'DEFAULT': '0.5rem',
        'lg': '1rem',
        'xl': '1.5rem',
        'full': '9999px',
      },
      boxShadow: {
        'soft': '0 4px 15px rgba(0, 0, 0, 0.05)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
      },
    },
  },
  plugins: [],
}