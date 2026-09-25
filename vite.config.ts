// import path from 'node:path'
// import tailwindcss from '@tailwindcss/vite'
// import react from '@vitejs/plugin-react'
// import { defineConfig } from 'vite'

// export default defineConfig({
//   plugins: [react(), tailwindcss()],
//   resolve: { alias: { '@': path.resolve(__dirname, './src') } },
//   // Entry chunk is ~190 kB gzipped (React, router, TanStack Query, Radix, mock DB). Routes are lazy-loaded.
//   build: { chunkSizeWarningLimit: 700 },
// })

import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
  },

  // Entry chunk is ~190 kB gzipped
  // Routes are lazy-loaded.
  build: {
    chunkSizeWarningLimit: 700,
  },
});
