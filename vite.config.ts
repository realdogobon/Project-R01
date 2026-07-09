import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('pixi.js')) return 'vendor-pixi';
              if (id.includes('pdfjs-dist') || id.includes('pdf-lib')) return 'vendor-pdf';
              if (id.includes('jspdf')) return 'vendor-jspdf';
              if (id.includes('docx') || id.includes('jszip')) return 'vendor-docs';
              if (id.includes('lexical')) return 'vendor-lexical';
              if (id.includes('react') || id.includes('motion')) return 'vendor-framework';
            }
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
