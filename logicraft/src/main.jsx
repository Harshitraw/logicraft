import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initializeBackendPersistence } from './api.js'

const root = createRoot(document.getElementById('root'))

initializeBackendPersistence().finally(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
