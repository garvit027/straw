import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /straw/. Root-domain hosts (Vercel,
// Netlify, Cloudflare Pages) need assets at /assets/... instead. VITE_BASE_PATH
// always wins if it is set explicitly.
const rootHosted = Boolean(
  process.env.VERCEL || process.env.NETLIFY || process.env.CF_PAGES
);

export default defineConfig({
  base: process.env.VITE_BASE_PATH || (rootHosted ? '/' : '/straw/'),
  plugins: [react()],
});
