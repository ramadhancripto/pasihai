// ══════════════════════════════════════════════════════════════
// PASIHAI — STATUS VIEWER HARNESS (component check, si app)
//
// Hu-mount StatusViewerPanel HALISI kwa data ya MAJARIBIO (component
// check pekee — data hii HAIINGII kwenye app wala DB). Inatumika
// kupima/kupiga picha muonekano wa story viewer: segments, kichwa,
// kadi ya maandishi, hisia za haraka na kisanduku cha jibu.
//
// Ukurasa: docs/shots/status/status-viewer-harness.html
// (Vite dev server huhudumia faili hii moja kwa moja.)
// ══════════════════════════════════════════════════════════════

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* CSS: mfuatano sawa na src/main.jsx (harness ni zana ya dev pekee) */
import '../src/styles/fonts.css'
import '../src/styles/tokens.css'
import '../src/styles/base.css'
import '../src/styles/components.css'
import '../src/styles/feed.css'
import '../src/styles/visual-v2.css'
import '../src/styles/visual-v4.css'
import '../src/styles/visual-v7-mobile.css'
import '../src/styles/visual-v8-cleanup.css'
import '../src/styles/status-studio.css'

import { StatusViewerPanel } from '../src/components/feed/StatusPanels.jsx'

/* Picha ya majaribio (data URI) — haihitaji mtandao */
function demoAsset(w, h, hue = 165) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue} 58% 72%)"/><stop offset="1" stop-color="hsl(${hue} 52% 26%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
    `<circle cx="${w * 0.5}" cy="${h * 0.42}" r="${Math.min(w, h) / 5}" fill="rgba(255,255,255,0.55)"/>` +
    `<text x="${w / 2}" y="${h * 0.72}" font-family="sans-serif" font-size="${Math.round(w / 12)}" ` +
    `text-anchor="middle" fill="rgba(255,255,255,0.92)">Status ya picha</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const user = {
  id: 'amina',
  name: 'Amina Zanzibar',
  handle: '@amina_zanzibar',
  type: 'friend',
  avatarTone: 'plum',
}

const statuses = [
  {
    id: 'h1',
    tone: 'blue',
    text: 'Machweo ya kipekee Stone Town leo. Upepo mwanana wa Bahari ya Hindi. #ZanzibarLife',
    mediaUrl: demoAsset(1080, 1920, 195),
    mediaType: 'image',
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    ago: 'dakika 18',
    expiresAtLabel: 'kesho 18:40',
    user,
  },
  {
    id: 'h2',
    tone: 'gold',
    text: 'Picha ya mandhari ya Kijani — kuonyesha rangi mbadala zinazohifadhiwa kwenye data.',
    mediaUrl: null,
    mediaType: null,
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    ago: 'saa 3',
    expiresAtLabel: 'kesho 09:10',
    user,
  },
  {
    id: 'h3',
    tone: 'green',
    text: '',
    mediaUrl: demoAsset(1080, 1920, 150),
    mediaType: 'image',
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    ago: 'saa 5',
    expiresAtLabel: 'kesho 11:20',
    user,
  },
]

const group = { id: 'g-amina', user, own: false, statuses, initialStatusId: 'h1' }

createRoot(document.getElementById('status-harness')).render(
  <StrictMode>
    <div className="psh-col psh-col--home" style={{ padding: '14px 16px 28px' }}>
      <StatusViewerPanel
        group={group}
        onToast={(message) => {
          const el = document.getElementById('harness-toast')
          if (!el) return
          el.textContent = message
          el.classList.add('is-on')
          window.clearTimeout(window.__harnessToast)
          window.__harnessToast = window.setTimeout(() => el.classList.remove('is-on'), 2600)
        }}
        onChanged={() => {}}
        onClose={() => {
          const el = document.getElementById('harness-toast')
          if (el) {
            el.textContent = 'onClose() imeitwa — viewer inafungwa'
            el.classList.add('is-on')
          }
        }}
        onAdd={() => {}}
      />
    </div>
    <div id="harness-toast" className="harness-toast" role="status" aria-live="polite" />
  </StrictMode>,
)
