// ══════════════════════════════════════════════════════════════
// PASIHAI — DATASAVEDINDICATOR (kitufe cha juu #1)
//
// Onyesho la matokeo: "184 MB saved" — data ya internet iliyoepushwa.
// SI urambazaji · SI Mipangilio · SI dashibodi ya mtandao.
// Kinagusa → panel ya maelezo (Sheet ileile ya PASIHAI).
//
// Data inatoka kwa service (systemService) — component haisomi mock.
// Deskt: "184 MB saved"  ·  Simu: "184 MB"
// ══════════════════════════════════════════════════════════════

import useAsyncData from '../../hooks/useAsyncData.js'
import { systemService } from '../../services/systemService.js'
import { formatMb } from '../../utils/format.js'
import { IconDatabase } from '../icons.jsx'

export default function DataSavedIndicator({ onClick }) {
  const brief = useAsyncData(() => systemService.getDataSavedBrief(), [])

  if (!brief) return null
  const value = formatMb(brief.total)

  return (
    <button
      type="button"
      className="psh-ctl psh-ctl--saved"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`Data Saved: ${value} ya data ya internet iliyoepushwa. Fungua maelezo`}
      title="Data Saved — data ya internet iliyoepushwa"
    >
      <IconDatabase size={16} />
      <span className="psh-ctl__num">{value}</span>
      <span className="psh-ctl__word">saved</span>
    </button>
  )
}
