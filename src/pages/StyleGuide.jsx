// ══════════════════════════════════════════════════════════════
// PASIHAI — MSINGI WA MUONEKANO (Hatua 0)
// Ukurasa huu ni wa maendeleo: unaonyesha design tokens na
// components zilizoandaliwa kabla ya kujenga skrini.
// Unaonekana kwa ?guide=1
// ══════════════════════════════════════════════════════════════

import * as Icons from '../components/icons.jsx'
import Wordmark from '../components/Wordmark.jsx'
import {
  Avatar,
  Chip,
  EntityPill,
  Identity,
  Segmented,
  CheckRow,
  MediaFrame,
  Waveform,
} from '../components/ui.jsx'
import { Switch } from '../components/panels.jsx'
import { accountService } from '../services/accountService.js'
import useAsyncData from '../hooks/useAsyncData.js'
import { useState } from 'react'

const SWATCHES = [
  { name: 'Primary green', hex: '#18A982', note: 'Rangi kuu ya brand' },
  { name: 'Secondary blue', hex: '#3B82F6', note: 'Mwingiliano unaosaidia' },
  { name: 'Light green', hex: '#EAF8F3', note: 'Mandhari laini' },
  { name: 'Primary text', hex: '#17201D', note: 'Maandishi makuu' },
  { name: 'Secondary text', hex: '#66736E', note: 'Maandishi ya pili' },
  { name: 'Background', hex: '#FFFFFF', note: 'Mandhari kuu' },
  { name: 'Secondary bg', hex: '#F7FAF9', note: 'Mandhari ya sehemu' },
  { name: 'Gold accent', hex: '#D4A72C', note: 'Inatumika kwa nadra' },
  { name: 'Error', hex: '#DC2626', note: 'Hitilafu' },
]

const RULES = [
  'Bottom nav ni destinations tano pekee — Home, Chat, Gundua, Spaces, Business.',
  'Home tabs: Mchanganyiko · Reels · Friends · Channels · Live. Hakuna "For You".',
  'Home haijengwi kwa followers. Mtumiaji mwenye marafiki pekee anapata uzoefu kamili.',
  'Channels ≠ Chat. Hubs ≠ Chat. Chat ndiyo mawasiliano — mfumo mmoja.',
  'Chapisho si giant cards — separation ya hila, si masanduku makubwa.',
  'Hakuna glassmorphism, gradients nyingi, dark dashboard, huge shadows au pill overload.',
  'Gold inatumika kwa nadra. Green ni kuu, blue inasaidia.',
  'Icons zote za mstari: viewBox 24, stroke 1.7, rangi ya sasa (currentColor).',
]

