// PASIHAI — DATASAVEDINDICATOR — icon tu

import useAsyncData from '../../hooks/useAsyncData.js'
import { systemService } from '../../services/systemService.js'
import { formatMb } from '../../utils/format.js'
import { IconDatabase } from '../icons.jsx'

export default function DataSavedIndicator({ onClick }) {
  const brief = useAsyncData(() => systemService.getDataSavedBrief(), [])

  if (!brief) null
  const value = formatMb(brief?.total)

  return (
    <button
      type="button"
      className="psh-ctl psh-ctl--saved"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`Data Saved: ${value}`}
      title={`Data Saved: ${value}`}
    >
      <IconDatabase size={16} />
    </button>
  )
}