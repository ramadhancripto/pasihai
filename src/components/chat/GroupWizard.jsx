// ══════════════════════════════════════════════════════════════
// PASIHAI — CHATHAI GROUPS: WIZARD YA UUNDAJI WA KIKUNDI (M1)
//
// Master spec §5: taarifa zinapangwa kwa hatua zinazoeleweka —
// Msingi → Utambulisho → Sheria → Kujiunga → Wanachama → Muhtasari.
// Hatua za hiari zinaweza kurukwa; hakuna kulazimisha taarifa za hiari.
// Owner = muundaji (backend inamlinda kwa role='owner').
//
// Njia MOJA ya data: chatService.validateGroupDraft + chatService.createGroup
// (mock na live repositories wanashiriki model ileile ya settings).
// UI haidai mafanikio kabla ya mafanikio halisi (§56).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'

import useAsyncData from '../../hooks/useAsyncData.js'
import { chatService } from '../../services/chatService.js'
import {
  GROUP_ANNOUNCEMENT_SENDERS,
  GROUP_ANNOUNCEMENT_SENDERS_LABELS,
  GROUP_COVER_MAX_BYTES,
  GROUP_DESCRIPTION_MAX,
  GROUP_DP_MAX_BYTES,
  GROUP_IMAGE_TYPES,
  GROUP_JOIN_LABELS,
  GROUP_JOIN_METHODS,
  GROUP_LANGUAGE_LABELS,
  GROUP_LANGUAGES,
  GROUP_LOCATION_VISIBILITY,
  GROUP_LOCATION_VISIBILITY_LABELS,
  GROUP_NAME_MAX,
  GROUP_PRIVACY_LABELS,
  GROUP_RULES_MAX,
  GROUP_SLOW_MODE,
  GROUP_SLOW_MODE_LABELS,
  GROUP_TEXT_MAX,
  GROUP_TYPE_LABELS,
  GROUP_TYPES,
  GROUP_WHO_CAN_ADD,
  GROUP_WHO_CAN_ADD_LABELS,
  GROUP_WHO_CAN_REACT,
  GROUP_WHO_CAN_REACT_LABELS,
  GROUP_WHO_CAN_REPLY,
  GROUP_WHO_CAN_REPLY_LABELS,
  groupMemberLimit,
} from '../../config/groupLimits.js'
import { ChatAvatar } from './ChatBits.jsx'
import { GROUP_TONES, PersonRow } from './ChatPanels.jsx'
import { Chip } from '../ui.jsx'
import {
  IconSearchSmall,
  IconInfo,
  IconClose,
  IconPhoto,
} from '../icons.jsx'

const STEPS = [
  { id: 'msingi', title: 'Msingi' },
  { id: 'wanachama', title: 'Wanachama' },
  { id: 'mipangilio', title: 'Mipangilio', optional: true },
  { id: 'muhtasari', title: 'Muhtasari' },
]

const TEXT_LIMITS = {
  description: GROUP_DESCRIPTION_MAX,
  purpose: GROUP_TEXT_MAX,
  goals: GROUP_TEXT_MAX,
  procedures: GROUP_TEXT_MAX,
  rules: GROUP_RULES_MAX,
  warnings: GROUP_TEXT_MAX,
  consequences: GROUP_TEXT_MAX,
}

