import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import './dungeon.css'
import { ThemeProvider } from './core/theme'
import { App } from './App'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
