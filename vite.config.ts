import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Two pages: the site front page at "/" and the Stat Star app at "/stat-star/".
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        statStar: resolve(import.meta.dirname, 'stat-star/index.html'),
        frames: resolve(import.meta.dirname, 'frames/index.html'),
      },
    },
  },
})
