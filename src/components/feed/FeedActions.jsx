// ══════════════════════════════════════════════════════════════
// PASIHAI — FEED ACTIONS
// ♡ Kupenda · 💬 Maoni · ↗ Shiriki · [hifadhi]
//
// Hali (liked/saved) ni ya ndani ya kikao — prototype haina backend.
// Counts zinazoonekana ni "engagement summary": zinaonyeshwa tu pale
// zilipo (0 haionyeshwi).
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { IconHeart, IconComment, IconShare, IconBookmark } from '../icons.jsx'

export default function FeedActions({ stats = {}, onToast }) {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)

  const reactions = (stats.reactions ?? 0) + (liked ? 1 : 0)

  return (
    <div className="psh-feedactions">
      <button
        type="button"
        className={`psh-feedaction ${liked ? 'is-liked' : ''}`}
        aria-pressed={liked}
        onClick={() => setLiked((v) => !v)}
        aria-label={liked ? 'Ondoa kupenda' : 'Penda'}
      >
        <IconHeart size={19} filled={liked} />
        {reactions > 0 ? <span>{reactions}</span> : <span className="psh-feedaction__word">Penda</span>}
      </button>

      <button
        type="button"
        className="psh-feedaction"
        onClick={() => onToast?.('Maoni — yatajengwa baadaye')}
        aria-label="Maoni"
      >
        <IconComment size={19} />
        {(stats.comments ?? 0) > 0 ? (
          <span>{stats.comments}</span>
        ) : (
          <span className="psh-feedaction__word">Maoni</span>
        )}
      </button>

      <button
        type="button"
        className="psh-feedaction"
        onClick={() => onToast?.('Kushiriki — kutajengwa baadaye')}
        aria-label="Shiriki"
      >
        <IconShare size={19} />
        {(stats.shares ?? 0) > 0 ? (
          <span>{stats.shares}</span>
        ) : (
          <span className="psh-feedaction__word">Shiriki</span>
        )}
      </button>

      <button
        type="button"
        className={`psh-feedaction psh-feedaction--save ${saved ? 'is-saved' : ''}`}
        aria-pressed={saved}
        onClick={() => {
          setSaved((v) => !v)
          onToast?.(saved ? 'Umeondoa kwenye zilizohifadhiwa' : 'Imehifadhiwa kwenye kifaa hiki (mfano)')
        }}
        aria-label={saved ? 'Ondoa kwenye zilizohifadhiwa' : 'Hifadhi'}
      >
        <IconBookmark size={19} filled={saved} />
      </button>
    </div>
  )
}
