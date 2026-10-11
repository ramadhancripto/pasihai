// ══════════════════════════════════════════════════════════════
// Creative editor — vidhibiti vilivyoshirikiwa (slider, nambari, rangi, font, icon, kitufe)
//   Vyote ni vidhibiti halisi. Hakuna athari isiyofanya kazi hapa.
// ══════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { FONTS, normalizeHex } from '../../creative/creativeModel.js'
import { PALETTE } from '../../utils/postContent.js'
import { hexToRgb, hslToHex, rgbToHex, rgbToHsl } from '../../creative/colorConvert.js'

// ── Icons (SVG za ndani; hakuna maktaba ya nje) ────────────────
const ICON_PATHS = {
  // Lebo za kawaida za PASIHAI Creator Studio (§J). Mistari ya nje, 24×24, stroke moja.
  pointer: 'M5 3l14 8-6 2 4 7-3 1-4-7-5 3z',
  paintBucket: 'M4 13l7-7 7 7-7 7zM11 6l-2-3M18 15c0 1.6-1 3-2 3s-2-1.4-2-3 2-3 2-3 2 1.4 2 3z',
  sliders: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M13 4v4M7 10v4M15 16v4',
  layoutTemplate: 'M3 3h18v18H3zM3 9h18M9 21V9',
  layers3: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  files: 'M8 3h8l4 4v11a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2zM4 7v13a2 2 0 002 2h10',
  audioLines: 'M4 10v4M8 7v10M12 4v16M16 8v8M20 10v4',
  sparkles: 'M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8zM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z',
  clapperboard: 'M3 9h18v11H3zM3 9l2-5h4l-2 5M9 9l2-5h4l-2 5M15 9l2-5h4l-2 5',
  folderKanban: 'M3 6a2 2 0 012-2h5l2 2h7a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 11v5M14 11v3',
  images: 'M4 7v11a2 2 0 002 2h12M8 3h12v12H8zM8 13l3-3 3 3 2-2 4 4',
  megaphone: 'M3 10v4h4l8 5V5L7 10H3zM18 9a4 4 0 010 6',
  briefcase: 'M3 7h18v12H3zM9 7V4h6v3M3 12h18',
  layoutDashboard: 'M3 3h8v9H3zM13 3h8v5h-8zM13 12h8v9h-8zM3 16h8v5H3z',
  plusSquare: 'M3 3h18v18H3zM12 8v8M8 12h8',
  chartCombined: 'M3 20h18M6 16v-6M11 16V6M16 16v-4M3 13l5-3 5 2 6-5',
  settings2: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6',
  type: 'M4 6V4h16v2M9 20h6M12 4v16',
  palette: 'M12 3a9 9 0 100 18c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 005-5c0-4.4-4-8-9-8zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01',
  back: 'M15 18l-6-6 6-6',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3',
  redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M9 9.5a1.5 1.5 0 110-.01',
  video: 'M4 6h11v12H4zM15 10l5-3v10l-5-3',
  background: 'M3 3h18v18H3zM3 15l6-6 6 6 6-6',
  shapes: 'M12 3l8 14H4zM16 14a4 4 0 110 .01',
  sticker: 'M12 3a9 9 0 100 18 9 9 0 000-18zM8.5 10h.01M15.5 10h.01M8.5 15c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8',
  draw: 'M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3',
  template: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  media: 'M4 5h16v14H4zM4 15l4-4 3 3 2-2 7 7',
  audio: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 11-2-2.4M19 16a2.5 2.5 0 11-2-2.4',
  effects: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  eyeOff: 'M3 3l18 18M10.6 6.1A10 10 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-3.1 3.7M6.6 6.6A17 17 0 002 12s3.5 6 10 6a10 10 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2',
  lock: 'M6 11h12v9H6zM8 11V7a4 4 0 018 0v4',
  unlock: 'M6 11h12v9H6zM8 11V7a4 4 0 017.7-1.5',
  copy: 'M9 9h11v11H9zM4 15V4h11',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  save: 'M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7',
  preview: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  send: 'M3 11l18-8-8 18-2-8-8-2z',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  close: 'M6 6l12 12M18 6L6 18',
  alignL: 'M4 4v16M8 8h12M8 14h8',
  alignR: 'M20 4v16M4 8h12M8 14h8',
  alignT: 'M4 4h16M8 8v12M14 8v8',
  alignB: 'M4 20h16M8 4v12M14 4v8',
  alignCH: 'M12 4v16M6 8h12M8 14h8',
  alignCV: 'M4 12h16M8 6v12M14 8v8',
  rotate: 'M20 12a8 8 0 11-2.3-5.7M20 4v5h-5',
  check: 'M5 12l5 5 9-10',
  crop: 'M6 2v16h16M2 6h16v16',
  drop: 'M12 3s6 7 6 11a6 6 0 01-12 0c0-4 6-11 6-11z',
  swap: 'M4 7h13l-3-3M20 17H7l3 3',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2-4.5-4.4 6.2-.9z',
  keyboard: 'M3 6h18v12H3zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10',
  sidebar: 'M3 4h18v16H3zM9 4v16',
  search: 'M11 4a7 7 0 110 14 7 7 0 010-14zM16 16l5 5',
  chevron: 'M9 6l6 6-6 6',
  flip: 'M12 3v18M7 7l-4 5 4 5M17 7l4 5-4 5',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4',
}

