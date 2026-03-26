import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

const budibaseTarget = "http://localhost:10000"

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: budibaseTarget,
        changeOrigin: true,
      },
      "/socket": {
        target: budibaseTarget,
        changeOrigin: true,
        ws: true,
      },
      "/worker": {
        target: budibaseTarget,
        changeOrigin: true,
      },
      "/_bb": {
        target: budibaseTarget,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/_bb/, ""),
      },
    },
  },
})
