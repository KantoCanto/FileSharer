import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15191f',
        paper: '#f7f6f2',
        line: '#d9d6cc',
        moss: '#486553',
        rust: '#a55436'
      }
    }
  },
  plugins: []
}

export default config
