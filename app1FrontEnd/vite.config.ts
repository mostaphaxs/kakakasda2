import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'




export default defineConfig({
  plugins: [react()],
  // THIS IS THE FIX:
  base: './', 
  
  // Optional: ensures the build goes to the 'dist' folder Tauri is looking for
  build: {
    outDir: 'dist',
  }
})