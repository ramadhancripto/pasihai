// ════════════════════════════════════════════════════════════════
// PASIHAI — SSR check ya Creator Studio
// Matumizi: vite build --ssr scripts/ssr-creator-studio.jsx --outDir node_modules/.ssr-studio && node node_modules/.ssr-studio/ssr-creator-studio.js
// Inathibitisha kwamba ukurasa mkuu na sehemu zote zinarender bila hitilafu,
// na kwamba HTML haina undefined/NaN. Data halisi inapakiwa kwenye browser tu.
// ════════════════════════════════════════════════════════════════

import { renderToString } from 'react-dom/server'
import CreatorStudio from '../src/pages/CreatorStudio.jsx'
import { StudioAds, StudioBrand, StudioCollab, StudioMonetization, StudioPremium, StudioProjects } from '../src/components/studio/sections/StudioBusiness.jsx'
import { StudioAudience } from '../src/components/studio/sections/StudioInsights.jsx'
import { StudioTemplates } from '../src/components/studio/sections/StudioCreate.jsx'
import StudioCreate from '../src/components/studio/sections/StudioCreate.jsx'
import { SECTIONS, STUDIO_NAV } from '../src/studio/studioModel.js'
import CreativeHub from '../src/components/creative/CreativeHub.jsx'
import CreativeEditor from '../src/components/creative/CreativeEditor.jsx'
import { createDocument, makeText, makeShape, applyTemplate } from '../src/creative/creativeModel.js'

globalThis.window = globalThis.window || {
  location: { search: '', href: 'http://localhost/', hash: '' },
  scrollTo() {}, history: { replaceState() {} },
  addEventListener() {}, removeEventListener() {},
  setTimeout: () => 0, clearTimeout() {},
}
globalThis.document = globalThis.document || { addEventListener() {}, removeEventListener() {}, body: { style: {} } }

const noop = () => {}
let pass = 0, fail = 0
function check(name, fn) {
  try {
    const html = fn()
    if (typeof html !== 'string' || html.length < 50) throw new Error('HTML fupi sana')
    if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(html)) throw new Error('HTML ina undefined/NaN/[object Object]')
    pass++
    console.log(`✓ ${name} (${html.length} bytes)`)
  } catch (e) {
    fail++
    console.log(`✗ ${name}: ${e.message}`)
  }
}

const actions = { onOpenPostStudio: noop, onOpenStatus: noop, onOpenLive: noop, onOpenPanel: noop, onOpenProfile: noop, onOpenNotifications: noop, onNavigate: noop }

check('CreatorStudio (ukurasa mkuu)', () => renderToString(<CreatorStudio {...actions} online={true} feedVersion={0} />))
check('CreatorStudio nje ya mtandao', () => renderToString(<CreatorStudio {...actions} online={false} />))
check('Urambazaji: sehemu 10 zinaonekana na sehemu zote 14 zinafikiwa', () => {
  const html = renderToString(<CreatorStudio {...actions} />)
  for (const t of STUDIO_NAV) if (!html.includes(t.label)) throw new Error(`eneo halipo: ${t.label}`)
  // Sub-items huonekana chini ya eneo linalotumika (Studio Home kwa chaguo-msingi); sehemu zote zinafikiwa kupitia STUDIO_NAV.
  const reachable = new Set(STUDIO_NAV.flatMap((t) => [t.section, ...t.children.map((c) => c.section)]).filter(Boolean))
  for (const s of SECTIONS) if (!reachable.has(s.id)) throw new Error(`sehemu haifikiki kwenye urambazaji: ${s.label}`)
  return html
})
check('Create gallery', () => renderToString(<StudioCreate {...actions} />))
check('Templates', () => renderToString(<StudioTemplates {...actions} />))
check('Advertisements (imepangwa)', () => renderToString(<StudioAds />))
check('Projects (imepangwa)', () => renderToString(<StudioProjects onNavigate={noop} />))
check('Brand Kit (imepangwa)', () => renderToString(<StudioBrand />))
check('Collaboration (imepangwa)', () => renderToString(<StudioCollab />))
check('Monetization', () => renderToString(<StudioMonetization />))
check('Premium Tools', () => renderToString(<StudioPremium onNavigate={noop} />))
check('Audience', () => renderToString(<StudioAudience onNavigate={noop} />))

check('Create hub (kuanzia)', () => renderToString(<CreativeHub {...actions} onEditorOpenChange={noop} />))
check('Mhariri: social na maandishi', () => {
  const doc = createDocument('social')
  return renderToString(<CreativeEditor userId={null} initial={{ doc }} onExit={noop} />)
})
check('Mhariri: tabaka za maandishi, umbo na template', () => {
  let doc = applyTemplate(createDocument('custom', { width: 800, height: 600 }), 'quote')
  doc = { ...doc, layers: [...doc.layers, makeText({ text: 'Habari' }), makeShape('ellipse')] }
  return renderToString(<CreativeEditor userId={null} initial={{ doc, projectId: null }} onExit={noop} />)
})

console.log(`\nSSR Creator Studio: ${pass} PASS, ${fail} FAIL`)
if (fail) process.exitCode = 1