function Field({ id, label, hint, error, required, children }) {
  return (
    <label className={`psh-gw-field ${error ? 'is-err' : ''}`} htmlFor={id}>
      <span className="psh-gw-field__label">
        {label}
        {required ? <span className="psh-gw-field__req"> *</span> : <span className="psh-gw-field__opt"> (hiari)</span>}
      </span>
      {hint ? <span className="psh-gw-field__hint">{hint}</span> : null}
      {children}
      {error ? (
        <span className="psh-gw-field__err" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}

function OptionRow({ label, hint, options, value, onChange, name }) {
  return (
    <div className="psh-gw-field" role="radiogroup" aria-label={label}>
      <span className="psh-gw-field__label">{label}</span>
      {hint ? <span className="psh-gw-field__hint">{hint}</span> : null}
      <div className="psh-gw-opts">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className={`psh-gw-opt ${value === o.id ? 'is-on' : ''}`}
            onClick={() => onChange(o.id)}
            data-name={name}
          >
            <span className="psh-gw-opt__label">{o.label}</span>
            {o.hint ? <span className="psh-gw-opt__hint">{o.hint}</span> : null}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function GroupWizard({ view: viewProp = null, onCreate, onToast }) {
  /* Chanzo kimoja cha orodha ya watu: chatService.getNewChat (kama New Chat).
     Prop inawezekana kwa tests; la sivyo tunasoma wenyewe. */
  const fetched = useAsyncData(() => chatService.getNewChat(), [])
  const view = viewProp || fetched
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const [draft, setDraft] = useState({
    name: '',
    tone: 'green',
    type: 'normal',
    privacy: 'private',
    description: '',
    purpose: '',
    goals: '',
    language: 'sw',
    foundingLocation: '',
    locationVisibility: 'hidden',
    rules: '',
    procedures: '',
    warnings: '',
    consequences: '',
    joinMethod: 'request',
    whoCanAdd: 'owner_admins',
    whoCanReply: 'all',
    whoCanReact: 'all',
    announcementSenders: 'owner_admins',
    slowModeSeconds: 0,
  })
  const [picked, setPicked] = useState([])
  const [dp, setDp] = useState(null) // { file, url }
  const [cover, setCover] = useState(null) // { file, url }
  const [q, setQ] = useState('')

  const limit = groupMemberLimit(draft.type)
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const stepDef = STEPS[step]

  /* Object URLs za preview — zinafutwa tunapoondoka (hakuna kuvuja memory). */
  useEffect(() => {
    return () => {
      if (dp?.url) URL.revokeObjectURL(dp.url)
      if (cover?.url) URL.revokeObjectURL(cover.url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (id) => {
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id)
      if (p.length + 1 >= limit) return p // kikomo kimefika — hakuna kuchagua zaidi
      return [...p, id]
    })
  }

  const pickImage = (kind) => (ev) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    const max = kind === 'dp' ? GROUP_DP_MAX_BYTES : GROUP_COVER_MAX_BYTES
    if (!GROUP_IMAGE_TYPES.includes(file.type)) {
      setFieldErrors((f) => ({ ...f, [kind]: 'Aina ya picha haitumiki (JPEG · PNG · WebP · GIF).' }))
      return
    }
    if (file.size > max) {
      setFieldErrors((f) => ({ ...f, [kind]: `Picha ni kubwa mno — kikomo ni ${Math.round(max / 1048576)}MB.` }))
      return
    }
    const url = URL.createObjectURL(file)
    if (kind === 'dp') {
      if (dp?.url) URL.revokeObjectURL(dp.url)
      setDp({ file, url })
    } else {
      if (cover?.url) URL.revokeObjectURL(cover.url)
      setCover({ file, url })
    }
    setFieldErrors((f) => ({ ...f, [kind]: undefined }))
  }

  const clearImage = (kind) => {
    if (kind === 'dp') {
      if (dp?.url) URL.revokeObjectURL(dp.url)
      setDp(null)
    } else {
      if (cover?.url) URL.revokeObjectURL(cover.url)
      setCover(null)
    }
  }

  const stepErrors = (id) => {
    const errors = {}
    if (id === 'msingi') {
      const name = draft.name.trim()
      if (!name) errors.name = 'Jina la kikundi linahitajika.'
      else if (name.length > GROUP_NAME_MAX) errors.name = `Jina lisiwe zaidi ya herufi ${GROUP_NAME_MAX}.`
    }
    if (id === 'wanachama') {
      if (picked.length === 0) errors.members = 'Chagua angalau contact mmoja.'
      else if (picked.length + 1 > limit) errors.members = `Kikomo cha wanachama kwa aina hii ni ${limit} (wewe unahesabiwa).`
    }
    return errors
  }

  const goNext = () => {
    const errors = stepErrors(stepDef.id)
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setError('')
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setError('')
    setStep((s) => Math.max(0, s - 1))
  }

  const submit = async () => {
    if (busy) return // kuzuia double submission kwa kubonyeza mara mbili
    /* Ukaguzi wa mwisho wa hatua zote za lazima — kabla ya kuunda. */
    const all = { ...stepErrors('msingi'), ...stepErrors('wanachama') }
    const { ok, errors } = chatService.validateGroupDraft({ ...draft, members: picked })
    if (!ok) Object.assign(all, errors)
    if (Object.keys(all).length) {
      setFieldErrors(all)
      setStep(all.members ? 1 : 0)
      return
    }
    setBusy(true)
    setError('')
    try {
      await onCreate({
        ...draft,
        members: picked,
        files: { dp: dp?.file || null, cover: cover?.file || null },
      })
      /* Mafanikio: mzazi (Chat.jsx) anafunga sheet na kufungua kikundi.
         Hapa HATUBADILISHI hali — hakuna toast ya uongo. */
    } catch (err) {
      setError(
        err?.errors ? Object.values(err.errors)[0] : err?.message || 'Kikundi hakikuweza kuundwa. Jaribu tena.',
      )
      setBusy(false)
    }
  }

  if (!view) {
    return (
      <div className="psh-panelstack" aria-busy="true">
        <p className="psh-note">
          <IconInfo size={16} /> Inapakia…
        </p>
      </div>
    )
  }

  const all = [...view.savedFriends, ...view.pasihaiFriends, ...view.accounts]
  const list = q ? all.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : all
  const atLimit = picked.length + 1 >= limit

  return (
    <div className="psh-gw">
      <ol className="psh-gw-steps" aria-label="Hatua za uundaji wa kikundi">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            className={`psh-gw-steppill ${i === step ? 'is-on' : ''} ${i < step ? 'is-done' : ''}`}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className="psh-gw-steppill__n">{i + 1}</span>
            <span className="psh-gw-steppill__t">{s.title}</span>
          </li>
        ))}
      </ol>

      {error ? (
        <p className="psh-gw-banner psh-gw-banner--err" role="alert">
          {error}
        </p>
      ) : null}

      {/* ── 1. Msingi ─────────────────────────────────────── */}
      {stepDef.id === 'msingi' ? (
        <>
          <div className="psh-gw-media">
            <ChatAvatar
              tone={draft.tone}
              name={(draft.name || 'Kikundi').slice(0, 2).toUpperCase()}
              size="md"
              src={dp?.url || null}
            />
            <div className="psh-gw-media__actions">
              <label className="psh-btn psh-gw-upload">
                <input
                  type="file"
                  accept={GROUP_IMAGE_TYPES.join(',')}
                  className="u-sr"
                  onChange={pickImage('dp')}
                  aria-label="Pakia DP ya kikundi"
                />
                <IconPhoto size={15} /> {dp ? 'Badilisha DP' : 'Pakia DP'}
              </label>
              {dp ? (
                <button type="button" className="psh-btn" onClick={() => clearImage('dp')} aria-label="Ondoa DP ya kikundi">
                  <IconClose size={14} /> Ondoa
                </button>
              ) : null}
            </div>
          </div>
          {fieldErrors.dp ? (
            <span className="psh-gw-field__err" role="alert">
              {fieldErrors.dp}
            </span>
          ) : null}

          <Field id="gw-name" label="Jina la kikundi" error={fieldErrors.name} required>
            <input
              id="gw-name"
              className="psh-gw-input"
              value={draft.name}
              onChange={(e) => {
                set({ name: e.target.value })
                if (fieldErrors.name) setFieldErrors((f) => ({ ...f, name: undefined }))
              }}
              maxLength={GROUP_NAME_MAX + 20}
              placeholder="Mfano: Wakulima wa Mbeya"
            />
            <span className="psh-gw-count">
              {draft.name.trim().length}/{GROUP_NAME_MAX}
            </span>
          </Field>

          <Field id="gw-desc" label="Maelezo mafupi" error={fieldErrors.description}>
            <input
              id="gw-desc"
              className="psh-gw-input"
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              maxLength={GROUP_DESCRIPTION_MAX}
              placeholder="Mfano: Ushirikiano wa pembejeo na masoko"
            />
          </Field>

          <OptionRow
            label="Aina ya kikundi"
            value={draft.type}
            onChange={(type) => set({ type })}
            name="type"
            options={GROUP_TYPES.map((t) => ({ id: t, label: GROUP_TYPE_LABELS[t] }))}
          />

          <OptionRow
            label="Faragha"
            value={draft.privacy}
            onChange={(privacy) => set({ privacy })}
            name="privacy"
            options={['public', 'private'].map((p) => ({ id: p, label: GROUP_PRIVACY_LABELS[p] }))}
          />

          <div className="psh-gw-field">
            <span className="psh-gw-field__label">Rangi ya kikundi (bila DP)</span>
            <ul className="psh-chips">
              {GROUP_TONES.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`psh-chipbtn ${draft.tone === t.id ? 'is-on' : ''}`}
                    aria-pressed={draft.tone === t.id}
                    aria-label={`Mandhari ya kikundi: ${t.label}`}
                    onClick={() => set({ tone: t.id })}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      {/* ── 3. Mipangilio (hiari) — utambulisho · sheria · kujiunga ── */}
      {stepDef.id === 'mipangilio' ? (
        <>
          <span className="psh-gw-seh">Utambulisho</span>
          <div className="psh-gw-media psh-gw-media--cover">
            {cover?.url ? (
              <img className="psh-gw-coverimg" src={cover.url} alt="Onyesho la cover ya kikundi" />
            ) : (
              <span className="psh-gw-coverph">Cover haijapakiwa</span>
            )}
            <div className="psh-gw-media__actions">
              <label className="psh-btn psh-gw-upload">
                <input
                  type="file"
                  accept={GROUP_IMAGE_TYPES.join(',')}
                  className="u-sr"
                  onChange={pickImage('cover')}
                  aria-label="Pakia cover ya kikundi"
                />
                <IconPhoto size={15} /> {cover ? 'Badilisha cover' : 'Pakia cover'}
              </label>
              {cover ? (
                <button type="button" className="psh-btn" onClick={() => clearImage('cover')} aria-label="Ondoa cover ya kikundi">
                  <IconClose size={14} /> Ondoa
                </button>
              ) : null}
            </div>
          </div>
          {fieldErrors.cover ? (
            <span className="psh-gw-field__err" role="alert">
              {fieldErrors.cover}
            </span>
          ) : null}

          <Field id="gw-purpose" label="Madhumuni" error={fieldErrors.purpose}>
            <textarea
              id="gw-purpose"
              className="psh-gw-input"
              rows={3}
              value={draft.purpose}
              onChange={(e) => set({ purpose: e.target.value })}
              maxLength={GROUP_TEXT_MAX}
            />
          </Field>

          <Field id="gw-goals" label="Malengo" error={fieldErrors.goals}>
            <textarea
              id="gw-goals"
              className="psh-gw-input"
              rows={3}
              value={draft.goals}
              onChange={(e) => set({ goals: e.target.value })}
              maxLength={GROUP_TEXT_MAX}
            />
          </Field>

          <Field id="gw-lang" label="Lugha kuu">
            <select
              id="gw-lang"
              className="psh-gw-input"
              value={draft.language}
              onChange={(e) => set({ language: e.target.value })}
            >
              {GROUP_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {GROUP_LANGUAGE_LABELS[l]}
                </option>
              ))}
            </select>
          </Field>

          <Field id="gw-loc" label="Mahali ilipoundwa" error={fieldErrors.locationVisibility}>
            <input
              id="gw-loc"
              className="psh-gw-input"
              value={draft.foundingLocation}
              onChange={(e) => set({ foundingLocation: e.target.value })}
              maxLength={120}
              placeholder="Mfano: Dar es Salaam"
            />
          </Field>

          <OptionRow
            label="Uonekano wa mahali"
            value={draft.locationVisibility}
            onChange={(locationVisibility) => set({ locationVisibility })}
            name="locationVisibility"
            options={GROUP_LOCATION_VISIBILITY.map((v) => ({ id: v, label: GROUP_LOCATION_VISIBILITY_LABELS[v] }))}
          />
        
          <span className="psh-gw-seh">Sheria</span>
          <Field id="gw-rules" label="Sheria na taratibu" error={fieldErrors.rules}>
            <textarea
              id="gw-rules"
              className="psh-gw-input"
              rows={4}
              value={draft.rules}
              onChange={(e) => set({ rules: e.target.value })}
              maxLength={TEXT_LIMITS.rules}
            />
          </Field>
          <Field id="gw-proc" label="Taratibu za kila siku" error={fieldErrors.procedures}>
            <textarea
              id="gw-proc"
              className="psh-gw-input"
              rows={3}
              value={draft.procedures}
              onChange={(e) => set({ procedures: e.target.value })}
              maxLength={GROUP_TEXT_MAX}
            />
          </Field>
          <Field id="gw-warn" label="Maonyo" error={fieldErrors.warnings}>
            <textarea
              id="gw-warn"
              className="psh-gw-input"
              rows={2}
              value={draft.warnings}
              onChange={(e) => set({ warnings: e.target.value })}
              maxLength={GROUP_TEXT_MAX}
            />
          </Field>
          <Field id="gw-cons" label="Matokeo ya ukiukaji" error={fieldErrors.consequences}>
            <textarea
              id="gw-cons"
              className="psh-gw-input"
              rows={2}
              value={draft.consequences}
              onChange={(e) => set({ consequences: e.target.value })}
              maxLength={GROUP_TEXT_MAX}
            />
          </Field>
        
          <span className="psh-gw-seh">Kujiunga & ujumbe</span>
          <OptionRow
            label="Njia ya kujiunga"
            value={draft.joinMethod}
            onChange={(joinMethod) => set({ joinMethod })}
            name="joinMethod"
            options={GROUP_JOIN_METHODS.map((m) => ({ id: m, label: GROUP_JOIN_LABELS[m] }))}
          />
          <OptionRow
            label="Nani anaweza kuongeza wanachama"
            value={draft.whoCanAdd}
            onChange={(whoCanAdd) => set({ whoCanAdd })}
            name="whoCanAdd"
            options={GROUP_WHO_CAN_ADD.map((v) => ({ id: v, label: GROUP_WHO_CAN_ADD_LABELS[v] }))}
          />
          <OptionRow
            label="Nani anaweza kujibu"
            value={draft.whoCanReply}
            onChange={(whoCanReply) => set({ whoCanReply })}
            name="whoCanReply"
            options={GROUP_WHO_CAN_REPLY.map((v) => ({ id: v, label: GROUP_WHO_CAN_REPLY_LABELS[v] }))}
          />
          <OptionRow
            label="Nani anaweza kutumia reactions"
            value={draft.whoCanReact}
            onChange={(whoCanReact) => set({ whoCanReact })}
            name="whoCanReact"
            options={GROUP_WHO_CAN_REACT.map((v) => ({ id: v, label: GROUP_WHO_CAN_REACT_LABELS[v] }))}
          />
          {draft.type === 'announcement' ? (
            <OptionRow
              label="Nani anatuma matangazo"
              value={draft.announcementSenders}
              onChange={(announcementSenders) => set({ announcementSenders })}
              name="announcementSenders"
              options={GROUP_ANNOUNCEMENT_SENDERS.map((v) => ({ id: v, label: GROUP_ANNOUNCEMENT_SENDERS_LABELS[v] }))}
            />
          ) : null}
          <OptionRow
            label="Slow mode"
            value={draft.slowModeSeconds}
            onChange={(v) => set({ slowModeSeconds: v })}
            name="slowModeSeconds"
            options={GROUP_SLOW_MODE.map((v) => ({ id: v, label: GROUP_SLOW_MODE_LABELS[v] }))}
          />
        
        </>
      ) : null}

      {/* ── 5. Wanachama ─────────────────────────────────── */}
      {stepDef.id === 'wanachama' ? (
        <>
          <div className="psh-panelstack__actions">
            <Chip tone={atLimit ? 'gold' : 'soft'}>
              Wanachama {picked.length + 1} / {limit}
            </Chip>
          </div>
          {fieldErrors.members ? (
            <span className="psh-gw-field__err" role="alert">
              {fieldErrors.members}
            </span>
          ) : null}

          <label className="psh-chat__search" style={{ cursor: 'text' }}>
            <IconSearchSmall size={17} />
            <input
              className="psh-chat-lookup__input"
              style={{ border: 0, background: 'transparent', minHeight: 0, padding: 0 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tafuta wanachama…"
              aria-label="Tafuta wanachama"
            />
          </label>

          <ul>
            {list.map((c) => {
              const on = picked.includes(c.id)
              const full = !on && atLimit
              return (
                <PersonRow
                  key={c.id}
                  name={c.name}
                  meta={c.saved ? 'Saved Friend' : c.friend ? 'PASIHAI Friend' : 'Akaunti ya PASIHAI'}
                  tone={c.tone}
                  action={on ? '✓ Amechaguliwa' : full ? 'Kikomo kimefika' : 'Ongeza'}
                  onSelect={() => toggle(c.id)}
                  onAction={() => toggle(c.id)}
                  selected={on}
                />
              )
            })}
          </ul>
          {list.length === 0 ? (
            <p className="psh-note">
              <IconInfo size={16} /> Hakuna contact anayelingana na "{q}".
            </p>
          ) : null}
        </>
      ) : null}

      {/* ── 6. Muhtasari ─────────────────────────────────── */}
      {stepDef.id === 'muhtasari' ? (
        <>
          <dl className="psh-gw-sum">
            <div>
              <dt>Jina</dt>
              <dd>{draft.name.trim() || '—'}</dd>
            </div>
            <div>
              <dt>Aina</dt>
              <dd>{GROUP_TYPE_LABELS[draft.type]}</dd>
            </div>
            <div>
              <dt>Faragha</dt>
              <dd>{GROUP_PRIVACY_LABELS[draft.privacy]}</dd>
            </div>
            <div>
              <dt>Wanachama</dt>
              <dd>
                {picked.length + 1} / {limit}
                {picked.length ? (
                  <ul className="psh-gw-members">
                    {picked.map((id) => (
                      <li key={id}>{all.find((c) => c.id === id)?.name || id}</li>
                    ))}
                  </ul>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Kujiunga</dt>
              <dd>{GROUP_JOIN_LABELS[draft.joinMethod]}</dd>
            </div>
            <div>
              <dt>Anaongeza</dt>
              <dd>{GROUP_WHO_CAN_ADD_LABELS[draft.whoCanAdd]}</dd>
            </div>
            <div>
              <dt>Anajibu</dt>
              <dd>{GROUP_WHO_CAN_REPLY_LABELS[draft.whoCanReply]}</dd>
            </div>
            <div>
              <dt>Reactions</dt>
              <dd>{GROUP_WHO_CAN_REACT_LABELS[draft.whoCanReact]}</dd>
            </div>
            {draft.type === 'announcement' ? (
              <div>
                <dt>Matangazo</dt>
                <dd>{GROUP_ANNOUNCEMENT_SENDERS_LABELS[draft.announcementSenders]}</dd>
              </div>
            ) : null}
            <div>
              <dt>Slow mode</dt>
              <dd>{GROUP_SLOW_MODE_LABELS[draft.slowModeSeconds]}</dd>
            </div>
            <div>
              <dt>Lugha</dt>
              <dd>{GROUP_LANGUAGE_LABELS[draft.language] || '—'}</dd>
            </div>
            <div>
              <dt>Mahali</dt>
              <dd>
                {draft.foundingLocation
                  ? `${draft.foundingLocation} · ${GROUP_LOCATION_VISIBILITY_LABELS[draft.locationVisibility]}`
                  : 'Hakuna'}
              </dd>
            </div>
            <div>
              <dt>Picha</dt>
              <dd>
                {dp ? 'DP imechaguliwa' : 'Rangi pekee'}
                {cover ? ' · Cover imechaguliwa' : ''}
              </dd>
            </div>
          </dl>
          <p className="psh-note">
            <IconInfo size={16} /> DP/cover zikishindwa kupakiwa, kikundi kinaundwa na onyo.
          </p>
        </>
      ) : null}

      {/* ── Navigation ──────────────────────────────────── */}
      <div className="psh-gw-nav">
        <div className="psh-gw-nav__left">
          {step > 0 ? (
            <button type="button" className="psh-btn" onClick={goBack} disabled={busy}>
              Rudi
            </button>
          ) : null}
        </div>
        <span className="psh-gw-nav__count">
          Hatua {step + 1} / {STEPS.length}
        </span>
        <div className="psh-gw-nav__right">
          {stepDef.optional ? (
            <button type="button" className="psh-btn" onClick={goNext} disabled={busy}>
              Ruka
            </button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button type="button" className="psh-btn psh-btn--primary" onClick={goNext} disabled={busy}>
              Endelea
            </button>
          ) : (
            <button type="button" className="psh-btn psh-btn--primary" onClick={submit} disabled={busy}>
              {busy ? 'Inaunda…' : 'Unda kikundi'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
