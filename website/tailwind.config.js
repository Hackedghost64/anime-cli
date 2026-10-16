/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#08090a',
          50: '#16191d',
          100: '#121417',
          200: '#0e1012',
          300: '#08090a',
          400: '#050607',
        },
        cyber: {
          cyan: '#5f8bff',
          blue: '#3b82f6',
          green: '#2bb673',
          matrix: '#00ff66',
          orange: '#ff6b00',
          purple: '#F25BD0',
          yellow: '#facc15',
          dark: '#08090a',
          border: '#1e2430',
          surface: '#0f1319',
          glass: 'rgba(15, 19, 25, 0.75)',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'ui-monospace', 'monospace'],
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(95, 139, 255, 0.4)',
        'glow-green': '0 0 25px -5px rgba(43, 182, 115, 0.4)',
        'glow-purple': '0 0 25px -5px rgba(242, 91, 208, 0.4)',
        'glow-orange': '0 0 25px -5px rgba(255, 107, 0, 0.4)',
        'cyber-card': '0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}
