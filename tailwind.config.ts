import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#243047',
        paper: '#fff7fb',
        line: '#eaddec',
        moss: '#4f7f91',
        rust: '#c76767',
        blush: '#ffd6e8',
        mint: '#d7f5e8',
        sky: '#d8edff',
        lilac: '#e6dcff',
        peach: '#ffe1c7'
      }
    }
  },
  plugins: []
}

export default config
