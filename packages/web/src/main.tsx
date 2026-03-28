import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setApiUrl } from '@bt-roster/core'
import './styles/index.css'
import { App } from './App'

if (import.meta.env.DEV) {
  setApiUrl('/api/graphql')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
