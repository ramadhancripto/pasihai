// ══════════════════════════════════════════════════════════════
// PASIHAI — FEED ACTIONS (halisi)
// ♡ Kupenda · 💬 Maoni · ↗ Repost · ↗ Shiriki · [hifadhi] · ⋯
//
// Hali zote zinahifadhiwa kwa feedService → contentRepository.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { IconHeart, IconComment, IconShare, IconBookmark, IconMoreVertical, IconRepost } from '../icons.jsx'
import { formatCount } from '../../utils/format.js'

export default function FeedActions({
  item,
  liked = false,
  saved = false,
  stats = {},
  onToggleLike,
  onOpenComments,
  onOpenShare,
  onToggleSave,
  onOpenMenu,
}) {
  const [busy, setBusy] = useState(false)
  const [count, setCount] = useState(stats.comments ?? 0)

  useEffect(() => {
    setCount(stats.comments ?? 0)
  }, [stats.comments, item.id])

  const reactions = (stats.reactions ?? 0) + (liked ? 1 : 0)

  const click = async (fn) => {
    if (busy) return
    setBusy(true)
    try {
      await fn?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="psh-feedactions">
      <button
        type="button"
        className={`psh-feedaction ${liked ? 'is-liked' : ''}`}
        aria-pressed={liked}
        disabled={busy}
        onClick={() => click(onToggleLike)}
        aria-label={liked ? 'Ondoa kupenda' : 'Penda'}
      >
        <IconHeart size={19} filled={liked} />
        {reactions > 0 ? <span>{formatCount(reactions)}</span> : null}
      </button>

      <button
        type="button"
        className="psh-feedaction"
        disabled={busy}
        onClick={() => click(onOpenComments)}
        aria-label="Maoni"
      >
        <IconComment size={19} />
        {count > 0 ? <span>{formatCount(count)}</span> : null}
      </button>

      <button
        type="button"
        className="psh-feedaction"
        disabled={busy}
        onClick={() => click(onOpenShare)}
        aria-label="Repost"
      >
        <IconRepost size={19} />
      </button>

      <button
        type="button"
        className="psh-feedaction"
        disabled={busy}
        onClick={() => click(onOpenShare)}
        aria-label="Shiriki"
      >
        <IconShare size={19} />
        {(stats.shares ?? 0) > 0 ? <span>{formatCount(stats.shares)}</span> : null}
      </button>

      <button
        type="button"
        className={`psh-feedaction psh-feedaction--save ${saved ? 'is-saved' : ''}`}
        aria-pressed={saved}
        disabled={busy}
        onClick={() => click(onToggleSave)}
        aria-label={saved ? 'Ondoa kwenye zilizohifadhiwa' : 'Hifadhi'}
      >
        <IconBookmark size={19} filled={saved} />
      </button>

      <button
        type="button"
        className="psh-feedaction psh-feedaction--more"
        disabled={busy}
        onClick={() => click(onOpenMenu)}
        aria-label="Vitendo zaidi vya chapisho"
      >
        <IconMoreVertical size={18} />
      </button>
    </div>
  )
}