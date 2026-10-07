import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/fonts.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/shell.css'
import './styles/home.css'
import './styles/panels.css'
import './styles/feed.css'
import './styles/placeholder.css'
import './styles/guide.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
