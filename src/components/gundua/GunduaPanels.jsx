// ══════════════════════════════════════════════════════════════
// PASIHAI — GUNDUA PANELS
// Vichujio (Filters) · Entity details · Ongeza Rafiki · Search · Vitendo vya haraka
//
// Panels zote ni "bodies" zinazopokea data tayari; App/ukurasa unaziweka
// ndani ya `Sheet` ileile (panel mechanism MOJA).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'

import { Chip } from '../ui.jsx'
import { formatCount } from '../../utils/format.js'
import { gunduaService } from '../../services/gunduaService.js'
import {
  IconArrowRight,
  IconCheck,
  IconComment,
  IconGlobe,
  IconGroup,
  IconHeadset,
  IconHub,
  IconInfo,
  IconLive,
  IconMapPin,
  IconMegaphone,
  IconPersonAdd,
  IconQr,
  IconShield,
  IconSpark,
  IconStar,
  IconStorefront,
  IconTag,
} from '../icons.jsx'

/* ══════════════════════════════════════════════════════════════
   1) VICHUJIO — WHAT · ABOUT · WHERE · WHEN · RELATIONSHIP
      Progressive disclosure: vikundi vinavyoonekana vinatoka kwa mode.
   ══════════════════════════════════════════════════════════════ */

export function FiltersBody({ groups, value, onChange, onApply, onClearAll, onBack }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  const isOn = (gid, oid) => (Array.isArray(draft[gid]) ? draft[gid].includes(oid) : draft[gid] === oid)

  const toggle = (g, oid) => {
    if (g.multi) {
      const cur = draft[g.id] || []
      setDraft({ ...draft, [g.id]: cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid] })
    } else {
      setDraft({ ...draft, [g.id]: draft[g.id] === oid ? '' : oid })
    }
  }

  const count = gunduaService.activeCount(draft)

  return (
    <div className="psh-gu-filters">
      <p className="psh-gu-filters__lead">
        Vichujio haviwezi kufunua vitu vya faragha — vinaonyesha <b>umma</b> pekee, kwa mpangilio unaokufaa.
      </p>

      {groups.map((g) => (
        <section key={g.id} className="psh-gu-fgroup">
          <header className="psh-gu-fgroup__head">
            <h3 className="psh-gu-fgroup__label">{g.label}</h3>
            {g.hint ? <span className="psh-gu-fgroup__hint">{g.hint}</span> : null}
          </header>
          <div className="psh-gu-fchips" role="group" aria-label={g.label}>
            {g.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`psh-gu-fchip ${isOn(g.id, o.id) ? 'is-on' : ''}`}
                aria-pressed={isOn(g.id, o.id)}
                onClick={() => toggle(g, o.id)}
              >
                {isOn(g.id, o.id) ? <IconCheck size={14} strokeWidth={2.4} /> : null}
                {o.label}
              </button>
            ))}
          </div>

          {g.id === 'eneo' && draft.eneo === 'karibu' ? (
            <div className="psh-gu-fdistance">
              <span className="psh-gu-fdistance__label">Masafa: karibu nami</span>
              <div className="psh-gu-fchips">
                {g.distances.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`psh-gu-fchip psh-gu-fchip--sm ${draft.distance === d.id ? 'is-on' : ''}`}
                    aria-pressed={draft.distance === d.id}
                    onClick={() => setDraft({ ...draft, distance: d.id })}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="psh-gu-fnote">
                <IconShield size={13} /> Eneo linaboresha umuhimu pekee — <b>haliwezi</b> kufunua kitu cha faragha.
              </p>
            </div>
          ) : null}
        </section>
      ))}

      <div className="psh-gu-filters__foot">
        <button type="button" className="psh-gu-btn psh-gu-btn--quiet" onClick={() => { setDraft(gunduaService.EMPTY); onClearAll() }}>
          Safisha Zote
        </button>
        <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onApply(draft)}>
          Weka Vichujio{count ? ` · ${count}` : ''}
        </button>
      </div>
      <button type="button" className="psh-gu-filters__cancel" onClick={onBack}>
        Ghairi
      </button>
    </div>
  )
}

export function FiltersPanel(props) {
  return <FiltersBody {...props} />
}

/* ══════════════════════════════════════════════════════════════
   2) ENTITY DETAIL — taarifa za UMAA pekee (hakuna admin/system)
   ══════════════════════════════════════════════════════════════ */

