// ══════════════════════════════════════════════════════════════
// PASIHAI — FEED SOCIAL BAR
//
// Buttons za uhusiano kwenye kila chapisho:
//   [Omba Urafiki] [Kufuata] [Unganika] [Ujumbe]
//
// Zinaonekana kwa mtu yeyote ambaye si rafiki, si wewe.
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { IconPersonAdd, IconFollow, IconConnect, IconChat, IconCheck } from '../icons.jsx'

export default function FeedSocialBar({
  entity,
  state = {},
  onFollow,
  onFriendRequest,
  onConnect,
  onMessage,
  onToast,
}) {
  const [busy, setBusy] = useState(null)

  const act = async (key, fn, successMsg) => {
    if (busy || state[key]) return
    setBusy(key)
    try {
      await fn?.()
      onToast?.(successMsg)
    } catch {
      onToast?.('Imeshindikana')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="psh-feed-social">
      <button
        type="button"
        className="psh-feed-social__btn psh-feed-social__btn--friend"
        disabled={!!busy}
        onClick={() => act('friendRequested', onFriendRequest, 'Ombi la urafiki limetumwa')}
      >
        {state.friendRequested ? (
          <><IconCheck size={14} /> Ombi limetumwa</>
        ) : (
          <><IconPersonAdd size={14} /> Omba Urafiki</>
        )}
      </button>

      <button
        type="button"
        className="psh-feed-social__btn psh-feed-social__btn--follow"
        disabled={!!busy}
        onClick={() => act('following', onFollow, state.following ? 'Umeacha kufuata' : 'Umeanza kufuata')}
      >
        {state.following ? (
          <><IconCheck size={14} /> Unamfuata</>
        ) : (
          <><IconFollow size={14} /> Kufuata</>
        )}
      </button>

      <button
        type="button"
        className="psh-feed-social__btn psh-feed-social__btn--connect"
        disabled={!!busy}
        onClick={() => act('connected', onConnect, 'Ombi la kuunganishwa limetumwa')}
      >
        {state.connected ? (
          <><IconCheck size={14} /> Umeunganika</>
        ) : (
          <><IconConnect size={14} /> Unganika</>
        )}
      </button>

      <button
        type="button"
        className="psh-feed-social__btn psh-feed-social__btn--msg"
        disabled={!!busy}
        onClick={() => onMessage?.()}
      >
        <IconChat size={14} /> Ujumbe
      </button>
    </div>
  )
}