export function Icon({ name, size = 18 }) {
  const d = ICON_PATHS[name] ?? ICON_PATHS.more
  return (
    <svg className="cve-ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  )
}

// ── Rangi: hifadhi ya rangi za hivi karibuni na zilizohifadhiwa (kifaa hiki tu) ──
const COLOR_KEY = 'pasihai.creative.colors.v1'
const RECENT_MAX = 8
const SAVED_MAX = 24

export function loadColorStore(storage = safeStorage()) {
  try {
    const raw = storage?.getItem(COLOR_KEY)
    const v = raw ? JSON.parse(raw) : null
    return {
      recent: cleanHexList(v?.recent, RECENT_MAX),
      saved: cleanHexList(v?.saved, SAVED_MAX),
    }
  } catch {
    return { recent: [], saved: [] }
  }
}

function saveColorStore(store, storage = safeStorage()) {
  try { storage?.setItem(COLOR_KEY, JSON.stringify(store)) } catch { /* kifaa kimejaa: rangi hazihifadhiwi */ }
}

function cleanHexList(list, max) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const h of list) {
    const n = normalizeHex(h, null)
    if (n && !out.includes(n)) out.push(n)
    if (out.length >= max) break
  }
  return out
}

export function rememberColor(hex, { saved = false } = {}) {
  const store = loadColorStore()
  const n = normalizeHex(hex, null)
  if (!n) return store
  const next = {
    recent: [n, ...store.recent.filter((h) => h !== n)].slice(0, RECENT_MAX),
    saved: saved ? [n, ...store.saved.filter((h) => h !== n)].slice(0, SAVED_MAX) : store.saved,
  }
  saveColorStore(next)
  return next
}

export function forgetSavedColor(hex) {
  const store = loadColorStore()
  const next = { ...store, saved: store.saved.filter((h) => h !== hex) }
  saveColorStore(next)
  return next
}

function safeStorage() {
  try { return typeof window !== 'undefined' ? window.localStorage : null } catch { return null }
}

export const PALETTE_HEX = [
  ...Object.values(PALETTE).map((p) => p.hex),
  '#ffffff',
  '#000000',
]

// ── Button ─────────────────────────────────────────────────────
export function Btn({ variant = 'ghost', icon, children, className = '', ...rest }) {
  return (
    <button type="button" className={`cve-btn cve-btn--${variant} ${className}`.trim()} {...rest}>
      {icon ? <Icon name={icon} /> : null}
      {children ? <span>{children}</span> : null}
    </button>
  )
}

// ── Section wrapper ────────────────────────────────────────────
export function Group({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="cve-group">
      <button type="button" className="cve-group__head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <Icon name={open ? 'up' : 'down'} size={16} />
      </button>
      {open ? <div className="cve-group__body">{children}</div> : null}
    </section>
  )
}

// ── Slider yenye thamani ya nambari ─────────────────────────────
export function Slider({ label, value, min, max, step = 1, decimals = 0, unit = '', onChange, disabled = false }) {
  const v = Number.isFinite(value) ? value : min
  const fix = (n) => Number(Number(n).toFixed(decimals))
  return (
    <div className="cve-field cve-slider">
      <label className="cve-field__label">
        <span>{label}</span>
        <span className="cve-slider__num">
          <input
            type="number"
            className="cve-num"
            value={fix(v)}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            aria-label={`${label} (nambari)`}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n) && e.target.value !== '') onChange(clampTo(fix(n), min, max))
            }}
          />
          {unit ? <span className="cve-unit">{unit}</span> : null}
        </span>
      </label>
      <input
        type="range"
        className="cve-range"
        min={min}
        max={max}
        step={step}
        value={fix(v)}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(fix(e.target.value))}
      />
    </div>
  )
}

