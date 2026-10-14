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
import './styles/system.css'
import './styles/chat.css'
import './styles/gundua.css'
import './styles/spaces.css'
import './styles/guide.css'
import './styles/brand.css'
import './styles/login.css'
import './styles/visual-v2.css'
import './styles/visual-v3.css'
import './styles/visual-v4.css'
import './styles/visual-v5.css'
import './styles/visual-v5-spaces.css'
import './styles/visual-v6-paper.css'
import './styles/visual-v7-mobile.css'
import './styles/visual-v8-cleanup.css'
import './styles/visual-v9-topbar.css'
import './styles/visual-v10-chat-nav.css'
import './styles/quick-post.css'
import './styles/mentions.css'
import './styles/feed-modes.css'
import './styles/post-studio.css'
import './styles/video-reels.css'
// Safu ya juu ya Home feed (upana · media ya adaptive · desktop layout)
import './styles/feed-responsive.css'
// Safu ya juu ya Status (uundaji · preview · muonekano wa story)
import './styles/status-studio.css'
import './styles/chat-studio.css'
// Safu ya ChatHai Groups (wizard ya uundaji · DP/cover · settings)
import './styles/groups.css'

import App from './App.jsx'
import Splash from './components/Splash.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'
import { AuthGate } from './lib/AuthGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <Splash>
          <App />
        </Splash>
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
)

// ── Service Worker Registration ────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[Main] Service Worker registered:', registration.scope)
      })
      .catch((error) => {
        console.warn('[Main] Service Worker registration failed:', error)
      })
  })
}
