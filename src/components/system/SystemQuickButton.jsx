// ══════════════════════════════════════════════════════════════
// PASIHAI — SYSTEMQUICKBUTTON (kitufe cha juu #2)
//
// Mlango MMОJA wa vitendo vya mfumo (local · offline · sync).
// SI Mipangilio · SI item ya bottom nav · SI ukurasa wa mtandao.
// Doa ndogo inaonyesha hali ya kifaa (context, si kelele).
//
// Deskt: "⇄ System"  ·  Simu: icon + doa (aria-label kamili)
// ══════════════════════════════════════════════════════════════

import useAsyncData from '../../hooks/useAsyncData.js'
import { systemService } from '../../services/systemService.js'
import { IconSwap } from '../icons.jsx'

/* Hali → rangi ya doa (subtle, si badge) */
const DOT_TONE = {
  ONLINE: 'ok',
  LOCAL: 'ok',
  SYNCING: 'blue',
  LIMITED: 'gold',
  WAITING_SYNC: 'gold',
  OFFLINE: 'off',
}

export default function SystemQuickButton({ onClick }) {
  const conn = useAsyncData(() => systemService.getConnection(), [])

  if (!conn) return null
  const tone = DOT_TONE[conn.state] || 'off'

  return (
    <button
      type="button"
      className="psh-ctl psh-ctl--system"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`PASIHAI System — ${conn.label}. Fungua vitendo vya mfumo`}
      title="PASIHAI System"
    >
      <IconSwap size={16} />
      <span className="psh-ctl__word">System</span>
      <span className={`psh-ctl__dot psh-ctl__dot--${tone}`} aria-hidden="true" />
    </button>
  )
}