function clampTo(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

// ── Toggle (kitufe cha kuwasha/kuzima) ─────────────────────────
export function Toggle({ label, pressed, onChange, icon, disabled = false }) {
  return (
    <button
      type="button"
      className={`cve-toggle${pressed ? ' is-on' : ''}`}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onChange(!pressed)}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      <span>{label}</span>
    </button>
  )
}

// ── Segmented (chaguo moja kati ya kadhaa) ─────────────────────
export function Segmented({ label, value, options, onChange }) {
  return (
    <div className="cve-field">
      {label ? <span className="cve-field__label"><span>{label}</span></span> : null}
      <div className="cve-seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`cve-seg__btn${value === o.value ? ' is-on' : ''}`}
            aria-pressed={value === o.value}
            aria-label={o.aria ?? o.label}
            onClick={() => onChange(o.value)}
          >
            {o.icon ? <Icon name={o.icon} size={16} /> : o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Color picker: native + HEX + swatches + recent + saved ──────
export function ColorField({ label, value, onChange, allowNone = false, noneLabel = 'Hakuna' }) {
  const [text, setText] = useState(value ?? '')
  const [err, setErr] = useState('')
  const [store, setStore] = useState(() => loadColorStore())
  useEffect(() => { setText(value ?? ''); setErr('') }, [value])

  const pick = (hex, remember = true) => {
    const n = normalizeHex(hex, null)
    if (!n) return
    onChange(n)
    if (remember) setStore(rememberColor(n))
  }

  const commitText = () => {
    const raw = text.trim()
    const withHash = raw.startsWith('#') ? raw : `#${raw}`
    if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
      pick(withHash.toLowerCase())
      setErr('')
    } else {
      setErr('Andika HEX kama #1f5fc2')
      setText(value ?? '')
    }
  }

  const saveCurrent = () => {
    if (!value) return
    setStore(rememberColor(value, { saved: true }))
  }

  const removeSaved = (hex) => setStore(forgetSavedColor(hex))

  return (
    <div className="cve-field cve-color">
      <span className="cve-field__label"><span>{label}</span>{allowNone && !value ? <em className="cve-muted">{noneLabel}</em> : null}</span>
      <div className="cve-color__row">
        <input
          type="color"
          className="cve-color__native"
          value={value ?? '#ffffff'}
          aria-label={`${label}: chagua rangi`}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => { if (normalizeHex(e.target.value, null)) setStore(rememberColor(e.target.value)) }}
        />
        <input
          type="text"
          className={`cve-input cve-input--hex${err ? ' is-error' : ''}`}
          value={text}
          maxLength={7}
          aria-label={`${label}: msimbo wa HEX`}
          aria-invalid={Boolean(err)}
          placeholder="#000000"
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitText() } }}
        />
        {allowNone ? (
          <button type="button" className="cve-btn cve-btn--ghost cve-btn--sm" onClick={() => onChange(null)} disabled={!value}>
            {noneLabel}
          </button>
        ) : null}
      </div>
      {err ? <p className="cve-error" role="alert">{err}</p> : null}

      <div className="cve-swatches" role="group" aria-label={`Rangi za ${label}`}>
        {PALETTE_HEX.map((hex) => (
          <button
            key={hex}
            type="button"
            className={`cve-swatch${value === hex ? ' is-on' : ''}`}
            style={{ background: hex }}
            aria-label={`Rangi ${hex}`}
            aria-pressed={value === hex}
            onClick={() => pick(hex)}
          />
        ))}
      </div>

      {store.recent.length ? (
        <>
          <span className="cve-field__sub">Za hivi karibuni</span>
          <div className="cve-swatches" role="group" aria-label="Rangi za hivi karibuni">
            {store.recent.map((hex) => (
              <button key={`r-${hex}`} type="button" className="cve-swatch" style={{ background: hex }} aria-label={`Rangi ya hivi karibuni ${hex}`} onClick={() => pick(hex)} />
            ))}
          </div>
        </>
      ) : null}

      <div className="cve-color__saved">
        <span className="cve-field__sub">Zilizohifadhiwa</span>
        <button type="button" className="cve-btn cve-btn--ghost cve-btn--sm" onClick={saveCurrent} disabled={!value}>
          <Icon name="save" size={14} /> <span>Hifadhi rangi</span>
        </button>
      </div>
      {store.saved.length ? (
        <div className="cve-swatches" role="group" aria-label="Rangi zilizohifadhiwa">
          {store.saved.map((hex) => (
            <span key={`s-${hex}`} className="cve-swatch-wrap">
              <button type="button" className="cve-swatch" style={{ background: hex }} aria-label={`Rangi iliyohifadhiwa ${hex}`} onClick={() => pick(hex)} />
              <button type="button" className="cve-swatch-x" aria-label={`Ondoa ${hex}`} onClick={() => removeSaved(hex)}>×</button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ── RGB na HSL: ingizo la rangi kwa vidhibiti; matokeo yanahifadhiwa kama HEX ──
export function ColorModelFields({ label, value, onChange, disabled = false }) {
  const rgb = hexToRgb(value)
  if (!rgb) return null
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const setRgb = (patch) => {
    const next = { ...rgb, ...patch }
    onChange(rgbToHex(next.r, next.g, next.b))
  }
  const setHsl = (patch) => {
    const next = { ...hsl, ...patch }
    onChange(hslToHex(next.h, next.s, next.l))
  }
  return (
    <div className="cve-colormodel">
      <span className="cve-field__sub">RGB</span>
      <Slider label={`${label} R`} value={rgb.r} min={0} max={255} disabled={disabled} onChange={(v) => setRgb({ r: v })} />
      <Slider label={`${label} G`} value={rgb.g} min={0} max={255} disabled={disabled} onChange={(v) => setRgb({ g: v })} />
      <Slider label={`${label} B`} value={rgb.b} min={0} max={255} disabled={disabled} onChange={(v) => setRgb({ b: v })} />
      <span className="cve-field__sub">HSL</span>
      <Slider label={`${label} H`} value={hsl.h} min={0} max={360} unit="°" disabled={disabled} onChange={(v) => setHsl({ h: v })} />
      <Slider label={`${label} S`} value={hsl.s} min={0} max={100} unit="%" disabled={disabled} onChange={(v) => setHsl({ s: v })} />
      <Slider label={`${label} L`} value={hsl.l} min={0} max={100} unit="%" disabled={disabled} onChange={(v) => setHsl({ l: v })} />
    </div>
  )
}

// ── Font selector yenye hakiki ya kila font ─────────────────────
export function FontSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const wrapRef = useRef(null)
  const current = FONTS.find((f) => f.key === value) ?? FONTS[0]
  const list = FONTS.filter((f) => f.label.toLowerCase().includes(q.trim().toLowerCase()))

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div className="cve-field cve-font" ref={wrapRef}>
      <span className="cve-field__label"><span>Font</span></span>
      <button
        type="button"
        className="cve-input cve-font__btn"
        style={{ fontFamily: current.stack }}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {current.label}
        {!current.bundled ? <small className="cve-muted"> · kifaa</small> : null}
      </button>
      {open ? (
        <div className="cve-font__pop">
          <input
            type="search"
            className="cve-input"
            placeholder="Tafuta font"
            aria-label="Tafuta font"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <ul role="listbox" aria-label="Fonti" className="cve-font__list">
            {list.map((f) => (
              <li key={f.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={f.key === value}
                  className={`cve-font__opt${f.key === value ? ' is-on' : ''}`}
                  style={{ fontFamily: f.stack }}
                  onClick={() => { onChange(f.key); setOpen(false); setQ('') }}
                >
                  <span>{f.label}</span>
                  <span className="cve-font__sample" style={{ fontFamily: f.stack }}>Habari 123</span>
                  {!f.bundled ? <small className="cve-muted">kifaa</small> : null}
                </button>
              </li>
            ))}
            {!list.length ? <li className="cve-muted">Hakuna font inayolingana.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

// ── Namba (X, Y, W, H) ─────────────────────────────────────────
export function NumberField({ label, value, min = -99999, max = 99999, onChange, disabled = false }) {
  const [text, setText] = useState(String(Math.round(value)))
  useEffect(() => setText(String(Math.round(value))), [value])
  return (
    <label className="cve-field cve-num-field">
      <span className="cve-field__label"><span>{label}</span></span>
      <input
        type="number"
        className="cve-input"
        value={text}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const n = Number(text)
          if (text !== '' && Number.isFinite(n)) onChange(clampTo(Math.round(n), min, max))
          else setText(String(Math.round(value)))
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
    </label>
  )
}

export function Textarea({ label, value, onChange, maxLength, rows = 3, onBlur }) {
  return (
    <label className="cve-field">
      <span className="cve-field__label"><span>{label}</span>{maxLength ? <em className="cve-muted">{(value ?? '').length}/{maxLength}</em> : null}</span>
      <textarea
        className="cve-input cve-textarea"
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </label>
  )
}