const ACTION_LABEL = {
  business: 'Tazama Biashara', channel: 'Wasifu wa Channel', hub: 'Hub', community: 'Jumuiya',
  group: 'Kikundi', person: 'Wasifu', live: 'Kikao', room: 'Kumbi ya Sauti',
}

export function EntityBody({
  onOpenMap,
  onJoinLive,
  joinedLive,
  data, kind, onAdd, onAccept, onDecline, onChat, onFollow, onJoin, onOpenProfile, onGoChat, onToast, joined, following,
}) {
  if (!data) return null
  const Icon = kind === 'business' ? IconStorefront : kind === 'channel' ? IconMegaphone : kind === 'hub' ? IconHub : kind === 'community' ? IconGlobe : kind === 'group' ? IconGroup : kind === 'live' ? IconLive : kind === 'room' ? IconHeadset : IconSpark
  const isBiz = kind === 'business'
  const prof = data.profile

  return (
    <div className="psh-gu-entity">
      <div className={`psh-gu-entity__hero psh-gu-entity__hero--${kind}`}>
        <span className="psh-gu-entity__ic">
          <Icon size={24} />
        </span>
        <div className="psh-gu-entity__id">
          <h3 className="psh-gu-entity__name">
            {data.name || data.title}
            {data.verified ? <IconCheck size={14} strokeWidth={2.4} className="psh-gu-verified" /> : null}
          </h3>
          <span className="psh-gu-entity__sub">
            {data.handle ? `${data.handle} · ` : ''}
            {data.subtitle || ACTION_LABEL[kind] || ''}
            {data.category ? ` · ${data.category}` : ''}
          </span>
        </div>
      </div>

      {data.discoverReason ? (
        <p className="psh-gu-reason psh-gu-reason--wide">
          <IconSpark size={13} /> Ilipatikana: {data.discoverReason}
        </p>
      ) : null}

      <p className="psh-gu-entity__bio">{data.bio || data.purpose || prof?.about || ''}</p>

      <ul className="psh-gu-kv">
        {typeof data.distanceKm === 'number' ? (
          <li><span><IconMapPin size={14} /> Umbali</span><strong>{data.distanceKm} km kutoka hapa</strong></li>
        ) : null}
        {data.place ? (
          <li><span><IconMapPin size={14} /> Eneo</span><strong>{data.place.mji}{data.place.mkoa && data.place.mkoa !== data.place.mji ? `, ${data.place.mkoa}` : ''}</strong></li>
        ) : null}
        {isBiz && data.openLabel ? <li><span>Masaa</span><strong>{data.openLabel}</strong></li> : null}
        {data.members ? <li><span>Wanachama</span><strong>{formatCount(data.members)}</strong></li> : null}
        {!data.members && data.followers ? <li><span>Wafuatiliaji</span><strong>{formatCount(data.followers)}</strong></li> : null}
        {data.language ? <li><span>Lugha</span><strong>{data.language}</strong></li> : null}
        {data.nextSession ? <li><span>Safari ijayo</span><strong>{data.nextSession}</strong></li> : null}
        {data.viewers ? <li><span>Watazamaji</span><strong>{formatCount(data.viewers)}</strong></li> : null}
        {data.listeners ? <li><span>Wanasikiliza</span><strong>{formatCount(data.listeners)}</strong></li> : null}
        {kind === 'group' ? <li><span>Uonekano</span><strong>Kikundi cha wazi</strong></li> : null}
      </ul>

      {isBiz && prof ? (
        <>
          {prof.trust ? (
            <section className="psh-gu-trust">
              <div className="psh-gu-trust__row">
                {prof.trust.rating ? (
                  <span className="psh-gu-rating psh-gu-rating--lg"><IconStar size={15} /><b>{prof.trust.rating}</b><span>(mapitio {prof.trust.reviews})</span></span>
                ) : null}
                {prof.trust.verified ? <Chip tone="green">Imethibitishwa</Chip> : null}
              </div>
              <ul className="psh-gu-trust__meta">
                <li>Wateja {formatCount(prof.trust.customers)}</li>
                <li>{prof.trust.response}</li>
                <li>{prof.trust.payments.join(' · ')}</li>
              </ul>
            </section>
          ) : null}

          {data.offer ? (
            <section className="psh-gu-offerbox">
              <span className={`psh-gu-offerlabel psh-gu-offerlabel--${data.offer.tone}`}>{data.offer.label}</span>
              <b>{data.offer.title}</b>
              <span className="psh-gu-code"><IconTag size={12} /> Nambari ya ofa: <b>{data.offer.code}</b> · {data.offer.expires}</span>
            </section>
          ) : null}

          {prof.products?.length ? (
            <section className="psh-gu-sub">
              <h4 className="psh-gu-sub__h">Bidhaa</h4>
              <ul className="psh-gu-prod">
                {prof.products.map((p) => (
                  <li key={p.id}>
                    <span className="psh-gu-prod__name">{p.name}{p.tag ? <Chip tone="gold">{p.tag}</Chip> : null}</span>
                    <strong>{p.price}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {prof.services?.length ? (
            <section className="psh-gu-sub">
              <h4 className="psh-gu-sub__h">Huduma</h4>
              <ul className="psh-gu-pills">
                {prof.services.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </section>
          ) : null}

          {prof.hours?.length ? (
            <section className="psh-gu-sub">
              <h4 className="psh-gu-sub__h">Masaa ya kazi</h4>
              <ul className="psh-gu-lines">{prof.hours.map((h) => <li key={h}>{h}</li>)}</ul>
            </section>
          ) : null}

          {prof.updates?.length ? (
            <section className="psh-gu-sub">
              <h4 className="psh-gu-sub__h">Taarifa za umma</h4>
              <ul className="psh-gu-updates">
                {prof.updates.map((u) => (
                  <li key={u.id}><span>{u.text}</span><em>{u.at}</em></li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {kind === 'channel' && prof?.preview ? (
        <section className="psh-gu-sub">
          <h4 className="psh-gu-sub__h">Kutoka channel (kionyeshi)</h4>
          <div className="psh-gu-preview psh-gu-preview--wide">
            <span className="psh-gu-preview__label">{prof.preview.at}</span>
            <span className="psh-gu-preview__title">{prof.preview.title}</span>
            <span className="psh-gu-preview__text">{prof.preview.text}</span>
          </div>
        </section>
      ) : null}

      {data.interests?.length ? (
        <ul className="psh-gu-pills psh-gu-pills--label">
          {data.interests.map((i) => <li key={i}>{i}</li>)}
        </ul>
      ) : null}

      {kind === 'hub' || kind === 'community' ? (
        <p className="psh-gu-note">
          <IconInfo size={15} /> Usimamizi wa {kind === 'hub' ? 'Hubs' : 'Jumuiya'} uko <b>Spaces</b> — Gundua ni ugunduzi pekee.
        </p>
      ) : null}

      {kind === 'group' ? (
        <p className="psh-gu-note">
          <IconComment size={15} /> Kikundi kinatumia <b>Chat ya PASIHAI</b> — ukijiunga, mazungumzo yanaongezwa kwenye Chat.
        </p>
      ) : null}

      {kind === 'live' || kind === 'room' ? (
        <p className="psh-gu-note">
          <IconShield size={15} /> Vikao vya umma pekee vinaonekana hapa. Live si chapisho — ni kikao cha moja kwa moja.
        </p>
      ) : null}

      {/* ── Vitendo vya muktadha ─────────────────────────────── */}
      <div className="psh-gu-entity__acts">
        {data.friendState && !isBiz ? (
          <>
            {data.friendState === 'not_friend' ? (
              <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onAdd(data)}>
                <IconPersonAdd size={16} /> Omba Urafiki
              </button>
            ) : null}
            {data.friendState === 'sent' ? <span className="psh-gu-chip-wait"><IconCheck size={13} /> Ombi limetumwa</span> : null}
            {data.friendState === 'received' ? (
              <>
                <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onAccept(data)}>Kubali</button>
                <button type="button" className="psh-gu-btn psh-gu-btn--quiet" onClick={() => onDecline(data)}>Kataa</button>
              </>
            ) : null}
            {data.friendState === 'friend' ? <span className="psh-gu-chip-ok"><IconCheck size={13} strokeWidth={2.2} /> Rafiki wa PASIHAI</span> : null}
            {data.friendState === 'blocked' ? <span className="psh-gu-chip-block"><IconShield size={13} /> Umezuiwa (faragha imelindwa)</span> : null}
          </>
        ) : null}

        {kind === 'business' ? (
          <>
            <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onChat(data)}>
              <IconComment size={16} /> Wasiliana kwa Chat
            </button>
            <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onOpenMap?.(data)}>
              <IconMapPin size={16} /> Ramani
            </button>
          </>
        ) : null}

        {kind === 'channel' ? (
          <button
            type="button"
            className={`psh-gu-btn ${following ? 'psh-gu-btn--ghost' : 'psh-gu-btn--primary'}`}
            onClick={() => onFollow(data, !following)}
          >
            {following ? <><IconCheck size={16} /> Unafuatilia</> : 'Fuata Channel'}
          </button>
        ) : null}

        {kind === 'hub' || kind === 'community' ? (
          joined ? (
            <span className="psh-gu-chip-ok"><IconCheck size={13} strokeWidth={2.2} /> Umejiunga</span>
          ) : (
            <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onJoin(data, kind)}>
              {kind === 'community' ? 'Jiunge na Jumuiya' : 'Jiunge na Hub'}
            </button>
          )
        ) : null}

        {kind === 'group' ? (
          joined ? (
            <>
              <span className="psh-gu-chip-ok"><IconCheck size={13} strokeWidth={2.2} /> Umejiunga · ipo kwenye Chat</span>
              <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={onGoChat}>Fungua Chat <IconArrowRight size={15} /></button>
            </>
          ) : (
            <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onJoin(data, 'group')}>
              <IconGroup size={16} /> Jiunge na Kikundi
            </button>
          )
        ) : null}

        {kind === 'live' || kind === 'room' ? (
          <button
            type="button"
            className={`psh-gu-btn ${joined ? 'psh-gu-btn--ghost' : 'psh-gu-btn--primary'}`}
            onClick={() => onJoinLive?.(data)}
          >
            {joined ? (
              <>
                <IconCheck size={16} /> Umekwisha jiunga
              </>
            ) : kind === 'room' ? (
              'Sikiliza Sasa'
            ) : (
              'Jiunge na Kikao'
            )}
          </button>
        ) : null}

        {kind !== 'live' && kind !== 'room' && !isBiz ? (
          <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onOpenProfile?.(data.id)}>
            Wasifu kamili
          </button>
        ) : null}

        {/* Chat ni kitufe KIMOJA kwa kila aina (biashara ina "Wasiliana kwa Chat" juu) */}
        {kind === 'person' ? (
          <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onChat(data)}>
            <IconComment size={16} /> {data.friendState === 'friend' ? 'Anza Chat' : 'Tuma Ujumbe'}
          </button>
        ) : null}
      </div>

      <p className="psh-gu-entity__privacy">
        <IconShield size={14} /> Taarifa za umma pekee. Namba ya simu na eneo halisi havionyeshwi kwenye Gundua.
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   3) ONGEZA RAFIKI — njia: username · namba · contacts · QR · kiungo
      (Friends model ILEILE ya PASIHAI — hakuna engine ya pili)
   ══════════════════════════════════════════════════════════════ */

export function AddFriendBody({
  people,
  contacts,
  onAdd,
  onChat,
  onAccept,
  onDecline,
  onInvite,
  onCopyLink,
  onToast,
  onLookup,
}) {
  const [link, setLink] = useState(null)
  useEffect(() => {
    let live = true
    gunduaService.getMyLink().then((l) => live && setLink(l))
    return () => {
      live = false
    }
  }, [])
  const code = link?.code || null
  const [q, setQ] = useState('')
  const [number, setNumber] = useState('0784 123 456')
  const [cases, setCases] = useState(null)

  const filtered = q ? people.filter((p) => `${p.name} ${p.handle} ${p.subtitle}`.toLowerCase().includes(q.toLowerCase())) : []

  return (
    <div className="psh-gu-add">
      <p className="psh-gu-filters__lead">
        Urafiki wa PASIHAI ni <b>wa makusudi</b>: mtu hawi rafiki kwa kuonekana — unatuma ombi, yeye anakubali.
      </p>

      <section className="psh-gu-fgroup">
        <header className="psh-gu-fgroup__head"><h3 className="psh-gu-fgroup__label">Tafuta kwa jina la mtumiaji</h3></header>
        <input
          className="psh-gu-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="k.m. @baraka_e"
          aria-label="Tafuta kwa jina la mtumiaji"
        />
        {q ? (
          filtered.length ? (
            <ul className="psh-gu-plist">
              {filtered.map((p) => (
                <li key={p.id}>
                  <span className="psh-gu-plist__id">
                    <b>{p.name}</b>
                    <span>{p.handle}</span>
                  </span>
                  <PersonAction p={p} onAdd={onAdd} onChat={onChat} onAccept={onAccept} onDecline={onDecline} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="psh-gu-fnote">Hakuna mtumiaji anayelingana. Angalia jina la mtumiaji (handle).</p>
          )
        ) : null}
      </section>

      <section className="psh-gu-fgroup">
        <header className="psh-gu-fgroup__head"><h3 className="psh-gu-fgroup__label">Namba ya simu</h3></header>
        <div className="psh-gu-lookup">
          <span className="psh-gu-lookup__cc">🇹🇿 +255</span>
          <input
            className="psh-gu-input psh-gu-input--inline"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            inputMode="tel"
            aria-label="Namba ya simu"
          />
          <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={async () => setCases(await onLookup(number))}>
            Tafuta
          </button>
        </div>
        <p className="psh-gu-fnote">
          Utafutaji wa namba unatumia njia ileile ya <b>Chat</b>. Namba si utambulisho wa umma — haionyeshwi kwenye Gundua.
        </p>
        {cases?.length ? (
          <ul className="psh-gu-plist">
            {cases.map((c) => (
              <li key={c.id}>
                <span className="psh-gu-plist__id">
                  <b>{c.name || 'Hajajiunga na PASIHAI'}</b>
                  <span>{c.phone} · {c.note}</span>
                </span>
                {c.accountId ? (
                  c.friendState === 'friend' ? (
                    <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onChat({ id: c.accountId, name: c.name })}>Anza Chat</button>
                  ) : c.friendState === 'sent' ? (
                    <span className="psh-gu-chip-wait"><IconCheck size={13} /> Limetumwa</span>
                  ) : (
                    <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onAdd({ id: c.accountId, name: c.name })}>Omba Urafiki</button>
                  )
                ) : (
                  <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onInvite?.(c)}>Alika</button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="psh-gu-fgroup">
        <header className="psh-gu-fgroup__head">
          <h3 className="psh-gu-fgroup__label">Kutoka orodha yako ya simu</h3>
          <span className="psh-gu-fgroup__hint">Inaruhusiwa na wewe pekee</span>
        </header>
        <ul className="psh-gu-plist">
          {contacts.slice(0, 6).map((c) => (
            <li key={c.id}>
              <span className="psh-gu-plist__id">
                <b>{c.name}</b>
                <span>{c.phone} · {c.member ? 'Yupo PASIHAI' : 'Hajajiunga bado'}</span>
              </span>
              {!c.accountId ? (
                <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onInvite?.(c)}>Alika</button>
              ) : c.friendState === 'friend' || c.friend ? (
                <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onChat({ id: c.accountId, name: c.name })}>Chat</button>
              ) : c.friendState === 'received' ? (
                <span className="psh-gu-actions-inline">
                  <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onAccept({ id: c.accountId, name: c.name })}>Kubali</button>
                  <button type="button" className="psh-gu-btn psh-gu-btn--quiet" onClick={() => onDecline({ id: c.accountId, name: c.name })}>Kataa</button>
                </span>
              ) : c.friendState === 'sent' ? (
                <span className="psh-gu-chip-wait"><IconCheck size={13} /> Limetumwa</span>
              ) : (
                <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onAdd({ id: c.accountId, name: c.name })}>Omba Urafiki</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="psh-gu-fgroup">
        <header className="psh-gu-fgroup__head"><h3 className="psh-gu-fgroup__label">QR · kiungo · msimbo</h3></header>
        <div className="psh-gu-qr">
          <span className="psh-gu-qr__art" aria-label={`Msimbo wa ${code || 'wako'}`}>
            <IconQr size={64} />
          </span>
          <div className="psh-gu-qr__text">
            <b>{code || '—'}</b>
            <span>{link?.note}</span>
          </div>
        </div>
        <div className="psh-gu-actions-inline">
          <button
            type="button"
            className="psh-gu-btn psh-gu-btn--ghost"
            onClick={() => onCopyLink?.({ code: link?.code, link: link?.link })}
          >
            Nakili kiungo
          </button>
          <button
            type="button"
            className="psh-gu-btn psh-gu-btn--ghost"
            onClick={() => onCopyLink?.({ code: link?.code, link: link?.link }, 'scan')}
          >
            Scan QR
          </button>
        </div>
      </section>
    </div>
  )
}

function PersonAction({ p, onAdd, onChat, onAccept, onDecline }) {
  if (p.friendState === 'friend') return <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onChat(p)}>Chat</button>
  if (p.friendState === 'sent') return <span className="psh-gu-chip-wait"><IconCheck size={13} /> Limetumwa</span>
  if (p.friendState === 'received')
    return (
      <span className="psh-gu-actions-inline">
        <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onAccept(p)}>Kubali</button>
        <button type="button" className="psh-gu-btn psh-gu-btn--quiet" onClick={() => onDecline(p)}>Kataa</button>
      </span>
    )
  if (p.friendState === 'blocked') return <span className="psh-gu-chip-block"><IconShield size={13} /> Umezuiwa</span>
  return <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onAdd(p)}>Omba Urafiki</button>
}

export function AddFriendPanel({ onAdd, onChat, onAccept, onDecline, onInvite, onCopyLink, onToast }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let live = true
    ;(async () => {
      const [ideas, contacts] = await Promise.all([gunduaService.getAddFriendIdeas(), gunduaService.getContacts()])
      if (live) setData({ people: ideas.people, contacts })
    })()
    return () => { live = false }
  }, [])
  if (!data) return null
  return (
    <AddFriendBody
      {...data}
      onAdd={onAdd}
      onChat={onChat}
      onAccept={onAccept}
      onDecline={onDecline}
      onInvite={onInvite}
      onCopyLink={onCopyLink}
      onToast={onToast}
      onLookup={(n) => gunduaService.lookupNumber(n)}
    />
  )
}

/* ══════════════════════════════════════════════════════════════
   4) VITENDO VYA HARAKA (⋯ / long-press) — si njia pekee
   ══════════════════════════════════════════════════════════════ */

export function QuickActionsBody({ item, onPrimary, onShare, onSave, onHide, onToast }) {
  const [state, setState] = useState({ saved: false, hidden: false, busy: null })
  if (!item) return null

  const run = async (kind, fn, msg) => {
    setState((st) => ({ ...st, busy: kind }))
    await fn()
    setState((st) => ({ ...st, busy: null, [kind]: true }))
    onToast?.(msg)
  }
  return (
    <div className="psh-gu-quick">
      <p className="psh-gu-quick__item">
        <b>{item.name || item.title}</b>
        <span>{item.subtitle || item.handle || item.purpose || item.category || ''}</span>
      </p>
      <ul className="psh-menu">
        <li>
          <button type="button" className="psh-menu__row" onClick={onPrimary}>
            <span className="psh-menu__icon"><IconArrowRight size={18} /></span>
            <span className="psh-menu__text">
              <span className="psh-menu__label">Fungua</span>
              <span className="psh-menu__hint">Maelezo ya umma na vitendo</span>
            </span>
          </button>
        </li>
        <li>
          <button type="button" className="psh-menu__row" onClick={() => onShare?.(item)}>
            <span className="psh-menu__icon"><IconSpark size={18} /></span>
            <span className="psh-menu__text"><span className="psh-menu__label">Sambaza</span></span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className="psh-menu__row"
            disabled={state.saved || state.busy === 'saved'}
            onClick={() => run('saved', () => onSave?.(item), 'Imehifadhiwa — ipo kwenye “Zilizohifadhiwa”')}
          >
            <span className="psh-menu__icon"><IconTag size={18} /></span>
            <span className="psh-menu__text"><span className="psh-menu__label">Hifadhi kwa baadaye</span></span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className="psh-menu__row"
            disabled={state.hidden || state.busy === 'hidden'}
            onClick={() => run('hidden', () => onHide?.(item), 'Imefichwa kutoka Gundua — hutaiona tena')}
          >
            <span className="psh-menu__icon"><IconShield size={18} /></span>
            <span className="psh-menu__text">
              <span className="psh-menu__label">
                {state.hidden ? 'Imefichwa' : 'Ficha kutoka Gundua'}
              </span>
              <span className="psh-menu__hint">Hakuna taarifa kwa upande wa pili</span>
            </span>
          </button>
        </li>
      </ul>
      <p className="psh-gu-note">
        <IconInfo size={15} /> Vitendo hivi vinapatikana pia kwa kitufe ⋯ kwenye kadi — gestures ni nyongeza pekee.
      </p>
    </div>
  )
}
