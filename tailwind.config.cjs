/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./apps/*/index.html",
    "./apps/*/src/**/*.{js,ts,jsx,tsx}",
    "./packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        cpc: {
          blue: {
            '50': '#8080FF',
            '100': '#6666FF',
            '200': '#4D4DFF',
            '300': '#3333FF',
            '400': '#1A1AFF',
            '500': '#0000FF',
            '600': '#0000E6',
            '700': '#0000CC',
            '800': '#0000B3',
            '900': '#000080'
          },
          red: {
            '50': '#FF8080',
            '100': '#FF6666',
            '200': '#FF4D4D',
            '300': '#FF3333',
            '400': '#FF1A1A',
            '500': '#FF0000',
            '600': '#E60000',
            '700': '#CC0000',
            '800': '#B30000',
            '900': '#800000'
          },
          green: {
            '50': '#80FF80',
            '100': '#66FF66',
            '200': '#4DFF4D',
            '300': '#33FF33',
            '400': '#1AFF1A',
            '500': '#00FF00',
            '600': '#00E600',
            '700': '#00CC00',
            '800': '#00B300',
            '900': '#008000'
          },
          yellow: {
            '50': '#FFFF80',
            '100': '#FFFF66',
            '200': '#FFFF4D',
            '300': '#FFFF33',
            '400': '#FFFF1A',
            '500': '#FFFF00',
            '600': '#E6E600',
            '700': '#CCCC00',
            '800': '#B3B300',
            '900': '#808000'
          },
          magenta: {
            '50': '#FF80FF',
            '100': '#FF66FF',
            '200': '#FF4DFF',
            '300': '#FF33FF',
            '400': '#FF1AFF',
            '500': '#FF00FF',
            '600': '#E600E6',
            '700': '#CC00CC',
            '800': '#B300B3',
            '900': '#800080'
          },
          cyan: {
            '50': '#80FFFF',
            '100': '#66FFFF',
            '200': '#4DFFFF',
            '300': '#33FFFF',
            '400': '#1AFFFF',
            '500': '#00FFFF',
            '600': '#00E6E6',
            '700': '#00CCCC',
            '800': '#00B3B3',
            '900': '#008080'
          },
          orange: {
            '500': '#FF8000'
          },
          grey: {
            '50': '#C0C0C0',
            '500': '#808080',
            '900': '#0a0a0a'
          }
        }
      },
      fontFamily: {
        'cpc': ['JetBrains Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      },
      animation: {
        'blink': 'blink 1s infinite',
        'cursor': 'cursor 1.2s infinite',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        cursor: {
          '0%, 50%': { backgroundColor: 'currentColor' },
          '51%, 100%': { backgroundColor: 'transparent' },
        }
      }
    },
  },
  plugins: [],
}
