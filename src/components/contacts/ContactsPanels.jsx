// ══════════════════════════════════════════════════════════════
// PASIHAI — CONTACTS PANELS (sheets)
//
// Add Contact · Import Contacts · Contact Profile · Edit · Namba yangu.
// Kila paneli inaonyesha hali zake kwa uaminifu: hai, haijasajiliwa,
// inaendelea, imeshindwa — HAKUNA ujumbe unaobuni matokeo.
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react'

import { contactsService, FRIEND_LABEL } from '../../services/contactsService.js'
import {
  Banner,
  ContactAvatar,
  Field,
  KV,
  Mark,
  Note,
  StateBlock,
  toneStyle,
} from './ContactsBits.jsx'
import {
  IconBan,
  IconChevronDown,
  IconClose,
  IconDownload,
  IconInfo,
  IconLock,
  IconText,
  IconPersonAdd,
  IconPhone,
  IconRefresh,
  IconShield,
  IconStar,
  IconUndo,
  IconChat,
  IconUser,
} from '../icons.jsx'

/* ── Kichaguzi cha nchi (dial code) ─────────────────────────── */
export function CountryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const options = useMemo(() => {
    const all = contactsService.countries
    if (!q.trim()) return all
    const needle = q.trim().toLowerCase()
    return all.filter((o) => o.name.toLowerCase().includes(needle) || o.dial.includes(needle) || o.iso.toLowerCase() === needle)
  }, [q])
  const current = contactsService.countries.find((c) => c.iso === value) || contactsService.countries[0]

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" className="psh-cx-country" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span aria-hidden="true">{current.flag}</span> {current.dial}
        <IconChevronDown size={14} />
      </button>
      {open ? (
        <div
          style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 5, width: 268, maxHeight: 300, overflowY: 'auto',
            background: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)', boxShadow: 'var(--sh-3)',
          }}
          role="listbox"
        >
          <div style={{ position: 'sticky', top: 0, background: 'var(--bg)', padding: 8, borderBottom: '1px solid var(--line)' }}>
            <input
              className="psh-cx-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tafuta nchi"
              aria-label="Tafuta nchi"
              autoFocus
            />
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 4 }}>
            {options.slice(0, 60).map((o) => (
              <li key={o.iso}>
                <button
                  type="button"
                  className="psh-cx-menu__row"
                  style={{ borderTop: 0, padding: '9px 8px', borderRadius: 'var(--r-sm)' }}
                  onClick={() => { onChange(o.iso); setOpen(false); setQ('') }}
                >
                  <span aria-hidden="true" style={{ width: 22 }}>{o.flag}</span>
                  <span className="psh-cx-menu__label">{o.name}</span>
                  <span className="psh-cx-phone">{o.dial}</span>
                </button>
              </li>
            ))}
            {!options.length ? <li style={{ padding: 10, fontSize: 'var(--fs-13)', color: 'var(--t-2)' }}>Hakuna nchi inayolingana.</li> : null}
          </ul>
        </div>
      ) : null}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════
   1) ADD CONTACT
   ══════════════════════════════════════════════════════════════ */

