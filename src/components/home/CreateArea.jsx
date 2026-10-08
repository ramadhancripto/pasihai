// ══════════════════════════════════════════════════════════════
// PASIHAI — CREATE AREA (Hatua 2 — muundo)
// Sehemu ya kuunda content kwa njia ya asili, bila msongamano.
//   [ DP yako ]  Nini kinaendelea?
//   Picha · Video · Chapisho · Reel · Live
// Kitufe cha + kinafungua menyu kamili ya Create.
// ══════════════════════════════════════════════════════════════

import { accountService } from '../../services/accountService.js'
import useAsyncData from '../../hooks/useAsyncData.js'
import { Avatar } from '../ui.jsx'
import {
  IconPhoto,
  IconVideo,
  IconPlus,
  IconReel,
  IconLive,
} from '../icons.jsx'

const QUICK = [
  { id: 'photo', label: 'Picha', Icon: IconPhoto, aria: 'Unda chapisho la picha' },
  { id: 'video', label: 'Video', Icon: IconVideo, aria: 'Unda chapisho la video' },
  { id: 'post', label: 'Chapisho', Icon: IconPlus, aria: 'Unda chapisho la maandishi' },
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
        <button
          type="button"
          className="psh-createbar__prompt"
          onClick={() => onCreate('post')}
        >
          {prompt}
        </button>
        <button
          type="button"
          className="psh-createbar__plus"
          onClick={() => onCreate('menu')}
          aria-label="Fungua menyu ya kuunda"
        >
          <IconPlus size={20} strokeWidth={2.1} />
        </button>
      </div>
      <ul className="psh-createbar__quick">
        {QUICK.map(({ id, label, Icon, aria }) => (
          <li key={id}>
            <button
              type="button"
              className="psh-createbar__act"
              aria-label={aria}
              onClick={() => onCreate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
