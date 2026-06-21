/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Voorcap ember accent (whisper / brand)
        primary: '#E8633A',
        'primary-light': 'rgba(232,99,58,0.12)',
        'primary-dark': '#C44A24',
        // Cap-type accents
        moss: '#3D9B7A',
        gold: '#D4A24C',
        purple: '#7B6CB0',
        'cap-blue': '#3A7BD5',
        // Dark surfaces
        'background-light': '#0B0E13',
        'background-dark': '#0B0E13',
        bg2: '#11151C',
        bg3: '#181E28',
        card: '#141920',
        'text-light': '#EDE8DD',
        'text-dark': '#EDE8DD',
        'accent-light': '#E8633A',
        'accent-dark': '#E8633A',
      },
      fontFamily: {
        'display': ['Georgia', 'serif'],
        'sans': ['system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': '0.5rem',
        'lg': '0.875rem',
        'xl': '1.125rem',
        'full': '9999px',
      },
      boxShadow: {
        'soft': '0 8px 24px rgba(0, 0, 0, 0.25)',
        'glow': '0 4px 16px rgba(232,99,58,0.35)',
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
