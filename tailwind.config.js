/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#ED62EF',
        'primary-light': '#6A56FF',
        'primary-dark': '#00C9FF',
        'background-light': '#0B0B0B',
        'background-dark': '#0B0B0B',
        'text-light': '#FFFFFF',
        'text-dark': '#CCCCCC',
        'accent-light': '#FFD500',
        'accent-dark': '#00C9FF',
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