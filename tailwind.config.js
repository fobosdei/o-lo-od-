/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#0a0a0f',
          surface: '#12121a',
          card: '#1a1a2e',
          border: '#2a2a4a',
          accent: '#00ff88',
          accent2: '#7c3aed',
          accent3: '#06b6d4',
          text: '#e2e8f0',
          muted: '#64748b',
          danger: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
      },
      keyframes: {
        glow: {
          'from': { textShadow: '0 0 5px #00ff88, 0 0 10px #00ff88' },
          'to': { textShadow: '0 0 20px #00ff88, 0 0 30px #00ff88, 0 0 40px #00ff88' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        scan: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' }
        }
      },
      boxShadow: {
        'neon': '0 0 5px #00ff88, 0 0 10px #00ff88, 0 0 20px #00ff88',
        'neon-purple': '0 0 5px #7c3aed, 0 0 10px #7c3aed, 0 0 20px #7c3aed',
        'neon-cyan': '0 0 5px #06b6d4, 0 0 10px #06b6d4, 0 0 20px #06b6d4',
        'glass': 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.4)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
