// ══════════════════════════════════════════════════════════════
// PASIHAI — SPACE PANELS (Sheet ileile ya app)
//
//   CreateSpacePanel — uundaji wa hatua 3 (§40):
//     hatua 1: Aina (Hub · Jumuiya · Channel)
//     hatua 2: Maelezo (jina · kusudi · kategoria · eneo · ufikivu)
//     hatua 3: Muonekano (rangi za PASIHAI pekee) → Unda
//
//   Kitu kimoja kinachoundwa kutoka Home AU Spaces — panel hii ni
//   ILEILE (hakuna mchakato wa pili wa uundaji).
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'

import useAsyncData from '../../hooks/useAsyncData.js'
import { spacesService } from '../../services/spacesService.js'
import { Button } from '../ui.jsx'
import { IconCheck, IconGlobe, IconHub, IconInfo, IconMegaphone } from '../icons.jsx'

const TYPE_ICON = { hub: IconHub, community: IconGlobe, channel: IconMegaphone }

export function CreateSpacePanel({ type, onToast, onClose, onCreated }) {
  const [step, setStep] = useState(type ? 2 : 1)
  const [draft, setDraft] = useState({
    type: type || 'hub',
    name: '',
    purpose: '',
    category: '',
    place: '',
    visibility: 'public',
    cover: 'green',
  })
  const [busy, setBusy] = useState(false)
  const model = useAsyncData(() => spacesService.getCreateModel(), [])

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const nameOk = draft.name.trim().length >= 3

  const create = async () => {
    if (!nameOk || busy) return
    setBusy(true)
    try {
      const space = await spacesService.createSpace(draft)
      onToast?.(space.note)
      onCreated?.(space)
      onClose?.()
    } finally {
      setBusy(false)
    }
  }

  if (!model) return null

  const steps = model.steps
  const current = steps[step - 1]

  return (
    <div className="psh-csp" data-step={step}>
      {/* Hatua: 1 Aina · 2 Maelezo · 3 Muonekano */}
      <ol className="psh-csp__steps" aria-label="Hatua za uundaji">
        {steps.map((s, i) => {
          const n = i + 1
          const state = n === step ? 'is-active' : n < step ? 'is-done' : ''
          return (
            <li key={s.id} className={`psh-csp__step ${state}`}>
              <span className="psh-csp__stepNo">{n < step ? <IconCheck size={13} strokeWidth={2.2} /> : n}</span>
              <span className="psh-csp__stepText">
                <span className="psh-csp__stepLabel">{s.label}</span>
                <span className="psh-csp__stepHint">{s.hint}</span>
              </span>
            </li>
          )
        })}
      </ol>

      {/* ── Hatua 1: aina ─────────────────────────────────── */}
      {step === 1 ? (
        <div className="psh-csp__pane">
          <ul className="psh-csp__types">
            {model.types.map((t) => {
              const Icon = TYPE_ICON[t.id] || IconHub
              const on = draft.type === t.id
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`psh-csp__type ${on ? 'is-active' : ''}`}
                    aria-pressed={on}
                    onClick={() => set({ type: t.id })}
                  >
                    <span className="psh-csp__typeIc">
                      <Icon size={20} />
                    </span>
                    <span className="psh-csp__typeText">
                      <span className="psh-csp__typeName">{t.label}</span>
                      <span className="psh-csp__typeHint">{t.hint}</span>
                    </span>
                    {on ? <IconCheck size={16} strokeWidth={2.2} /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="psh-csp__note">
            <IconInfo size={15} />
            Hakuna “Private Space” kama aina ya kitu: ufikivu ni HALI (Wazi · Iliyoorodheshwa · Fichwa) —
            unauchagua hatua inayofuata.
          </p>
        </div>
      ) : null}

      {/* ── Hatua 2: maelezo ──────────────────────────────── */}
      {step === 2 ? (
        <div className="psh-csp__pane">
          <label className="psh-csp__field">
            <span className="psh-csp__label">Jina</span>
            <input
              className="psh-csp__input"
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={draft.type === 'channel' ? 'k.m. Sauti Yetu' : 'k.m. Kariakoo Wajasiriamali'}
              autoComplete="off"
            />
          </label>

          <label className="psh-csp__field">
            <span className="psh-csp__label">Kusudi</span>
            <textarea
              className="psh-csp__input psh-csp__input--area"
              rows={3}
              value={draft.purpose}
              onChange={(e) => set({ purpose: e.target.value })}
              placeholder="Nafasi hii ni ya nini? Nani anakaribishwa?"
            />
          </label>

          <div className="psh-csp__field">
            <span className="psh-csp__label">Kategoria</span>
            <div className="psh-csp__chips">
              {model.categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`psh-csp__chip ${draft.category === c ? 'is-active' : ''}`}
                  aria-pressed={draft.category === c}
                  onClick={() => set({ category: c })}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <label className="psh-csp__field">
            <span className="psh-csp__label">Eneo (si lazima)</span>
            <input
              className="psh-csp__input"
              value={draft.place}
              onChange={(e) => set({ place: e.target.value })}
              placeholder="k.m. Dar es Salaam"
              autoComplete="off"
            />
            <span className="psh-csp__hint">
              Eneo linatumika kwa umuhimu (relevance) pekee — haliingii kwenye ruhusa wala ufikivu.
            </span>
          </label>

          <fieldset className="psh-csp__field">
            <legend className="psh-csp__label">Ufikivu</legend>
            <ul className="psh-csp__vis">
              {model.visibility.map((v) => {
                const on = draft.visibility === v.id
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      className={`psh-csp__visRow ${on ? 'is-active' : ''}`}
                      aria-pressed={on}
                      onClick={() => set({ visibility: v.id })}
                    >
                      <span className="psh-csp__radio" aria-hidden="true" />
                      <span className="psh-csp__visText">
                        <span className="psh-csp__visName">{v.label}</span>
                        <span className="psh-csp__visHint">{v.hint}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <span className="psh-csp__hint">
              Public ≠ content public: kila chapisho huamua ugavi wake (Space · Home · Gundua · Profile ·
              Search).
            </span>
          </fieldset>
        </div>
      ) : null}

      {/* ── Hatua 3: muonekano ────────────────────────────── */}
      {step === 3 ? (
        <div className="psh-csp__pane">
          <div className="psh-csp__field">
            <span className="psh-csp__label">Rangi ya msingi</span>
            <div className="psh-csp__chips">
              {model.covers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`psh-csp__chip psh-csp__chip--${c.id} ${draft.cover === c.id ? 'is-active' : ''}`}
                  aria-pressed={draft.cover === c.id}
                  onClick={() => set({ cover: c.id })}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <span className="psh-csp__hint">
              Rangi hizi ni za PASIHAI pekee. Hakuna fonts za nje, themes au wallpaper.
            </span>
          </div>

          <div className="psh-csp__preview" aria-label="Mapitio ya kadi">
            <span className="psh-csp__previewBand" data-tone={draft.cover} aria-hidden="true" />
            <div className="psh-csp__previewBody">
              <h4 className="psh-csp__previewName">{draft.name || 'Jina la nafasi yako'}</h4>
              <p className="psh-csp__previewText">
                {draft.purpose || 'Kusudi la nafasi yako litaonekana hapa.'}
              </p>
              <p className="psh-csp__previewMeta">
                {draft.category || 'Jumla'} · {model.visibility.find((v) => v.id === draft.visibility)?.label}
              </p>
            </div>
          </div>

          <p className="psh-csp__note">
            <IconInfo size={15} />
            {model.note}
          </p>
        </div>
      ) : null}

      <div className="psh-csp__foot">
        <Button variant="ghost" size="sm" onClick={() => (step === 1 ? onClose?.() : setStep(step - 1))}>
          {step === 1 ? 'Ghairi' : 'Nyuma'}
        </Button>
        {step < 3 ? (
          <Button size="sm" onClick={() => setStep(step + 1)} disabled={step === 2 && !nameOk}>
            Endelea
          </Button>
        ) : (
          <Button size="sm" onClick={create} disabled={!nameOk || busy} loading={busy}>
            Unda {current?.label?.toLowerCase()}
          </Button>
        )}
      </div>
    </div>
  )
}