export function AddContactBody({ onSaved, onOpenContact, onToast, onOpenMyNumber }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState(contactsService.defaultCountry)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const parsed = useMemo(() => (phone.trim() ? contactsService.parsePhone(phone, country) : null), [phone, country])

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await contactsService.addContact({ name, phone, country })
      setResult(res)
      onToast?.(res.duplicate ? 'Contact alikuwa amehifadhiwa tayari' : 'Contact amehifadhiwa')
      if (!res.duplicate) onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    const acc = result.accountId
    return (
      <div className="psh-cx-panel">
        <Banner kind={result.matched ? 'info' : 'demo'} icon={result.matched ? <Mark kind="verified" /> : <IconInfo size={15} />}>
          {result.duplicate
            ? 'Contact huyu alikuwa amehifadhiwa — hakuna kunakili.'
            : result.matched
              ? 'Namba hii inamilikiwa na akaunti ya ChatHai. Contact ameunganishwa na akaunti.'
              : 'Namba hii haijasajiliwa ChatHai bado. Contact imehifadhiwa kama namba ya simu — unaweza kumwalika.'}
        </Banner>
        <div className="psh-cx-actions">
          {acc ? (
            <button type="button" className="psh-cx-btn psh-cx-btn--primary" onClick={() => onOpenContact?.(result.contact.id || result.contact)}>
              <IconUser size={15} /> Fungua wasifu
            </button>
          ) : null}
          <button type="button" className="psh-cx-btn" onClick={() => { setResult(null); setName(''); setPhone('') }}>
            Ongeza mwingine
          </button>
        </div>
        <Note>
          Kuhifadhi contact hakumfanyi kuwa rafiki, na hakumpa ruhusa ya kuona namba yako.
          Kutuma ujumbe ni hatua tofauti kabisa.
        </Note>
      </div>
    )
  }

  return (
    <div className="psh-cx-panel">
      <Field label="Jina la contact">
        <input
          className="psh-cx-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="k.m. Amina (mwalimu)"
          autoComplete="off"
        />
      </Field>

      <Field
        label="Namba ya simu"
        hint={parsed?.valid ? `Itahifadhiwa kama ${parsed.e164}` : 'Chagua nchi, kisha andika namba (unaweza kuanza na 0).'}
        error={parsed && !parsed.valid && phone.trim().length > 3 ? 'Namba haijakamilika au si sahihi kwa nchi hii.' : ''}
      >
        <div className="psh-cx-phone-row">
          <CountryPicker value={country} onChange={setCountry} />
          <input
            className={`psh-cx-input psh-cx-input--inline ${parsed && !parsed.valid && phone.trim().length > 3 ? 'psh-cx-input--invalid' : ''}`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="784 123 456"
            aria-label="Namba ya simu"
          />
        </div>
      </Field>

      {error ? <Banner kind="err"><IconInfo size={15} /> {error}</Banner> : null}

      <div className="psh-cx-actions">
        <button
          type="button"
          className="psh-cx-btn psh-cx-btn--primary"
          disabled={busy || !name.trim() || !parsed?.valid}
          onClick={save}
        >
          <IconPersonAdd size={15} /> {busy ? 'Inahifadhi…' : 'Hifadhi contact'}
        </button>
      </div>

      <Note>
        Utafutaji wa akaunti hutumia namba kamili (E.164). Namba ya mtu mwingine haionyeshwi
        kwa wengine, na akaunti haijulikani kwa wengine bila ruhusa yake.
      </Note>
      {!contactsService.isDemoEnvironment() ? null : (
        <Note>Mtandao huu unaonyesha data ya majaribio (demo) — hakuna namba halisi.</Note>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   2) IMPORT CONTACTS (kifaa)
   ══════════════════════════════════════════════════════════════ */

/** Je, browser ina Contact Picker? (Chrome/Android pekee kwa sasa) */
export function supportsContactPicker() {
  return typeof navigator !== 'undefined' && 'contacts' in navigator && typeof navigator.contacts?.select === 'function'
}

export function ImportContactsBody({ onDone, onToast }) {
  const [stage, setStage] = useState('intro')     // intro · picking · review · done
  const [rows, setRows] = useState([])
  const [picked, setPicked] = useState({})
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [paste, setPaste] = useState('')
  const [prep, setPrep] = useState(null)
  const supported = supportsContactPicker()

  const pick = async () => {
    setStage('picking')
    setError('')
    try {
      const sel = await navigator.contacts.select(['name', 'tel'], { multiple: true })
      const raw = []
      for (const c of sel || []) {
        const nm = (c.name || [])[0] || ''
        for (const t of c.tel || []) raw.push({ name: nm, phone: t })
      }
      const p = contactsService.prepareImport(raw)
      setPrep(p)
      setRows(p.rows)
      setPicked(Object.fromEntries(p.rows.map((_, i) => [i, true])))
      setStage('review')
    } catch (err) {
      setError(err?.message || 'Ruhusa haikutolewa. Unaweza kuandika namba mwenyewe.')
      setStage('intro')
    }
  }

  const usePasted = () => {
    const raw = String(paste)
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^(.*?)[,;\t]\s*(\+?[0-9][0-9\s-]{5,})$/)
        return m ? { name: m[1].trim(), phone: m[2] } : { name: '', phone: line }
      })
    const p = contactsService.prepareImport(raw)
    setPrep(p)
    setRows(p.rows)
    setPicked(Object.fromEntries(p.rows.map((_, i) => [i, true])))
    setStage('review')
  }

  const runImport = async () => {
    setStage('saving')
    setError('')
    try {
      const chosen = rows.filter((_, i) => picked[i])
      if (!chosen.length) { setError('Hakuna contact uliyechagua.'); setStage('review'); return }
      const res = await contactsService.importSelected(chosen)
      setSummary(res)
      setStage('done')
      onToast?.(`Import: ${res.saved} wamehifadhiwa · ${res.matched} wameunganishwa na akaunti`)
      onDone?.()
    } catch (err) {
      setError(err.message)
      setStage('review')
    }
  }

  if (stage === 'intro') {
    return (
      <div className="psh-cx-panel">
        <Banner kind="info" icon={<IconShield size={15} />}>
          Import inaomba ruhusa ya orodha yako ya simu <b>kwa hiari yako</b>, na unachagua
          contact gani kuhifadhi. Hatuupload orodha yote kimya kimya.
        </Banner>

        {supported ? (
          <div className="psh-cx-actions">
            <button type="button" className="psh-cx-btn psh-cx-btn--primary" onClick={pick}>
              <IconDownload size={15} /> Chagua contacts kutoka kifaa
            </button>
          </div>
        ) : (
          <Banner kind="demo" icon={<IconInfo size={15} />}>
            Kivinjari hiki hakiwezi kusoma orodha ya simu moja kwa moja (Contact Picker
            haipatikani). Tumia njia ya mkono hapa chini — kuna <b>Skip/Cancel</b> kila wakati.
          </Banner>
        )}

        <Field
          label="Andika namba mwenyewe (bila kusoma kifaa)"
          hint="Mstari mmoja kwa kila contact: Jina, +255754000111"
        >
          <textarea
            className="psh-cx-input"
            style={{ minHeight: 120, fontFamily: 'inherit' }}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={'Neema, +255754000111\nHamisi, 0754 987 654'}
            aria-label="Orodha ya namba"
          />
        </Field>

        {error ? <Banner kind="err"><IconInfo size={15} /> {error}</Banner> : null}

        <div className="psh-cx-actions">
          <button type="button" className="psh-cx-btn" onClick={usePasted} disabled={!paste.trim()}>
            Endelea na orodha hii
          </button>
        </div>

        <Note>
          Ruhusa inaweza kuondolewa wakati wowote kwenye mipangilio ya kivinjari; hatufanyi
          usawazishaji wa chinichini bila taarifa.
        </Note>
      </div>
    )
  }

  if (stage === 'picking') {
    return <StateBlock kind="loading" title="Inasubiri ruhusa…" body="Chagua 'Ruhusu' kwenye kivinjari ili kuendelea, au funga ili kuachana." />
  }

  if (stage === 'review' || stage === 'saving') {
    const chosenCount = Object.values(picked).filter(Boolean).length
    return (
      <div className="psh-cx-panel">
        <Banner kind="info" icon={<IconInfo size={15} />}>
          {rows.length} namba zilizosomwa{prep?.duplicates ? ` · ${prep.duplicates} duplicate zimeondolewa` : ''}
          {prep?.invalid ? ` · ${prep.invalid} si sahihi` : ''}. Chagua unazotaka kuhifadhi.
        </Banner>

        {error ? <Banner kind="err"><IconInfo size={15} /> {error}</Banner> : null}

        <ul className="psh-cx-import-list">
          {rows.map((r, i) => (
            <li key={`${r.phoneE164}-${i}`}>
              <input
                type="checkbox"
                checked={Boolean(picked[i])}
                onChange={(e) => setPicked((p) => ({ ...p, [i]: e.target.checked }))}
                aria-label={`Chagua ${r.displayName}`}
              />
              <span className="psh-cx-import-list__body">
                <span className="psh-cx-import-list__name">{r.displayName}</span>
                <span className="psh-cx-import-list__meta">{contactsService.maskPhone(r.phoneE164)}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="psh-cx-actions">
          <button
            type="button"
            className="psh-cx-btn psh-cx-btn--primary"
            disabled={stage === 'saving' || !chosenCount}
            onClick={runImport}
          >
            {stage === 'saving' ? 'Inahifadhi…' : `Hifadhi (${chosenCount})`}
          </button>
          <button type="button" className="psh-cx-btn psh-cx-btn--ghost" onClick={() => setStage('intro')}>
            <IconClose size={15} /> Acha
          </button>
        </div>
      </div>
    )
  }

  // done
  return (
    <div className="psh-cx-panel">
      <Banner kind="info" icon={<Mark kind="synced" />}>Import imekamilika.</Banner>
      <div className="psh-cx-result">
        <div className="psh-cx-result__row"><span>Wamehifadhiwa (zote)</span><span className="psh-cx-result__n">{summary?.saved ?? 0}</span></div>
        <div className="psh-cx-result__row"><span>Waliounganishwa na akaunti</span><span className="psh-cx-result__n">{summary?.matched ?? 0}</span></div>
        <div className="psh-cx-result__row"><span>Wasiokuwa na akaunti (namba pekee)</span><span className="psh-cx-result__n">{summary?.unmatched ?? 0}</span></div>
        <div className="psh-cx-result__row"><span>Waliokuwepo tayari (duplicates)</span><span className="psh-cx-result__n">{summary?.duplicates ?? 0}</span></div>
        <div className="psh-cx-result__row"><span>Imeshindwa</span><span className="psh-cx-result__n">{summary?.failed ?? 0}</span></div>
      </div>
      <Note>
        Siku zote unaweza kufuta contact yoyote bila kuathiri akaunti ya mtu, urafiki wala
        historia ya mazungumzo.
      </Note>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   3) CONTACT PROFILE
   ══════════════════════════════════════════════════════════════ */

export function ContactProfileBody({ item, onToast, onChanged, onMessage, onOpenChatWith, onEditContact, onDeleted }) {
  const [state, setState] = useState(() => item?.friendState || null)
  const [busy, setBusy] = useState('')
  const [blocked, setBlocked] = useState(item?.friendState === 'blocked')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => { setState(item?.friendState || null) }, [item?.friendState])
  useEffect(() => { setBlocked(item?.friendState === 'blocked') }, [item?.friendState])

  const run = async (kind, fn, msg) => {
    setBusy(kind)
    try {
      await fn()
      if (msg) onToast?.(msg)
      onChanged?.()
    } catch (err) {
      onToast?.(err.message)
    } finally {
      setBusy('')
    }
  }

  const friendAction = async () => {
    if (!item.accountId) return
    if (state === 'friend') return run('friend', () => contactsService.cancelFriend(item.accountId), 'Urafiki umebadilishwa')
    if (state === 'sent') return run('friend', () => contactsService.cancelFriend(item.accountId), 'Ombi limeondolewa')
    if (state === 'received') return run('friend', () => contactsService.respondFriend(item.accountId, 'accept'), 'Urafiki umekubaliwa')
    return run('friend', async () => {
      await contactsService.addFriend(item.accountId)
      setState('sent')
    }, 'Ombi la urafiki limetumwa')
  }

  const friendLabel = {
    friend: 'Ondoa urafiki',
    sent: 'Ghairi ombi',
    received: 'Kubali urafiki',
    not_friend: 'Ongeza rafiki',
  }[state || 'not_friend']

  return (
    <div className="psh-cx-profile">
      <div className="psh-cx-profile__top">
        <ContactAvatar size={64} className="psh-cx-profile__ava" name={item.displayName} tone={item.accountTone} url={item.avatarSnapshotUrl} />
        <span className="psh-cx-profile__id">
          <span className="psh-cx-profile__name">
            {item.displayName}
            {item.accountVerified ? <Mark kind="verified" size={15} lg /> : null}
            {item.isFavorite ? <Mark kind="favorite" size={15} lg /> : null}
          </span>
          <span className="psh-cx-profile__sub">
            {item.accountHandle || (item.accountId ? 'ChatHai' : 'Hajajiunga ChatHai bado')}
          </span>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`psh-cx-pill ${item.friendState === 'friend' ? 'psh-cx-pill--friend' : item.friendState === 'sent' ? 'psh-cx-pill--sent' : item.friendState === 'received' ? 'psh-cx-pill--received' : item.friendState === 'blocked' ? 'psh-cx-pill--blocked' : 'psh-cx-pill--noaccount'}`}>
              {FRIEND_LABEL[item.friendState || 'not_friend'] || 'Hali haijulikani'}
            </span>
            {item.demo ? <span className="psh-cx-pill psh-cx-pill--demo">demo</span> : null}
          </span>
        </span>
      </div>

      <div className="psh-cx-profile__rows">
        <KV k="Namba (nimeihifadhi)" v={item.phoneDisplay || '—'} />
        <KV k="Chanzo" v={item.source === 'device_import' ? 'Kutoka kifaa' : item.source === 'discovered' ? 'Niligundua' : 'Nilijongeza'} />
        {item.notes ? <KV k="Maelezo yangu" v={item.notes} /> : null}
      </div>

      {!item.accountId ? (
        <Note>
          Mtu huyu hajasajiliwa ChatHai. Namba inabaki kuwa yako (contacts zako ni zako),
          na unaweza kumwalika ajiunge ili muweze kuzungumza.
        </Note>
      ) : null}

      <div className="psh-cx-actions">
        {item.accountId ? (
          <button type="button" className="psh-cx-btn psh-cx-btn--primary" onClick={() => onMessage?.(item)}>
            <IconChat size={15} /> Tuma ujumbe
          </button>
        ) : null}
        <button type="button" className="psh-cx-btn" onClick={() => onEditContact?.(item)} disabled={busy !== ''}>
          <IconText size={15} /> Badilisha jina / maelezo
        </button>
      </div>

      <ul className="psh-cx-menu">
        <li>
          <button type="button" className="psh-cx-menu__row" disabled={busy !== ''} onClick={() => run('fav', () => contactsService.toggleFavorite(item.id, !item.isFavorite), item.isFavorite ? 'Imeondolewa kwenye vipendwa' : 'Imeongezwa kwenye vipendwa')}>
            <span className="psh-cx-menu__ico"><IconStar size={18} /></span>
            <span className="psh-cx-menu__label">{item.isFavorite ? 'Ondoa kwenye vipendwa' : 'Weka kwenye vipendwa'}</span>
          </button>
        </li>
        {item.accountId ? (
          <li>
            <button type="button" className="psh-cx-menu__row" disabled={busy !== ''} onClick={friendAction}>
              <span className="psh-cx-menu__ico"><IconUser size={18} /></span>
              <span className="psh-cx-menu__label">{friendLabel}</span>
              <span className="psh-cx-menu__hint">Urafiki ni tofauti na contact</span>
            </button>
          </li>
        ) : null}
        {item.phoneE164 ? (
          <li>
            <button type="button" className="psh-cx-menu__row" disabled={busy !== ''} onClick={() => run('sync', () => contactsService.refreshContact(item.id), 'Taarifa zimesasishwa kutoka akaunti')}>
              <span className="psh-cx-menu__ico"><IconRefresh size={18} /></span>
              <span className="psh-cx-menu__label">Sasisha taarifa za akaunti</span>
            </button>
          </li>
        ) : null}
        {!item.accountId && item.phoneE164 ? (
          <li>
            <button type="button" className="psh-cx-menu__row" disabled={busy !== ''} onClick={() => run('link', () => contactsService.linkContact(item.id), 'Imefanikiwa kama akaunti imepatikana')}>
              <span className="psh-cx-menu__ico"><IconRefresh size={18} /></span>
              <span className="psh-cx-menu__label">Tafuta akaunti kwa namba hii</span>
            </button>
          </li>
        ) : null}
        {item.accountId ? (
          <li>
            <button
              type="button"
              className={`psh-cx-menu__row ${blocked ? '' : 'psh-cx-menu__row--danger'}`}
              disabled={busy !== ''}
              onClick={() => run('block', async () => {
                if (blocked) { await contactsService.unblockAccount(item.accountId); setBlocked(false) }
                else { await contactsService.blockAccount(item.accountId); setBlocked(true) }
              }, blocked ? 'Umezuiwa amefunguliwa' : 'Mtu amezuiwa')}
            >
              <span className="psh-cx-menu__ico"><IconBan size={18} /></span>
              <span className="psh-cx-menu__label">{blocked ? 'Fungua (unblock)' : 'Zuia mtu huyu'}</span>
            </button>
          </li>
        ) : null}
        <li>
          <button type="button" className="psh-cx-menu__row" disabled={busy !== ''} onClick={() => run('report', () => contactsService.reportAccount(item.accountId, 'contact-profile'), 'Ripoti imetumwa kwenye safu ya ripoti')}>
            <span className="psh-cx-menu__ico"><IconShield size={18} /></span>
            <span className="psh-cx-menu__label">Ripoti</span>
          </button>
        </li>
      </ul>

      {!confirmDelete ? (
        <button type="button" className="psh-cx-btn psh-cx-btn--danger" onClick={() => setConfirmDelete(true)}>
          Futa contact (akaunti na chat haziguswi)
        </button>
      ) : (
        <div className="psh-cx-panel">
          <Banner kind="err" icon={<IconInfo size={15} />}>
            Kufuta contact kunaondoa safu yako pekee. Hakuna akaunti, urafiki wala historia ya
            mazungumzo inayoondolewa.
          </Banner>
          <div className="psh-cx-actions">
            <button
              type="button"
              className="psh-cx-btn psh-cx-btn--danger"
              disabled={busy !== ''}
              onClick={() => run('del', async () => {
                const res = await contactsService.deleteContact(item.id)
                onToast?.('Contact imefutwa — unaweza kurudisha')
                onDeleted?.(res.undo)
              })}
            >
              Ndiyo, futa
            </button>
            <button type="button" className="psh-cx-btn psh-cx-btn--ghost" onClick={() => setConfirmDelete(false)}>Acha</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   4) EDIT CONTACT (jina la mmiliki + maelezo)
   ══════════════════════════════════════════════════════════════ */

export function EditContactBody({ item, onSaved, onToast }) {
  const [name, setName] = useState(item?.displayName || '')
  const [notes, setNotes] = useState(item?.notes || '')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await contactsService.renameContact(item.id, name)
      await contactsService.setNotes(item.id, notes)
      onToast?.('Mabadiliko yamehifadhiwa')
      onSaved?.()
    } catch (err) {
      onToast?.(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="psh-cx-panel">
      <Field label="Jina unalolitumia" hint="Hili ni jina lako binafsi — haliibadilishi wasifu wa mtu mwingine.">
        <input className="psh-cx-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Field>
      <Field label="Maelezo (yako pekee)" hint="Maelezo haya yanaonekana kwako tu.">
        <textarea className="psh-cx-input" style={{ minHeight: 90, fontFamily: 'inherit' }} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </Field>
      <div className="psh-cx-actions">
        <button type="button" className="psh-cx-btn psh-cx-btn--primary" disabled={busy || !name.trim()} onClick={save}>
          {busy ? 'Inahifadhi…' : 'Hifadhi'}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   5) NAMBA YANGU (uthibitisho · ugunduzi · kuondoa)
   ══════════════════════════════════════════════════════════════ */

export function MyNumberBody({ phone, onChanged, onToast }) {
  const [busy, setBusy] = useState('')
  const [value, setValue] = useState('')
  const [country, setCountry] = useState(contactsService.defaultCountry)
  const [error, setError] = useState('')
  const parsed = useMemo(() => (value.trim() ? contactsService.parsePhone(value, country) : null), [value, country])

  const save = async () => {
    setBusy('save')
    setError('')
    try {
      await contactsService.setMyPhone(value, country)
      onToast?.('Namba yako imehifadhiwa')
      setValue('')
      onChanged?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  const toggleDiscoverable = async () => {
    setBusy('disc')
    try {
      await contactsService.setDiscoverable(!phone?.discoverable)
      onToast?.(phone?.discoverable ? 'Ugunduzi kwa namba umezimwa' : 'Ugunduzi kwa namba umewashwa')
      onChanged?.()
    } catch (err) {
      onToast?.(err.message)
    } finally {
      setBusy('')
    }
  }

  const remove = async () => {
    setBusy('remove')
    try {
      await contactsService.clearMyPhone()
      onToast?.('Namba imeondolewa kwenye akaunti yako')
      onChanged?.()
    } catch (err) {
      onToast?.(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="psh-cx-panel">
      {phone ? (
        <>
          <div className="psh-cx-profile__rows">
            <KV k="Namba yako" v={phone.phoneDisplay} />
            <KV k="Ithibitishwe" v={phone.verifiedAt ? new Date(phone.verifiedAt).toLocaleDateString('sw-TZ') : '—'} />
            <KV k="Inagundulika kwa namba" v={phone.discoverable ? 'Ndiyo' : 'Hapana'} />
          </div>
          <div className="psh-cx-actions">
            <button type="button" className="psh-cx-btn" disabled={busy !== ''} onClick={toggleDiscoverable}>
              <IconLock size={15} /> {phone.discoverable ? 'Zima ugunduzi' : 'Washa ugunduzi'}
            </button>
            <button type="button" className="psh-cx-btn psh-cx-btn--danger" disabled={busy !== ''} onClick={remove}>
              <IconClose size={15} /> Ondoa namba
            </button>
          </div>
        </>
      ) : (
        <Banner kind="demo" icon={<IconInfo size={15} />}>
          Hujahifadhi namba bado. Ukiihifadhi, marafiki waliokuhifadhi kwa namba hiyo
          wataweza kukuunganisha na akaunti yako — kwa idhini yako.
        </Banner>
      )}

      <Field
        label={phone ? 'Badilisha namba' : 'Ongeza namba'}
        hint="Kanuni: namba haionyeshwi kwa mtu mwingine; inathibitishwa kwa OTP kabla ya kutumika."
        error={parsed && !parsed.valid && value.trim().length > 3 ? 'Namba si sahihi kwa nchi hii.' : ''}
      >
        <div className="psh-cx-phone-row">
          <CountryPicker value={country} onChange={setCountry} />
          <input
            className="psh-cx-input psh-cx-input--inline"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="tel"
            placeholder="712 345 678"
            aria-label="Namba yangu"
          />
        </div>
      </Field>

      {error ? <Banner kind="err" icon={<IconInfo size={15} />}>{error}</Banner> : null}

      <div className="psh-cx-actions">
        <button type="button" className="psh-cx-btn psh-cx-btn--primary" disabled={busy !== '' || !parsed?.valid} onClick={save}>
          <IconPhone size={15} /> {busy === 'save' ? 'Inahifadhi…' : 'Hifadhi namba'}
        </button>
      </div>

      <Note icon={<IconInfo size={15} />}>
        Uthibitisho wa namba unatokana na Supabase Auth (OTP). Hatuweki OTP wala siri yoyote
        kwenye contacts; namba haitumiki kama kitambulisho cha akaunti.
      </Note>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   6) HATUA YA KURUDISHA (undo) — baada ya kufuta
   ══════════════════════════════════════════════════════════════ */

export function UndoDeleted({ snapshot, onUndone, onToast }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { setGone(true) }, 20000)
    return () => clearTimeout(t)
  }, [])

  if (!snapshot || gone) return null
  return (
    <Banner
      kind="off"
      icon={<IconUndo size={15} />}
      action={
        <button
          type="button"
          className="psh-cx-btn psh-cx-btn--sm"
          disabled={busy}
          ref={ref}
          onClick={async () => {
            setBusy(true)
            try {
              await contactsService.restoreContact(snapshot)
              onToast?.('Contact amerudishwa')
              onUndone?.()
              setGone(true)
            } catch (err) {
              onToast?.(err.message)
            } finally {
              setBusy(false)
            }
          }}
        >
          Rudisha
        </button>
      }
    >
      Contact “{snapshot.displayName}” imefutwa.
    </Banner>
  )
}

export { toneStyle }
