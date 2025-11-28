module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#fff8f0', 100: '#f4e9dd', 300: '#d9a56e', 500: '#c8712f', 700: '#8a3f1b' },
        panel: { 50: '#fbf9f6', 100: '#f0ebe5', 300: '#cfc7be' },
        rail: { 500: '#6b3fa7' }
      }
    }
  },
  plugins: [],
}
