// ══════════════════════════════════════════════════════════════
// PASIHAI — CHAT BITS (vipande vidogo vinavyoshirikiwa)
// ChatAvatar · Ticks (delivery) · MethodNote (njia ya usafirishaji)
// ══════════════════════════════════════════════════════════════

import { initials } from '../ui.jsx'
import { IconHub, IconSpaces, IconCheck, IconChecks, IconRelay, IconRadar, IconDatabase } from '../icons.jsx'

const GROUP_ICON = { group: IconSpaces, hub: IconHub, community: IconSpaces }

export function ChatAvatar({ tone = 'green', name = '', icon, online, size = 'md', className = '' }) {
  const Icon = icon ? GROUP_ICON[icon] || IconSpaces : null
  return (
    <span className={`psh-chat__ava psh-chat__ava--${tone} ${size === 'sm' ? 'psh-chat__ava--sm' : ''} ${className}`}>
      {Icon ? <Icon size={size === 'sm' ? 19 : 22} /> : initials(name)}
      {online === true ? <span className="psh-chat__online" /> : null}
      {online === false ? <span className="psh-chat__online psh-chat__online--off" /> : null}
    </span>
  )
}

/** Ticks za delivery: sent = ✓ moja, synced/relayed = ✓✓ */
export function Ticks({ state }) {
  const double = state === 'synced' || state === 'relayed' || state === 'local'
  return (
    <span className="psh-msg__ticks" aria-label={double ? 'Imefika' : 'Imetumwa'}>
      {double ? <IconChecks size={13} strokeWidth={2} /> : <IconCheck size={13} strokeWidth={2} />}
    </span>
  )
}

/** Njia ya usafirishaji — inaonekana kwa ujumbe unaohitaji maelezo */
export function MethodNote({ route, stateInfo }) {
  if (!route || stateInfo?.tone === 'quiet' || stateInfo?.tone === 'ok') return null
  const Icon = route === 'relay' ? IconRelay : route === 'mesh' || route === 'local' ? IconRadar : IconDatabase
  return (
    <span className={`psh-msg__state psh-msg__state--${stateInfo?.tone || 'quiet'}`}>
      <Icon size={13} />
      {stateInfo?.label}
    </span>
  )
}