export default function StyleGuide({ onHome }) {
  const [seg, setSeg] = useState('auto')
  const [check, setCheck] = useState(true)
  const [sw, setSw] = useState(true)

  // Data ya mfano inakuja kwa account service (si mock.js moja kwa moja).
  const directory = useAsyncData(() => accountService.listDirectory(), [])
  const me = useAsyncData(() => accountService.getCurrentUser(), [])
  const iconNames = Object.keys(Icons).filter((k) => k.startsWith('Icon'))

  return (
    <div className="psh-guide">
      <header className="psh-guide__head">
        <div>
          <Wordmark size={22} />
          <h1 className="psh-guide__title">Msingi wa Muonekano</h1>
          <p className="psh-guide__sub">
            Design tokens, typografia na components za PASIHAI — Hatua 0. Hii ni zana ya
            maendeleo, si sehemu ya Home.
          </p>
        </div>
        <button type="button" className="psh-btn psh-btn--primary" onClick={onHome}>
          Rudi kwenye Home
        </button>
      </header>

      {/* ── Rangi ─────────────────────────────────────────── */}
      <section className="psh-gsec">
        <h2>Rangi</h2>
        <p className="psh-gsec__note">
          Green ni rangi kuu. Blue inasaidia mwingiliano. Gold inatumika kwa nadra sana.
        </p>
        <ul className="psh-swatches">
          {SWATCHES.map((s) => (
            <li key={s.hex}>
              <span className="psh-swatch" style={{ background: s.hex }} aria-hidden="true" />
              <strong>{s.name}</strong>
              <code>{s.hex}</code>
              <em>{s.note}</em>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Typografia ────────────────────────────────────── */}
      <section className="psh-gsec">
        <h2>Typografia</h2>
        <p className="psh-gsec__note">
          Inter Tight kwa vichwa na brand. Inter kwa maandishi ya UI. Hierarchy ni ya hila.
        </p>
        <div className="psh-gtype">
          <div>
            <span className="psh-glabel">Wordmark · 22px / 600</span>
            <Wordmark size={22} />
          </div>
          <div>
            <span className="psh-glabel">H1 · 26px / 600 · Inter Tight</span>
            <p className="psh-t-h1">Kituo cha kwanza cha mawasiliano</p>
          </div>
          <div>
            <span className="psh-glabel">H2 · 20px / 600 · Inter Tight</span>
            <p className="psh-t-h2">Mchanganyiko wa marafiki na channels</p>
          </div>
          <div>
            <span className="psh-glabel">H3 · 16px / 600 · Inter Tight</span>
            <p className="psh-t-h3">Channel si mazungumzo</p>
          </div>
          <div>
            <span className="psh-glabel">Body · 15px / 400 · Inter</span>
            <p className="psh-t-body">
              Leo nimefika sokoni mapema. Bei ilikuwa rahisi kuliko wiki iliyopita, na
              tumeshirikiana na majirani.
            </p>
          </div>
          <div>
            <span className="psh-glabel">Caption · 12px / 400 · Inter</span>
            <p className="psh-t-cap">Rafiki · dakika 12 · Dar es Salaam</p>
          </div>
        </div>
      </section>

      {/* ── Icons ─────────────────────────────────────────── */}
      <section className="psh-gsec">
        <h2>Icons ({iconNames.length})</h2>
        <p className="psh-gsec__note">Mstari mmoja, stroke 1.7, rangi inafuata maandishi.</p>
        <ul className="psh-gicons">
          {iconNames.map((n) => {
            const C = Icons[n]
            return (
              <li key={n}>
                <C size={22} />
                <span>{n.replace('Icon', '')}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── Avatar na identity ────────────────────────────── */}
      <section className="psh-gsec">
        <h2>Avatar na identity system</h2>
        <p className="psh-gsec__note">
          Feed: avatar ya mraba-iliyozungushwa (rounded square). Status: mviringo. Aina ya entity
          inaonekana kwa badge na kwa jina la uhusiano — kwa uthabiti.
        </p>
        <div className="psh-grow">
          {directory && me
            ? ['friend', 'channel', 'hub', 'business', 'creator', 'you'].map((t) => {
                const u =
                  t === 'you'
                    ? me
                    : directory.find((x) => x.type === t) ||
                      directory.find((x) => x.type === 'friend')
                return u ? <Avatar key={t} user={u} size={44} /> : null
              })
            : null}
          {me ? <Avatar user={me} size={44} shape="circle" /> : null}
          {directory ? (
            <Avatar
              user={directory.find((x) => x.type === 'channel') || directory[0]}
              size={64}
              shape="circle"
              badge={false}
            />
          ) : null}
        </div>

        <ul className="psh-gident">
          {directory
            ? ['amina', 'pasihaiUpdates', 'darTechHub', 'exampleStore', 'neemaBeats'].map((id) => {
                const u = directory.find((x) => x.id === id)
                return u ? (
                  <li key={id}>
                    <Identity user={u} time="dakika 12" onOpen={() => {}} />
                  </li>
                ) : null
              })
            : null}
          {me ? (
            <li>
              <Identity user={me} time="wewe" onOpen={() => {}} size={40} />
            </li>
          ) : null}
        </ul>
      </section>

      {/* ── Vifungo na vidhibiti ──────────────────────────── */}
      <section className="psh-gsec">
        <h2>Vifungo na vidhibiti</h2>
        <div className="psh-grow psh-grow--wrap">
          <button type="button" className="psh-btn psh-btn--primary">Kitufe kikuu</button>
          <button type="button" className="psh-btn">Kitufe cha pili</button>
          <button type="button" className="psh-btn psh-btn--quiet">Kimya</button>
          <button type="button" className="psh-btn psh-btn--danger">Hatari</button>
          <Chip>Neutral</Chip>
          <Chip tone="soft">Soft</Chip>
          <Chip tone="green">Kijani</Chip>
          <Chip tone="gold">Gold</Chip>
          <EntityPill type="friend" label="Rafiki" />
          <EntityPill type="channel" label="Channel" />
          <EntityPill type="hub" label="Hub" />
          <EntityPill type="business" label="Biashara" />
          <EntityPill type="creator" label="Mbunifu" />
          <EntityPill type="you" label="Wewe" />
          <span className="psh-gctrl">
            <Switch on={sw} onChange={setSw} label="Mfano" />
          </span>
        </div>
        <div className="psh-grow psh-grow--wrap">
          <Segmented
            name="Mfano"
            value={seg}
            onChange={setSeg}
            options={[
              { id: 'auto', label: 'Automatic' },
              { id: 'vertical', label: 'Vertical' },
              { id: 'horizontal', label: 'Horizontal' },
            ]}
          />
          <div className="psh-gcheckrows">
            <CheckRow radio checked={check} label="Chaguo la mfano" hint="Maelezo mafupi" onSelect={() => setCheck(!check)} />
          </div>
        </div>
      </section>

      {/* ── Media ─────────────────────────────────────────── */}
      <section className="psh-gsec">
        <h2>Media na sauti</h2>
        <p className="psh-gsec__note">
          Prototype haitumii picha za interneti. Fremu zinaonyesha aina, uwiano na maelezo.
        </p>
        <div className="psh-gmedia">
          <MediaFrame tone="green" ratio="4 / 3" caption="Picha · 4:3" icon={<Icons.IconPhoto size={26} />} />
          <MediaFrame tone="blue" ratio="16 / 9" caption="Video · 16:9" icon={<Icons.IconPlay size={24} />} />
          <MediaFrame tone="gold" ratio="1 / 1" caption="Reel · 9:16" icon={<Icons.IconReel size={26} />} />
        </div>
        <div className="psh-gaudio">
          <Waveform bars={[8, 14, 22, 30, 18, 26, 34, 20, 12, 24, 32, 16, 10, 20, 28, 14]} />
        </div>
      </section>

      {/* ── Umbo ──────────────────────────────────────────── */}
      <section className="psh-gsec">
        <h2>Umbo na vivuli</h2>
        <ul className="psh-gshapes">
          <li className="r-xs">r-xs · 6</li>
          <li className="r-sm">r-sm · 8</li>
          <li className="r-md">r-md · 12</li>
          <li className="r-lg">r-lg · 16</li>
          <li className="r-xl">r-xl · 20</li>
          <li className="r-full">full</li>
        </ul>
        <ul className="psh-gshadows">
          <li className="sh-1">sh-1</li>
          <li className="sh-2">sh-2</li>
          <li className="sh-3">sh-3</li>
        </ul>
      </section>

      {/* ── Kanuni ────────────────────────────────────────── */}
      <section className="psh-gsec">
        <h2>Kanuni zisizokiukwa</h2>
        <ul className="psh-grules">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
