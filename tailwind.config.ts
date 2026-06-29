import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        agent: {
          model: '#5E6AD2',
          harness: '#787F95',
          success: '#2DA44E',
          warning: '#D48C20',
          error: '#D23B3B',
        },
      },
    },
  },
  plugins: [],
} satisfies Config