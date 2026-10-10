/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DJANGO = 'http://127.0.0.1:8000';
const proxied = [
  '/api_frontend',
  '/login',
  '/complete',
  '/disconnect',
  '/logout',
  '/managestats',
  '/admin',
  '/static',
  '/media',
  '/old',
  '/angular',
];

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/static/spa/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // changeOrigin stays false so Django sees Host localhost:5173 (CSRF origin check, OAuth redirect).
    proxy: Object.fromEntries(proxied.map((p) => [p, { target: DJANGO }])),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}));
