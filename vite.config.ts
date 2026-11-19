import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `vite build --mode prototype` gera um único HTML de demonstração (sem service worker), usado como prévia.
export default defineConfig(({ mode }) => mode === 'prototype' ? {
  plugins: [react(), tailwindcss(), viteSingleFile()],
  define: { 'import.meta.env.VITE_PREVIEW': JSON.stringify('1') },
  build: { outDir: 'dist-prototype', assetsInlineLimit: 100_000_000 },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
} : {
  // em subpasta (GitHub Pages) o build recebe BASE_PATH, ex.: /Pessoal-feminino-/
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Lume — sua vida organizada',
        short_name: 'Lume',
        description: 'Seu espaço pessoal para organizar rotina, agenda, tarefas e hábitos.',
        lang: 'pt-BR',
        start_url: process.env.BASE_PATH ?? '/',
        scope: process.env.BASE_PATH ?? '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF7F2',
        theme_color: '#FAF7F2',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${process.env.BASE_PATH ?? '/'}index.html`,
        // Dados pessoais NUNCA são guardados no cache do service worker.
        runtimeCaching: [],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
})
