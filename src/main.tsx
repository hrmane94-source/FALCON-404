import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'
import { CaseProvider } from './context/CaseContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CaseProvider>
        <App />
      </CaseProvider>
    </ThemeProvider>
  </StrictMode>,
)
