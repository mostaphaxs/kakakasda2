import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'




export default defineConfig({
  plugins: [react()],
  // THIS IS THE FIX:
  server: {
    port: 5173,     
    strictPort: true 
  },
  base: './', 
  
  // Optional: ensures the build goes to the 'dist' folder Tauri is looking for
  build: {
    outDir: 'dist',
    // Split big libraries into their own cached files; pages are lazy-loaded in App.tsx
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vite's lazy-loading helper must live with the startup code
          if (id.includes('preload-helper') || id.includes('commonjsHelpers')) return 'react';
          if (!id.includes('node_modules')) return;
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react';
          if (/[\\/](recharts|d3-[\w-]+|victory-vendor)[\\/]/.test(id)) return 'charts';
          if (/[\\/](jspdf|html2canvas|html-to-image|canvg|dompurify|fflate)[\\/]/.test(id)) return 'pdf';
          if (/[\\/]xlsx[\\/]/.test(id)) return 'excel';
          if (/[\\/]docx[\\/]/.test(id)) return 'word';
          if (/[\\/]@google[\\/]/.test(id)) return 'ai';
          if (/[\\/](react-markdown|remark-[\w-]+|micromark[\w-]*|mdast-[\w-]+|unified)[\\/]/.test(id)) return 'markdown';
        },
      },
    },
  }
})