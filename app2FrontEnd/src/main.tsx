import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryProvider } from './providers/QueryProvider'
import { initializeApiConfig } from './lib/api'

// Initialize API config from Tauri before rendering
initializeApiConfig().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryProvider>
        <App />
      </QueryProvider>
    </StrictMode>,
  )
});
