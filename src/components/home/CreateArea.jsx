// ══════════════════════════════════════════════════════════════
// PASIHAI — CREATE AREA (v9)
//   [ DP yako ]  Nini kinaendelea?
//   ╭──────────── (+) ────────────╮   ← plus imezungukwa na block
//   │   Media · Reel · Live       │
//   ╰─────────────────────────────╯
// Plus inafungua menyu kamili ya Create (onCreate('menu')).
// Chapisho la maandishi linafunguliwa kwa kubonyeza prompt.
// ══════════════════════════════════════════════════════════════

import { accountService } from '../../services/accountService.js'
import useAsyncData from '../../hooks/useAsyncData.js'
import { Avatar } from '../ui.jsx'
import { IconPhoto, IconPlus, IconReel, IconLive } from '../icons.jsx'

// Media ni kitufe kimoja (picha + video). Chapisho halina kitufe chake:
// linafunguliwa kwa prompt au kwa plus.
const QUICK = [
  { id: 'photo', label: 'Media', Icon: IconPhoto, aria: 'Unda chapisho la media (picha au video)' },
  { id: 'reel', label: 'Reel', Icon: IconReel, aria: 'Unda Reel' },
  { id: 'live', label: 'Live', Icon: IconLive, aria: 'Anza kikao cha moja kwa moja' },
]

export default function CreateArea({ onCreate, prompt = 'Nini kinaendelea?' }) {
  // DP ya mtumiaji wa sasa inatoka kwa account service.
  const me = useAsyncData(() => accountService.getCurrentUser(), [])

  if (!me) return null

  return (
    <section className="psh-createbar" aria-label="Kuunda maudhui">
      <div className="psh-createbar__top">
        <Avatar user={me} size={40} />
        <button type="button" className="psh-createbar__prompt" onClick={() => onCreate('post')}>
          {prompt}
        </button>
      </div>

      <div className="psh-createbar__dock">
        <button
          type="button"
          className="psh-createbar__plus"
          onClick={() => onCreate('menu')}
          aria-label="Fungua menyu ya kuunda"
        >
          <IconPlus size={22} strokeWidth={2.2} />
        </button>
        <ul className="psh-createbar__quick">
          {QUICK.map(({ id, label, Icon, aria }) => (
            <li key={id}>
              <button type="button" className="psh-createbar__act" aria-label={aria} onClick={() => onCreate(id)}>
                <Icon size={18} />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
