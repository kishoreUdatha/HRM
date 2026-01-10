/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // HRZi brand colors
        hrzi: {
          cyan: '#00d4ff',
          blue: '#0066ff',
          indigo: '#4f46e5',
          purple: '#8b5cf6',
          magenta: '#d946ef',
          pink: '#ec4899',
        },
      },
      backgroundImage: {
        'gradient-hrzi': 'linear-gradient(135deg, #00d4ff 0%, #0066ff 25%, #4f46e5 50%, #8b5cf6 75%, #d946ef 100%)',
        'gradient-hrzi-subtle': 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #fae8ff 100%)',
        'gradient-hrzi-dark': 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #2e1065 100%)',
        'gradient-hrzi-button': 'linear-gradient(135deg, #0066ff 0%, #4f46e5 50%, #8b5cf6 100%)',
        'gradient-hrzi-card': 'linear-gradient(135deg, #4f46e5 0%, #8b5cf6 50%, #d946ef 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'gradient': 'gradient 8s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(79, 70, 229, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
