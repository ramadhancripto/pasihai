// ══════════════════════════════════════════════════════════════
// PASIHAI — CHAT BITS (vipande vidogo vinavyoshirikiwa)
// ChatAvatar · Ticks (delivery) · DeliveryLine (nani → nani · hali · njia)
// ══════════════════════════════════════════════════════════════

import { initials } from '../ui.jsx'
import {
  IconHub,
  IconSpaces,
  IconCheck,
  IconChecks,
  IconRelay,
  IconRadar,
  IconTimer,
  IconRefresh,
  IconBan,
  IconArrowRight,
  IconSync,
  IconOffline,
  IconPeople,
  IconSpark,
} from '../icons.jsx'

const GROUP_ICON = { group: IconSpaces, hub: IconHub, community: IconSpaces }

export function ChatAvatar({ tone = 'green', name = '', icon, online, size = 'md', className = '', src = null }) {
  const Icon = icon ? GROUP_ICON[icon] || IconSpaces : null
  return (
    <span className={`psh-chat__ava psh-chat__ava--${tone} ${size === 'sm' ? 'psh-chat__ava--sm' : ''} ${className}`}>
      {src ? (
        /* DP halisi ya kikundi (bucket ya 'group-media') — fallback: icon/initials */
        <img className="psh-chat__ava__img" src={src} alt="" loading="lazy" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 19 : 22} />
      ) : (
        initials(name)
      )}
      {online === true ? <span className="psh-chat__online" /> : null}
      {online === false ? <span className="psh-chat__online psh-chat__online--off" /> : null}
    </span>
  )
}

/* ── Ticks: hali ya uwasilishaji ────────────────────────────────
   Kanuni: UI HAIZUSHI uthibitisho. Kila alama ina maana kamili na
   inatoka kwenye safu ya data (state/receipt), sio kwenye mwonekano.

     pending   🕓  bado haijatoka kwenye kifaa changu (foleni · vault · mesh)
     sent      ✓   imeandikwa/kukubaliwa na kifaa changu au seva —
                   HAKUNA uthibitisho wa mpokeaji
     delivered ✓✓ (grey)  kifaa cha mpokeaji kimethibitisha kupokea
     read      ✓✓ (blue)  mpokeaji amesoma (read receipts zikiwashwa)
     retry     ↻   inajaribu tena (n/max)
     failed    ⛔  imeshindwa
     expired   ⏳  imeisha muda kwenye foleni (TTL)

   `sent` ≠ `delivered` ≠ `read`. `synced` na `relayed` ni hali za
   NJIA/safu (zinaonekana kwenye DeliveryLine), si risiti za mpokeaji. */

const TICKS = {
  pending: { Icon: IconTimer, cls: 'psh-tick--pending', label: 'Bado haijatoka · ipo kwenye foleni' },
  sent: { Icon: IconCheck, cls: 'psh-tick--sent', label: 'Imetumwa · imekubaliwa na mfumo wangu' },
  delivered: { Icon: IconChecks, cls: 'psh-tick--delivered', label: 'Imefika kwa kifaa cha mpokeaji' },
  read: { Icon: IconChecks, cls: 'psh-tick--read', label: 'Imesomwa na mpokeaji' },
  retry: { Icon: IconRefresh, cls: 'psh-tick--retry', label: 'Inajaribu tena' },
  failed: { Icon: IconBan, cls: 'psh-tick--failed', label: 'Imeshindwa kutumwa' },
  expired: { Icon: IconTimer, cls: 'psh-tick--expired', label: 'Imeisha muda kwenye foleni' },
}

export function Ticks({ tick = 'sent', label }) {
  const t = TICKS[tick] || TICKS.sent
  const Icon = t.Icon
  const text = label || t.label
  const double = tick === 'delivered' || tick === 'read'
  return (
    <span className={`psh-msg__ticks ${t.cls}`} role="img" aria-label={text} title={text}>
      <Icon size={double ? 15 : 13} strokeWidth={2.2} />
    </span>
  )
}

/* ── Njia za usafirishaji (transport) ─────────────────────────
   Njia ni taarifa TOFAUTI na hali: ujumbe unaweza kuwa 'Imefika'
   ukapita kwa relay, au bado haujatoka ukiwa kwenye vault.
   Internet (njia ya kawaida) haionyeshwi — hakuna kelele isiyo na maana. */
export const ROUTES = {
  relay: { label: 'Relay', Icon: IconRelay, hint: 'Internet Relay · maandishi mafupi pekee' },
  mesh: { label: 'Mesh', Icon: IconRadar, hint: 'Local Mesh · kifaa kwa kifaa, bila data' },
  local: { label: 'Karibu', Icon: IconRadar, hint: 'Uwasilishaji wa karibu (Wi-Fi Direct/Bluetooth)' },
  internet: null,
}

/* ── Aggregate ya vikundi ───────────────────────────────────────
   Vikundi: hesabu ya JUMLA pekee (mfano "Imefika 31/48"). Hatusemi
   kamwe "kila mtu amefika/amesoma" — hesabu kamili ya kila mtu
   haionyeshwi mpaka risiti za per-recipient ziidhinishwe. */
