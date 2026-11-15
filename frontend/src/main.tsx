import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import './styles.css'
import App from './App.tsx'
import { theme } from './theme/theme'

// The theme is the only place the colours live (src/theme), and CssBaseline
// puts the page background, the text colour and the font on it. The dark
// colours are on :root, so there is no flash before React renders.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
