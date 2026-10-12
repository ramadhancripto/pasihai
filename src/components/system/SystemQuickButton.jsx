// PASIHAI — SYSTEMQUICKBUTTON — icon + doa tu

import useAsyncData from '../../hooks/useAsyncData.js'
import { systemService } from '../../services/systemService.js'
import { IconSwap } from '../icons.jsx'

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
      aria-label={`System: ${conn.label}`}
      title={`System: ${conn.label}`}
    >
      <IconSwap size={16} />
      <span className={`psh-ctl__dot psh-ctl__dot--${tone}`} aria-hidden="true" />
    </button>
  )
}