export function aggregateLabel(receipt) {
  if (!receipt?.audience) return ''
  const parts = []
  if (Number.isFinite(receipt.delivered) && receipt.delivered > 0) parts.push(`Imefika ${receipt.delivered}/${receipt.audience}`)
  if (Number.isFinite(receipt.read) && receipt.read > 0) parts.push(`Imesomwa ${receipt.read}/${receipt.audience}`)
  if (!parts.length && Number.isFinite(receipt.pending)) parts.push(`Inasubiri ${receipt.pending}/${receipt.audience}`)
  return parts.join(' · ')
}

/** ICON ya hali — maneno yanabaki kwenye tooltip na kwenye
 *  "Taarifa za uwasilishaji". UI inabaki safi: icons pekee. */
const STATE_ICON = {
  pending: IconTimer,
  sent: IconCheck,
  synced: IconSync,
  relayed: IconRelay,
  delivered: IconChecks,
  read: IconChecks,
  retry: IconRefresh,
  failed: IconBan,
  expired: IconTimer,
}

/* Hali fulani zina icon yao maalum (zisizotegemea tick):
   vault = hakuna muunganisho · mesh = ukaribu · foleni = saa. */
const STATE_ICON_OVERRIDE = {
  vault: IconOffline,
  local: IconRadar,
}

/** Jumla ya kikundi: icons + HESABU (sio maneno).
 *  delivered → ✓✓ + "31/48" · read → ✓✓ blue + "12/48". */
function AggregateIcons({ receipt }) {
  if (!receipt?.audience) return null
  return (
    <>
      {Number.isFinite(receipt.delivered) && receipt.delivered > 0 ? (
        <span
          className="psh-msg__ico psh-msg__ico--num psh-msg__ico--delivered"
          role="img"
          aria-label={`Imefika kwa ${receipt.delivered} kati ya ${receipt.audience}`}
          title={`Imefika ${receipt.delivered}/${receipt.audience} (jumla pekee)`}
        >
          <IconChecks size={12} />
          <i>{receipt.delivered}/{receipt.audience}</i>
        </span>
      ) : null}
      {Number.isFinite(receipt.read) && receipt.read > 0 ? (
        <span
          className="psh-msg__ico psh-msg__ico--num psh-msg__ico--read"
          role="img"
          aria-label={`Imesomwa na ${receipt.read} kati ya ${receipt.audience}`}
          title={`Imesomwa ${receipt.read}/${receipt.audience} (jumla pekee)`}
        >
          <IconChecks size={12} />
          <i>{receipt.read}/{receipt.audience}</i>
        </span>
      ) : null}
    </>
  )
}

/**
 * Mstari wa uwasilishaji: MTU ALIYETUMA → MPOKEAJI + ICONS.
 * Hali na njia ni ICONS pekee (maneno yako kwenye tooltip na kwenye
 * "Taarifa za uwasilishaji" — UI inabaki safi kama mmiliki alivyoelekeza).
 */
export function DeliveryLine({ mine, sender, recipient, showSender = true, stateInfo, tick, route, receipt }) {
  const routeMeta = ROUTES[route] || null
  const Icon = STATE_ICON_OVERRIDE[stateInfo?.state] || STATE_ICON[tick] || IconCheck
  const routeIcon = routeMeta?.Icon
  const routeIsRedundant = !routeIcon || routeIcon === Icon
  return (
    <span className={`psh-msg__delivery ${mine ? 'psh-msg__delivery--me' : ''}`}>
      <span className="psh-msg__flow">
        {showSender ? (
          <>
            <b>{sender}</b>
            <IconArrowRight size={11} className="psh-msg__flowarrow" />
          </>
        ) : (
          <IconArrowRight size={11} className="psh-msg__flowarrow" />
        )}
        <span className="psh-msg__flowto">{recipient}</span>
      </span>

      {/* HALI — icon pekee. Ujumbe unaoingia hauna alama ya 'imetumwa'
          (hiyo ni ya ujumbe WANGU); hali inaonekana pale inapohitajika
          tu (k.m. imezuiwa na Wi-Fi, au haijatoka). */}
      {mine || tick !== 'sent' ? (
        <span
          className={`psh-msg__ico psh-msg__ico--${stateInfo?.tone || 'quiet'} psh-msg__ico--state`}
          role="img"
          aria-label={stateInfo?.label || tick}
          title={stateInfo?.label || tick}
        >
          <Icon size={13} strokeWidth={2.2} />
        </span>
      ) : null}

      {/* NJIA — icon pekee (Relay · Mesh · Karibu) */}
      {!routeIsRedundant ? (
        <span
          className="psh-msg__ico psh-msg__ico--route"
          role="img"
          aria-label={routeMeta.hint}
          title={routeMeta.hint}
        >
          <routeMeta.Icon size={12} />
        </span>
      ) : null}

      <AggregateIcons receipt={receipt} />

      {/* Risiti ya majaribio (mock): icon pekee — maelezo kwenye tooltip + sheet */}
      {receipt?.simulated ? (
        <span
          className="psh-msg__ico psh-msg__ico--demo"
          role="img"
          aria-label={`Risiti ya majaribio (${receipt.audience ? 'jumla ya kikundi' : 'kifaa kimoja'}) — mfumo halisi bado hauna risiti za mpokeaji`}
          title="Risiti ya majaribio (mock) — mfumo halisi bado hauna risiti za mpokeaji"
        >
          <IconSpark size={11} />
        </span>
      ) : null}
    </span>
  )
}
