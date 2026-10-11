// ══════════════════════════════════════════════════════════════
// PropertiesPanel — sifa zinabadilika kulingana na kilichochaguliwa.
//   Maandishi: maandishi, font, ukubwa, mtindo, rangi, mandhari ya maandishi, nafasi, mpaka, kivuli.
//   Picha: kata, mpaka, pembe, athari (brightness, contrast, saturation, blur), badilisha picha.
//   Umbo: ndani, mstari, upana wa mstari, pembe.
//   Hakuna kilichochaguliwa: mandhari ya turubai (rangi, gradient, picha).
//   Kila kidhibiti kinaandika kupitia onPatch/onBackground/onAction — hakuna thamani ya kubuni.
// ══════════════════════════════════════════════════════════════
import {
  DEFAULT_INK, DEFAULT_WHITE, MIN_LAYER_SIZE, SHAPE_LABEL, findLayer, aspectCrop,
  DEFAULT_SHADOW, SHAPE_PRESETS, applyShapePreset,
} from '../../creative/creativeModel.js'
import { useRef, useState } from 'react'
import { plannedGroupSummary } from '../../creative/plannedGroups.js'
import { EXPORT_FORMATS, exportSize } from '../../creative/creativeRender.js'
import { FILTER_PRESETS, clearFilterPatch, hasFilter, presetPatch } from '../../creative/imageFilters.js'
import { addStyle, createStyle, deleteStyle, loadStyles, removePatch, saveStyles, stylePatch, styleApplies } from '../../creative/colorStyles.js'
import { Btn, ColorField, ColorModelFields, FontSelect, Group, NumberField, Segmented, Slider, Textarea, Toggle } from './controls.jsx'

const TEXT_PRESETS = [
  { id: 'heading', label: 'Kichwa', size: 0.08, bold: true },
  { id: 'subtitle', label: 'Kichwa kidogo', size: 0.05, bold: true },
  { id: 'body', label: 'Mwili', size: 0.03, bold: false },
]

const TYPE_LABEL = { text: 'Maandishi', image: 'Picha', shape: 'Umbo' }

// Kundi lililofunguliwa kwenye rail: vidhibiti vya aina hiyo tu. Kundi lisilo na paneli hapa linabaki kwenye Sifa kamili.
const FOCUS_TYPE = { B: 'text', C: 'image', D: 'background', E: 'shape' }

export default function PropertiesPanel({ doc, selectedIds = [], onPatch, onAction, onBackground, onRequestImage, focus = null, exportApi = null }) {
  if (focus === 'G') return <ColorGroupSection doc={doc} selectedIds={selectedIds} onPatch={onPatch} />
  if (focus === 'H') return <EffectsGroupSection doc={doc} selectedIds={selectedIds} onPatch={onPatch} />
  if (focus === 'P' && exportApi) return <ExportGroupSection doc={doc} exportApi={exportApi} />
  if (focus && plannedGroupSummary(focus)) return <PlannedGroupSection focus={focus} />
  if (focus && FOCUS_TYPE[focus]) {
    return <FocusPanel focus={focus} doc={doc} selectedIds={selectedIds} onPatch={onPatch} onBackground={onBackground} onRequestImage={onRequestImage} />
  }
  if (selectedIds.length > 1) {
    return <MultiSection doc={doc} selectedIds={selectedIds} onAction={onAction} />
  }
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const layer = selectedId ? findLayer(doc, selectedId) : null

  if (!layer) {
    return <BackgroundSection doc={doc} onBackground={onBackground} onRequestImage={onRequestImage} />
  }

  const set = (patch, key = null) => onPatch(patch, key ? `${key}:${layer.id}` : null)

  return (
    <div className="cve-props__inner" data-testid="props-panel">
      <header className="cve-props__head">
        <span className="cve-kicker">{TYPE_LABEL[layer.type]}{layer.type === 'shape' ? ` · ${SHAPE_LABEL[layer.shape] ?? ''}` : ''}</span>
        <h3 className="cve-props__title">{layer.name}</h3>
        {layer.locked ? <span className="cve-chip">Imefungwa</span> : null}
      </header>

      <Group title="Nafasi na ukubwa">
        <div className="cve-grid2">
          <NumberField label="X" value={layer.x} disabled={layer.locked} onChange={(v) => set({ x: v }, 'px')} />
          <NumberField label="Y" value={layer.y} disabled={layer.locked} onChange={(v) => set({ y: v }, 'py')} />
          <NumberField label="Upana" value={layer.w} min={MIN_LAYER_SIZE} disabled={layer.locked} onChange={(v) => set({ w: v }, 'pw')} />
          <NumberField label="Urefu" value={layer.h} min={MIN_LAYER_SIZE} disabled={layer.locked} onChange={(v) => set({ h: v }, 'ph')} />
        </div>
        <Slider label="Zungusha" value={layer.rotation} min={0} max={359} unit="°" disabled={layer.locked} onChange={(v) => set({ rotation: v }, 'rot')} />
        <Slider label="Uwazi" value={Math.round(layer.opacity * 100)} min={0} max={100} unit="%" disabled={layer.locked} onChange={(v) => set({ opacity: v / 100 }, 'op')} />
        <div className="cve-align" role="group" aria-label="Panga kwa turubai">
          <span className="cve-field__sub">Panga kwenye turubai</span>
          <div className="cve-align__row">
            <Btn icon="alignL" aria-label="Panga kushoto" title="Panga kushoto" disabled={layer.locked} onClick={() => onAction('align', 'left')} />
            <Btn icon="alignCH" aria-label="Katikati (mlalo)" title="Katikati (mlalo)" disabled={layer.locked} onClick={() => onAction('align', 'centerX')} />
            <Btn icon="alignR" aria-label="Panga kulia" title="Panga kulia" disabled={layer.locked} onClick={() => onAction('align', 'right')} />
            <Btn icon="alignT" aria-label="Panga juu" title="Panga juu" disabled={layer.locked} onClick={() => onAction('align', 'top')} />
            <Btn icon="alignCV" aria-label="Katikati (wima)" title="Katikati (wima)" disabled={layer.locked} onClick={() => onAction('align', 'centerY')} />
            <Btn icon="alignB" aria-label="Panga chini" title="Panga chini" disabled={layer.locked} onClick={() => onAction('align', 'bottom')} />
          </div>
        </div>
      </Group>

      {layer.type === 'text' ? <TextSection layer={layer} doc={doc} set={set} disabled={layer.locked} /> : null}
      {layer.type === 'image' ? <ImageSection layer={layer} set={set} onRequestImage={onRequestImage} disabled={layer.locked} /> : null}
      {layer.type === 'shape' ? <ShapeSection layer={layer} set={set} disabled={layer.locked} /> : null}

      <Group title="Vitendo">
        <div className="cve-actions">
          <Btn icon="copy" onClick={() => onAction('duplicate')}>Nakili</Btn>
          <Btn icon="trash" variant="danger" onClick={() => onAction('delete')}>Futa</Btn>
          <Btn icon={layer.locked ? 'unlock' : 'lock'} onClick={() => onAction('toggle', 'locked')}>{layer.locked ? 'Fungua' : 'Funga'}</Btn>
          <Btn icon={layer.hidden ? 'eyeOff' : 'eye'} onClick={() => onAction('toggle', 'hidden')}>{layer.hidden ? 'Onyesha' : 'Ficha'}</Btn>
          <Btn icon="up" onClick={() => onAction('order', 'front')} disabled={layer.locked}>Mbele kabisa</Btn>
          <Btn icon="down" onClick={() => onAction('order', 'back')} disabled={layer.locked}>Nyuma kabisa</Btn>
          <Btn icon="flip" onClick={() => onAction('flip', 'flipX')} disabled={layer.locked}>Geuza mlalo</Btn>
          <Btn icon="flip" onClick={() => onAction('flip', 'flipY')} disabled={layer.locked}>Geuza wima</Btn>
        </div>
      </Group>
    </div>
  )
}

// ── Vipengele vingi: vitendo vya kikundi tu (sifa za kila kipengele zinahitaji kipengele kimoja) ──
function MultiSection({ doc, selectedIds, onAction }) {
  const picked = selectedIds.map((id) => findLayer(doc, id)).filter(Boolean)
  const anyUnlocked = picked.some((l) => !l.locked)
  const anyVisible = picked.some((l) => !l.hidden)
  return (
    <div className="cve-props__inner" data-testid="props-panel" data-multi="true">
      <header className="cve-props__head">
        <span className="cve-kicker">Uteuzi</span>
        <h3 className="cve-props__title">Vipengele {picked.length} vimechaguliwa</h3>
        <p className="cve-hint">Vitendo hapa vinatumika kwa vyote. Chagua kipengele kimoja ili uone sifa zake.</p>
      </header>

      <Group title="Panga kwa kikundi">
        <div className="cve-align" role="group" aria-label="Panga vipengele kwa mpaka wa kikundi">
          <Btn icon="alignL" aria-label="Panga kushoto" title="Panga kushoto" onClick={() => onAction('align', 'left')} />
          <Btn icon="alignCH" aria-label="Katikati (mlalo)" title="Katikati (mlalo)" onClick={() => onAction('align', 'centerX')} />
          <Btn icon="alignR" aria-label="Panga kulia" title="Panga kulia" onClick={() => onAction('align', 'right')} />
          <Btn icon="alignT" aria-label="Panga juu" title="Panga juu" onClick={() => onAction('align', 'top')} />
          <Btn icon="alignCV" aria-label="Katikati (wima)" title="Katikati (wima)" onClick={() => onAction('align', 'centerY')} />
          <Btn icon="alignB" aria-label="Panga chini" title="Panga chini" onClick={() => onAction('align', 'bottom')} />
        </div>
        <div className="cve-actions">
          <Btn icon="alignCH" disabled={picked.length < 3} title={picked.length < 3 ? 'Chagua vitatu au zaidi' : 'Gawanya mlalo'} onClick={() => onAction('distribute', 'x')}>Gawanya mlalo</Btn>
          <Btn icon="alignCV" disabled={picked.length < 3} title={picked.length < 3 ? 'Chagua vitatu au zaidi' : 'Gawanya wima'} onClick={() => onAction('distribute', 'y')}>Gawanya wima</Btn>
        </div>
      </Group>

      <Group title="Vitendo">
        <div className="cve-actions">
          <Btn icon="copy" onClick={() => onAction('duplicate')}>Nakili</Btn>
          <Btn icon="trash" variant="danger" onClick={() => onAction('delete')}>Futa</Btn>
          <Btn icon={anyUnlocked ? 'lock' : 'unlock'} onClick={() => onAction('lock', anyUnlocked)}>{anyUnlocked ? 'Funga zote' : 'Fungua zote'}</Btn>
          <Btn icon={anyVisible ? 'eyeOff' : 'eye'} onClick={() => onAction('hide', anyVisible)}>{anyVisible ? 'Ficha zote' : 'Onyesha zote'}</Btn>
          <Btn icon="flip" onClick={() => onAction('flip', 'flipX')}>Geuza mlalo</Btn>
          <Btn icon="flip" onClick={() => onAction('flip', 'flipY')}>Geuza wima</Btn>
        </div>
      </Group>
    </div>
  )
}

// ── Maandishi ──────────────────────────────────────────────────
const FOCUS_HINT = {
  B: 'Chagua maandishi kwenye turubai ili uyapangilie, au ongeza maandishi mapya kutoka zana za kushoto.',
  C: 'Chagua picha kwenye turubai ili uirekebishe, au ingiza picha mpya kutoka zana za kushoto.',
  E: 'Chagua umbo kwenye turubai ili ubadilishe jaza, mpaka na pembe.',
}

// ── Export & Publish (P): umbizo, ukubwa, ubora, hakiki, kipimo halisi, hamisha ──
const EXPORT_FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
]
const EXPORT_SCALE_OPTIONS = [
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
]

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function ExportGroupSection({ doc, exportApi }) {
  const [format, setFormat] = useState('png')
  const [scale, setScale] = useState(1)
  const [quality, setQuality] = useState(92)
  const [transparent, setTransparent] = useState(false)
  const [estimate, setEstimate] = useState(null)
  const [msg, setMsg] = useState('')
  const [measuring, setMeasuring] = useState(false)
  // Kila mabadiliko ya mipangilio au kipimo kipya kinapata namba. Matokeo ya kipimo cha zamani
  // yanayofika baadaye hayaonyeshwi, kwa hiyo hakuna ukubwa wa mipangilio tofauti.
  const reqRef = useRef(0)

  const size = exportSize(doc, scale)
  const lossy = format !== 'png'
  const alphaOk = format !== 'jpeg'
  const useTransparent = transparent && alphaOk
  const opts = { format, scale, quality, transparent: useTransparent }
  const label = EXPORT_FORMATS[format]?.label ?? format

  // Kipimo kinafutwa mipangilio ikibadilika, ili kisionyeshe ukubwa wa zamani.
  const change = (fn) => (v) => { reqRef.current += 1; setEstimate(null); setMsg(''); setMeasuring(false); fn(v) }

  async function measure() {
    const id = ++reqRef.current
    setMeasuring(true)
    setMsg('')
    try {
      const r = await exportApi.measure(opts)
      if (id === reqRef.current) setEstimate(r)
    } catch (err) {
      if (id === reqRef.current) setMsg(err?.message || 'Kipimo kimeshindikana.')
    } finally {
      if (id === reqRef.current) setMeasuring(false)
    }
  }

  return (
    <div className="cve-props__inner" data-testid="props-panel" data-focus="P">
      <header className="cve-props__head">
        <span className="cve-kicker">Hamisha</span>
        <h3 className="cve-props__title">Export & Publish</h3>
      </header>
      <Group title="Umbizo">
        <Segmented label="Umbizo" value={format} options={EXPORT_FORMAT_OPTIONS} onChange={change(setFormat)} />
      </Group>
      <Group title="Ukubwa na ubora">
        <Segmented label="Ukubwa" value={scale} options={EXPORT_SCALE_OPTIONS} onChange={change(setScale)} />
        <p className="cve-hint" data-testid="export-size">
          Vipimo vya export: {size.width}×{size.height} px{size.clamped ? ' (imepunguzwa, kikomo ni 4000 px)' : ''}.
        </p>
        {lossy ? (
          <Slider label="Ubora" value={quality} min={50} max={100} unit="%" onChange={change(setQuality)} />
        ) : (
          <p className="cve-hint">PNG ni bila hasara, kwa hiyo ubora hautumiki.</p>
        )}
        <Toggle
          label="Bila mandhari (uwazi)"
          pressed={useTransparent}
          onChange={change(setTransparent)}
          icon="drop"
          disabled={!alphaOk}
        />
        {!alphaOk ? <p className="cve-hint">JPEG haina uwazi; mandhari nyeupe hutumika.</p> : null}
      </Group>
      <Group title="Hakiki na hamisha">
        <div className="cve-row">
          <Btn icon="preview" onClick={() => exportApi.preview(opts)}>Hakiki</Btn>
          <Btn icon="sliders" onClick={measure} disabled={measuring}>
            {measuring ? 'Inakadiria…' : 'Pima ukubwa'}
          </Btn>
        </div>
        {estimate ? (
          <p className="cve-hint" role="status" data-testid="export-measured">
            Ukubwa halisi: {formatBytes(estimate.bytes)} · {estimate.width}×{estimate.height} px · {estimate.mime}
          </p>
        ) : null}
        {estimate?.warnings?.length ? <p className="cve-hint">{estimate.warnings.join(' ')}</p> : null}
        {msg ? <p className="cve-hint" role="alert">{msg}</p> : null}
        <Btn variant="primary" icon="download" onClick={() => exportApi.exportWith(opts)}>
          Hamisha {label}
        </Btn>
      </Group>
    </div>
  )
}

// ── Makundi ya display tu (F, K, L, M, N, O): hali wazi, bila vitufe vya kuigiza ──
function PlannedGroupSection({ focus }) {
  const summary = plannedGroupSummary(focus)
  if (!summary) return null
  const services = summary.services
  return (
    <div className="cve-props__inner" data-testid="props-panel" data-focus={focus}>
      <header className="cve-props__head">
        <span className="cve-kicker">Mpango</span>
        <h3 className="cve-props__title">{summary.title}</h3>
      </header>
      <p className="cve-hint" role="status">{summary.headline}</p>
      <Group title="Hali ya zana">
        <ul className="cve-planned-list" aria-label={`Hali ya zana: ${summary.title}`}>
          {summary.items.map((it) => (
            <li key={it.id}>
              <span>{it.label}</span>
              <span className={`cve-chip cve-chip--${it.status}`}>{it.statusLabel}</span>
              {it.note ? <small>{it.note}</small> : null}
            </li>
          ))}
        </ul>
      </Group>
      {services.length ? (
        <p className="cve-hint">
          Huduma zinazohitajika: {services.map((x) => x.name).join(', ')}. {services.some((x) => !x.connected) ? 'Hazijaunganishwa, kwa hiyo hazifanyi kazi.' : ''}
        </p>
      ) : null}
    </div>
  )
}

// ── Kundi H (Athari na vichujio): vichujio vya picha vinavyoonyeshwa kwenye turubai na export ──
const EFFECTS_HINT_NONE = 'Chagua picha kwenye turubai ili uweke kichujio. Vichujio vinafanya kazi kwenye picha tu.'

function EffectsGroupSection({ doc, selectedIds, onPatch }) {
  const [intensity, setIntensity] = useState(100)
  const [msg, setMsg] = useState('')
  const layer = selectedIds.length === 1 ? findLayer(doc, selectedIds[0]) : null
  const shell = (children) => (
    <div className="cve-props__inner" data-testid="props-panel" data-focus="H">{children}</div>
  )
  if (!layer || layer.type !== 'image') return shell(<p className="cve-hint" role="status">{EFFECTS_HINT_NONE}</p>)
  const apply = (preset) => {
    const patch = presetPatch(preset.id, intensity)
    if (!patch) return
    onPatch(patch, null)
    setMsg(`Kichujio "${preset.label}" kimetumika kwa nguvu ${intensity}%.`)
  }
  const clear = () => {
    onPatch(clearFilterPatch(), null)
    setMsg('Vichujio vimeondolewa.')
  }
  return shell(
    <>
      <header className="cve-props__head">
        <span className="cve-kicker">Picha</span>
        <h3 className="cve-props__title">{layer.name}</h3>
        {layer.locked ? <span className="cve-chip">Imefungwa</span> : null}
      </header>
      <Group title="Vichujio">
        <Slider label="Nguvu ya kichujio" value={intensity} min={0} max={100} unit="%" disabled={layer.locked} onChange={setIntensity} />
        <div className="cve-actions" role="group" aria-label="Vichujio vya picha">
          {FILTER_PRESETS.map((preset) => (
            <Btn key={preset.id} disabled={layer.locked} onClick={() => apply(preset)}>{preset.label}</Btn>
          ))}
        </div>
        <Btn icon="back" disabled={layer.locked || !hasFilter(layer)} onClick={clear}>Ondoa vichujio</Btn>
        {msg ? <p className="cve-hint" role="status">{msg}</p> : null}
        <p className="cve-hint">Vichujio vinabadilisha mwangaza, utofauti, rangi na joto. Ukungu, mpaka na kivuli viko kwenye kundi C.</p>
      </Group>
    </>,
  )
}

// ── Kundi G (Rangi): rangi za kitu kilichochaguliwa, pamoja na RGB/HSL, za hivi karibuni na zilizohifadhiwa ──
const COLOR_HINT_NONE = 'Chagua maandishi au umbo kwenye turubai ili ubadilishe rangi zake. Rangi ya mandhari iko kwenye kundi D.'

function ColorGroupSection({ doc, selectedIds, onPatch }) {
  const [styles, setStyles] = useState(() => loadStyles())
  const [styleName, setStyleName] = useState('')
  const [styleMsg, setStyleMsg] = useState('')
  const layer = selectedIds.length === 1 ? findLayer(doc, selectedIds[0]) : null
  const shell = (children) => (
    <div className="cve-props__inner" data-testid="props-panel" data-focus="G">{children}</div>
  )
  if (!layer) return shell(<p className="cve-hint" role="status">{COLOR_HINT_NONE}</p>)
  if (layer.type === 'image') {
    return shell(<p className="cve-hint" role="status">Picha haina rangi ya kujaza. Marekebisho ya picha yako kwenye kundi C.</p>)
  }
  const set = (patch, key = null) => onPatch(patch, key ? `${key}:${layer.id}` : null)

  // Mitindo: kuhifadhi, kutumia, kuondoa, na kufuta. Kila kitendo kinaandika kupitia onPatch au storage tu.
  const saveStyleFromLayer = () => {
    const style = createStyle(styleName, layer)
    if (!style) return setStyleMsg('Kitu hiki hakina rangi za kuhifadhi.')
    const next = addStyle(styles, style)
    if (!saveStyles(next)) return setStyleMsg('Kifaa kimejaa: mtindo haukuhifadhiwa.')
    setStyles(next)
    setStyleName('')
    setStyleMsg(`Mtindo "${style.name}" umehifadhiwa.`)
  }
  const applyStyle = (style) => {
    const patch = stylePatch(style, layer)
    if (!patch) return setStyleMsg('Mtindo huu hauendani na kitu hiki.')
    onPatch(patch, null)
    setStyleMsg(`Mtindo "${style.name}" umetumika.`)
  }
  const removeStyle = (style) => {
    const patch = removePatch(style, layer)
    if (!patch) return setStyleMsg('Mtindo huu hauendani na kitu hiki.')
    onPatch(patch, null)
    setStyleMsg(`Mtindo "${style.name}" umeondolewa kwenye kitu.`)
  }
  const removeSavedStyle = (style) => {
    const next = deleteStyle(styles, style.id)
    saveStyles(next)
    setStyles(next)
    setStyleMsg(`Mtindo "${style.name}" umefutwa.`)
  }

  return shell(
    <>
      <header className="cve-props__head">
        <span className="cve-kicker">{TYPE_LABEL[layer.type]}</span>
        <h3 className="cve-props__title">{layer.name}</h3>
        {layer.locked ? <span className="cve-chip">Imefungwa</span> : null}
      </header>
      {layer.type === 'text' ? (
        <>
          <Group title="Rangi ya maandishi">
            <ColorField label="Rangi ya maandishi" value={layer.color} onChange={(v) => set({ color: v }, 'tc')} />
            <ColorModelFields label="Rangi ya maandishi" value={layer.color} disabled={layer.locked} onChange={(v) => set({ color: v }, 'tc')} />
          </Group>
          <Group title="Mandhari nyuma ya maandishi" defaultOpen={false}>
            <ColorField label="Mandhari nyuma ya maandishi" value={layer.bgColor} allowNone onChange={(v) => set({ bgColor: v }, 'tbg')} />
          </Group>
        </>
      ) : null}
      {layer.type === 'shape' ? (
        <>
          <Group title="Ndani (fill)">
            <ColorField label="Ndani (fill)" value={layer.fill} allowNone onChange={(v) => set({ fill: v }, 'sf')} />
            <ColorModelFields label="Ndani (fill)" value={layer.fill} disabled={layer.locked} onChange={(v) => set({ fill: v }, 'sf')} />
          </Group>
          <Group title="Mpaka (stroke)" defaultOpen={false}>
            <ColorField label="Mpaka (stroke)" value={layer.stroke} allowNone onChange={(v) => set({ stroke: v }, 'ss')} />
            {layer.stroke && !(layer.strokeWidth > 0) ? (
              <p className="cve-hint" role="status">Mpaka hauonekani hadi upana wa mpaka uwe zaidi ya 0. Upana uko kwenye kundi E (Maumbo).</p>
            ) : null}
          </Group>
        </>
      ) : null}
      <Group title="Mitindo ya rangi">
        <label className="cve-field">
          <span className="cve-field__label"><span>Jina la mtindo</span></span>
          <input
            type="text"
            className="cve-input"
            value={styleName}
            maxLength={40}
            placeholder="Mfano: Bluu ya chapa"
            aria-label="Jina la mtindo"
            disabled={layer.locked}
            onChange={(e) => setStyleName(e.target.value)}
          />
        </label>
        <Btn icon="save" onClick={saveStyleFromLayer} disabled={layer.locked}>Hifadhi mtindo kutoka kitu hiki</Btn>
        {styleMsg ? <p className="cve-hint" role="status">{styleMsg}</p> : null}
        {styles.length ? (
          <ul className="cve-style-list" aria-label="Mitindo iliyohifadhiwa">
            {styles.map((st) => {
              const applies = styleApplies(st, layer) && !layer.locked
              return (
                <li key={st.id} className="cve-style-row">
                  <span className="cve-style-row__name">{st.name}</span>
                  <span className="cve-style-row__sw" aria-hidden="true">
                    {Object.values(st.colors).filter(Boolean).map((hex, i) => (
                      <i key={`${hex}-${i}`} style={{ background: hex }} />
                    ))}
                  </span>
                  <Btn disabled={!applies} onClick={() => applyStyle(st)} aria-label={`Tumia mtindo ${st.name}`} title={applies ? '' : 'Mtindo huu hauendani na kitu hiki'}>Tumia</Btn>
                  <Btn disabled={!applies} onClick={() => removeStyle(st)} aria-label={`Ondoa mtindo ${st.name}`}>Ondoa</Btn>
                  <Btn variant="danger" onClick={() => removeSavedStyle(st)} aria-label={`Futa mtindo ${st.name}`}>Futa</Btn>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="cve-hint">Hakuna mitindo bado. Hifadhi rangi za kitu kilichochaguliwa ili uitumie tena.</p>
        )}
      </Group>
    </>,
  )
}

function FocusPanel({ focus, doc, selectedIds, onPatch, onBackground, onRequestImage }) {
  if (focus === 'D') {
    return <BackgroundSection doc={doc} onBackground={onBackground} onRequestImage={onRequestImage} focus="D" />
  }
  const want = FOCUS_TYPE[focus]
  const layer = selectedIds.length === 1 ? findLayer(doc, selectedIds[0]) : null
  if (!layer || layer.type !== want) {
    return (
      <div className="cve-props__inner" data-testid="props-panel" data-focus={focus}>
        <p className="cve-hint" role="status">{FOCUS_HINT[focus]}</p>
      </div>
    )
  }
  const set = (patch, key = null) => onPatch(patch, key ? `${key}:${layer.id}` : null)
  return (
    <div className="cve-props__inner" data-testid="props-panel" data-focus={focus}>
      <header className="cve-props__head">
        <span className="cve-kicker">{TYPE_LABEL[layer.type]}{layer.type === 'shape' ? ` · ${SHAPE_LABEL[layer.shape] ?? ''}` : ''}</span>
        <h3 className="cve-props__title">{layer.name}</h3>
        {layer.locked ? <span className="cve-chip">Imefungwa</span> : null}
      </header>
      {layer.type === 'text' ? <TextSection layer={layer} doc={doc} set={set} disabled={layer.locked} /> : null}
      {layer.type === 'image' ? (
        <>
          <Group title="Uwazi">
            <Slider label="Uwazi" value={Math.round(layer.opacity * 100)} min={0} max={100} unit="%" disabled={layer.locked} onChange={(v) => set({ opacity: v / 100 }, 'op')} />
          </Group>
          <ImageSection layer={layer} set={set} onRequestImage={onRequestImage} disabled={layer.locked} />
        </>
      ) : null}
      {layer.type === 'shape' ? <ShapeSection layer={layer} set={set} disabled={layer.locked} /> : null}
    </div>
  )
}

function TextSection({ layer, doc, set, disabled }) {
  const reset = () => set({
    fontKey: 'inter', bold: false, italic: false, color: DEFAULT_INK, bgColor: null, align: 'left',
    lineHeight: 1.2, letterSpacing: 0, stroke: { width: 0, color: DEFAULT_WHITE }, shadow: null,
  })
  const shadow = layer.shadow
  return (
    <>
      <Group title="Maandishi">
        <Textarea
          label="Maandishi"
          value={layer.text}
          maxLength={2000}
          rows={4}
          onChange={(v) => set({ text: v }, 'text')}
        />
        <p className="cve-hint">Bonyeza mara mbili kwenye turubai ili uhariri moja kwa moja.</p>
        <div className="cve-presets" role="group" aria-label="Mitindo ya haraka">
          {TEXT_PRESETS.map((p) => (
            <Btn
              key={p.id}
              disabled={disabled}
              onClick={() => set({ fontSize: Math.max(6, Math.round(doc.height * p.size)), bold: p.bold })}
            >
              {p.label}
            </Btn>
          ))}
        </div>
      </Group>

      <Group title="Font na ukubwa">
        <FontSelect value={layer.fontKey} onChange={(v) => set({ fontKey: v })} />
        <Slider label="Ukubwa" value={layer.fontSize} min={6} max={600} unit="px" disabled={disabled} onChange={(v) => set({ fontSize: v }, 'fs')} />
        <div className="cve-toggles">
          <Toggle label="Nzito" pressed={layer.bold} onChange={(v) => set({ bold: v })} disabled={disabled} />
          <Toggle label="Italiki" pressed={layer.italic} onChange={(v) => set({ italic: v })} disabled={disabled} />
          <Toggle label="Mstari chini" pressed={layer.underline} onChange={(v) => set({ underline: v })} disabled={disabled} />
          <Toggle label="Mstari wa katikati" pressed={layer.strike} onChange={(v) => set({ strike: v })} disabled={disabled} />
        </div>
        <Segmented
          label="Mpangilio"
          value={layer.align}
          onChange={(v) => set({ align: v })}
          options={[
            { value: 'left', icon: 'alignL', aria: 'Kushoto', label: 'Kushoto' },
            { value: 'center', icon: 'alignCH', aria: 'Katikati', label: 'Katikati' },
            { value: 'right', icon: 'alignR', aria: 'Kulia', label: 'Kulia' },
          ]}
        />
      </Group>

      <Group title="Orodha" defaultOpen={false}>
        <Segmented
          label="Aina ya orodha"
          value={layer.list}
          onChange={(v) => set({ list: v })}
          options={[
            { value: 'none', label: 'Hakuna' },
            { value: 'bullet', label: 'Vitone' },
            { value: 'number', label: 'Namba' },
          ]}
        />
      </Group>

      <Group title="Rangi na mandhari">
        <ColorField label="Rangi ya maandishi" value={layer.color} onChange={(v) => set({ color: v }, 'tc')} />
        <ColorField label="Mandhari nyuma ya maandishi" value={layer.bgColor} allowNone onChange={(v) => set({ bgColor: v }, 'tbg')} />
      </Group>

      <Group title="Nafasi" defaultOpen={false}>
        <Slider label="Nafasi ya mistari" value={layer.lineHeight} min={0.8} max={3} step={0.05} decimals={2} onChange={(v) => set({ lineHeight: v }, 'lh')} />
        <Slider label="Nafasi ya herufi" value={layer.letterSpacing} min={-10} max={80} unit="px" onChange={(v) => set({ letterSpacing: v }, 'ls')} />
      </Group>

      <Group title="Mpaka na kivuli" defaultOpen={false}>
        <Slider label="Upana wa mpaka" value={layer.stroke?.width ?? 0} min={0} max={20} unit="px" onChange={(v) => set({ stroke: { ...layer.stroke, width: v } }, 'sw')} />
        {layer.stroke?.width > 0 ? (
          <ColorField label="Rangi ya mpaka" value={layer.stroke.color} onChange={(v) => set({ stroke: { ...layer.stroke, color: v } }, 'sc')} />
        ) : null}
        <Toggle
          label="Kivuli"
          icon="drop"
          pressed={Boolean(shadow)}
          onChange={(on) => set({ shadow: on ? { ...DEFAULT_SHADOW, blur: 8, offsetX: 2, offsetY: 4 } : null })}
        />
        {shadow ? (
          <>
            <Slider label="Ukungu wa kivuli" value={shadow.blur} min={0} max={80} unit="px" onChange={(v) => set({ shadow: { ...shadow, blur: v } }, 'shb')} />
            <Slider label="Mlalo" value={shadow.offsetX} min={-60} max={60} unit="px" onChange={(v) => set({ shadow: { ...shadow, offsetX: v } }, 'shx')} />
            <Slider label="Wima" value={shadow.offsetY} min={-60} max={60} unit="px" onChange={(v) => set({ shadow: { ...shadow, offsetY: v } }, 'shy')} />
          </>
        ) : null}
      </Group>

      <div className="cve-resetrow">
        <Btn icon="back" onClick={reset} disabled={disabled}>Rudisha mtindo wa maandishi</Btn>
      </div>
    </>
  )
}

// ── Picha ──────────────────────────────────────────────────────
// Vidhibiti vya kivuli, vinatumiwa na picha na umbo.
function ShadowFields({ shadow, set, disabled, keyPrefix }) {
  return (
    <>
      <Toggle
        label="Kivuli"
        icon="drop"
        pressed={Boolean(shadow)}
        disabled={disabled}
        onChange={(on) => set({ shadow: on ? { ...DEFAULT_SHADOW } : null })}
      />
      {shadow ? (
        <>
          <Slider label="Ukungu wa kivuli" value={shadow.blur} min={0} max={80} unit="px" disabled={disabled} onChange={(v) => set({ shadow: { ...shadow, blur: v } }, `${keyPrefix}b`)} />
          <Slider label="Kivuli kushoto/kulia" value={shadow.offsetX} min={-200} max={200} unit="px" disabled={disabled} onChange={(v) => set({ shadow: { ...shadow, offsetX: v } }, `${keyPrefix}x`)} />
          <Slider label="Kivuli juu/chini" value={shadow.offsetY} min={-200} max={200} unit="px" disabled={disabled} onChange={(v) => set({ shadow: { ...shadow, offsetY: v } }, `${keyPrefix}y`)} />
          <Slider label="Uwazi wa kivuli" value={Math.round((shadow.alpha ?? 1) * 100)} min={0} max={100} unit="%" disabled={disabled} onChange={(v) => set({ shadow: { ...shadow, alpha: v / 100 } }, `${keyPrefix}a`)} />
        </>
      ) : null}
    </>
  )
}

const IMAGE_ADJUST_RESET = { brightness: 100, contrast: 100, saturation: 100, blur: 0, temperature: 0, tint: 0 }
const IMAGE_ASPECTS = [
  { id: 'native', label: 'Asili', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
]

function ImageSection({ layer, set, onRequestImage, disabled }) {
  const c = layer.crop
  const sides = {
    left: c.x * 100,
    right: (1 - c.x - c.w) * 100,
    top: c.y * 100,
    bottom: (1 - c.y - c.h) * 100,
  }
  // Kata inabadilisha urefu ili uwiano wa picha usipotoshwe. Kila upande unaopimwa kwa sehemu (0..1).
  const cropWith = (side, v) => {
    let nl = c.x
    let nr = 1 - c.x - c.w
    let nt = c.y
    let nb = 1 - c.y - c.h
    if (side === 'left') nl = v
    if (side === 'right') nr = v
    if (side === 'top') nt = v
    if (side === 'bottom') nb = v
    const MIN = 0.05
    if (nl + nr > 1 - MIN) { if (side === 'left') nl = 1 - MIN - nr; else nr = 1 - MIN - nl }
    if (nt + nb > 1 - MIN) { if (side === 'top') nt = 1 - MIN - nb; else nb = 1 - MIN - nt }
    return { x: nl, y: nt, w: 1 - nl - nr, h: 1 - nt - nb }
  }
  const aspectPatch = (nextCrop) => {
    const ratio = (nextCrop.w * layer.naturalW) / (nextCrop.h * layer.naturalH)
    return { crop: nextCrop, h: Math.max(MIN_LAYER_SIZE, Math.round(layer.w / ratio)) }
  }
  // Uwiano: null = asili (picha nzima). Kata inabaki katikati; upana unabaki.
  const applyAspect = (ratio) => set(aspectCrop(layer, ratio ?? layer.naturalW / layer.naturalH), 'aspect')
  const restoreOriginal = () => set({
    ...aspectCrop(layer, layer.naturalW / layer.naturalH),
    ...IMAGE_ADJUST_RESET,
    shadow: null,
    border: { width: 0, color: layer.border.color },
    radius: 0,
  }, 'restore')
  const setCrop = (side, pct) => {
    const v = Math.min(90, Math.max(0, pct)) / 100
    set(aspectPatch(cropWith(side, v)), `crop-${side}`)
  }

  return (
    <>
      <Group title="Picha">
        <div className="cve-actions">
          <Btn icon="image" disabled={disabled} onClick={() => onRequestImage('replace')}>Badilisha (kifaa)</Btn>
          <Btn icon="media" disabled={disabled} onClick={() => onRequestImage('replace-media')}>Badilisha (Media)</Btn>
        </div>
        <p className="cve-hint">Picha ya asili inabaki bila kubadilishwa; kukata na athari ni za turubai tu.</p>
      </Group>

      <Group title="Kata">
        <Slider label="Kutoka kushoto" value={Math.round(sides.left)} min={0} max={90} unit="%" disabled={disabled} onChange={(v) => setCrop('left', v)} />
        <Slider label="Kutoka kulia" value={Math.round(sides.right)} min={0} max={90} unit="%" disabled={disabled} onChange={(v) => setCrop('right', v)} />
        <Slider label="Kutoka juu" value={Math.round(sides.top)} min={0} max={90} unit="%" disabled={disabled} onChange={(v) => setCrop('top', v)} />
        <Slider label="Kutoka chini" value={Math.round(sides.bottom)} min={0} max={90} unit="%" disabled={disabled} onChange={(v) => setCrop('bottom', v)} />
      </Group>

      <Group title="Uwiano">
        <div className="cve-actions" role="group" aria-label="Uwiano wa picha">
          {IMAGE_ASPECTS.map((a) => (
            <Btn key={a.id} disabled={disabled} onClick={() => applyAspect(a.ratio)}>{a.label}</Btn>
          ))}
        </div>
        <p className="cve-hint">Uwiano unakata picha katikati na kubadilisha urefu; upana unabaki.</p>
      </Group>

      <Group title="Mpaka na pembe" defaultOpen={false}>
        <Slider label="Upana wa mpaka" value={layer.border.width} min={0} max={40} unit="px" disabled={disabled} onChange={(v) => set({ border: { ...layer.border, width: v } }, 'ib')} />
        {layer.border.width > 0 ? (
          <ColorField label="Rangi ya mpaka" value={layer.border.color} onChange={(v) => set({ border: { ...layer.border, color: v } }, 'ibc')} />
        ) : null}
        <Slider label="Pembe" value={layer.radius} min={0} max={Math.round(Math.min(layer.w, layer.h) / 2)} unit="px" disabled={disabled} onChange={(v) => set({ radius: v }, 'ir')} />
      </Group>

      <Group title="Kivuli" defaultOpen={false}>
        <ShadowFields shadow={layer.shadow} set={set} disabled={disabled} keyPrefix="ish" />
      </Group>

      <Group title="Athari za picha" defaultOpen={false}>
        <Slider label="Mwangaza" value={layer.brightness} min={0} max={200} unit="%" disabled={disabled} onChange={(v) => set({ brightness: v }, 'ibr')} />
        <Slider label="Utofauti" value={layer.contrast} min={0} max={200} unit="%" disabled={disabled} onChange={(v) => set({ contrast: v }, 'ict')} />
        <Slider label="Rangi (saturation)" value={layer.saturation} min={0} max={200} unit="%" disabled={disabled} onChange={(v) => set({ saturation: v }, 'isa')} />
        <Slider label="Ukungu (blur)" value={layer.blur} min={0} max={40} unit="px" disabled={disabled} onChange={(v) => set({ blur: v }, 'ibl')} />
        <Slider label="Joto (temperature)" value={layer.temperature} min={-100} max={100} disabled={disabled} onChange={(v) => set({ temperature: v }, 'itp')} />
        <Slider label="Tint (kijani/magenta)" value={layer.tint} min={-100} max={100} disabled={disabled} onChange={(v) => set({ tint: v }, 'itn')} />
        <Btn icon="back" disabled={disabled} onClick={() => set(IMAGE_ADJUST_RESET, 'iadj')}>Rudisha marekebisho</Btn>
      </Group>

      <Group title="Rudisha">
        <Btn icon="back" disabled={disabled} onClick={restoreOriginal}>Rudisha picha ya asili</Btn>
        <p className="cve-hint">Inarudisha kata, uwiano, marekebisho, kivuli, mpaka na pembe. Upana na nafasi vinabaki.</p>
      </Group>
    </>
  )
}

// ── Umbo ───────────────────────────────────────────────────────
function ShapeSection({ layer, set, disabled }) {
  const line = layer.shape === 'line' || layer.shape === 'arrow'
  const area = !line
  const maxR = Math.round(Math.min(layer.w, layer.h) / 2)
  return (
    <>
      {area ? (
        <Group title="Aina ya umbo">
          <Segmented
            label="Umbo"
            value={layer.shape}
            onChange={(v) => set({ shape: v })}
            options={[
              { value: 'rect', label: 'Mstatili' },
              { value: 'rounded', label: 'Mviringo' },
              { value: 'ellipse', label: 'Duara' },
              { value: 'triangle', label: 'Pembetatu' },
            ]}
          />
        </Group>
      ) : null}

      {area ? (
        <Group title="Maumbo tayari">
          <div className="cve-actions" role="group" aria-label="Maumbo tayari">
            {SHAPE_PRESETS.map((p) => (
              <Btn key={p.id} disabled={disabled} onClick={() => set(applyShapePreset(layer, p.id), 'preset')}>{p.label}</Btn>
            ))}
          </div>
        </Group>
      ) : null}

      <Group title={line ? 'Mstari' : 'Jaza na mpaka'}>
        {area ? (
          <ColorField label="Ndani (fill)" value={layer.fill} allowNone onChange={(v) => set({ fill: v }, 'sf')} />
        ) : null}
        <ColorField label={line ? 'Rangi ya mstari' : 'Mpaka (stroke)'} value={layer.stroke} allowNone onChange={(v) => set({ stroke: v }, 'ss')} />
        <Slider label={line ? 'Unene wa mstari' : 'Upana wa mpaka'} value={layer.strokeWidth} min={0} max={60} unit="px" disabled={disabled} onChange={(v) => set({ strokeWidth: v }, 'sw')} />
      </Group>

      {layer.shape === 'rect' || layer.shape === 'rounded' ? (
        <Group title="Pembe">
          <Slider label="Pembe" value={layer.radius} min={0} max={maxR} unit="px" disabled={disabled} onChange={(v) => set({ radius: v }, 'sr')} />
        </Group>
      ) : null}

      {area ? (
        <Group title="Kivuli" defaultOpen={false}>
          <ShadowFields shadow={layer.shadow} set={set} disabled={disabled} keyPrefix="shs" />
        </Group>
      ) : null}
    </>
  )
}

// ── Mandhari ya turubai (hakuna kilichochaguliwa) ───────────────
function BackgroundSection({ doc, onBackground, onRequestImage, focus = null }) {
  const bg = doc.background
  // `current` ni mandhari bila `prev`, ili mabadiliko ya rangi/uwazi yasibadilishe mandhari ya awali.
  const { prev, ...current } = bg
  const setType = (type) => {
    if (type === bg.type) return
    if (type === 'solid') onBackground({ ...current, type: 'solid', color: DEFAULT_WHITE }, null)
    if (type === 'gradient') onBackground({ ...current, type: 'gradient', from: '#18a982', to: '#3b82f6', angle: 135 }, null)
    if (type === 'image') onRequestImage('background')
  }
  return (
    <div className="cve-props__inner" data-testid="props-panel" data-focus={focus ?? undefined}>
      <header className="cve-props__head">
        <span className="cve-kicker">Turubai</span>
        <h3 className="cve-props__title">Mandhari</h3>
        <p className="cve-hint">Chagua kipengele kwenye turubai ili uone sifa zake.</p>
      </header>

      <Group title="Aina ya mandhari">
        <Segmented
          label="Aina"
          value={bg.type}
          onChange={setType}
          options={[
            { value: 'solid', label: 'Rangi' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'image', label: 'Picha' },
          ]}
        />
      </Group>

      {bg.type === 'solid' ? (
        <Group title="Rangi ya mandhari">
          <ColorField label="Rangi" value={bg.color} onChange={(v) => onBackground({ ...current, color: v }, 'bgc')} />
        </Group>
      ) : null}

      {bg.type === 'gradient' ? (
        <Group title="Gradient">
          <ColorField label="Rangi ya kwanza" value={bg.from} onChange={(v) => onBackground({ ...current, from: v }, 'bgf')} />
          <ColorField label="Rangi ya mwisho" value={bg.to} onChange={(v) => onBackground({ ...current, to: v }, 'bgt')} />
          <Slider label="Mwelekeo" value={bg.angle} min={0} max={360} unit="°" onChange={(v) => onBackground({ ...current, angle: v }, 'bga')} />
        </Group>
      ) : null}

      {bg.type === 'image' ? (
        <Group title="Picha ya mandhari">
          <div className="cve-actions">
            <Btn icon="image" onClick={() => onRequestImage('background')}>Badilisha (kifaa)</Btn>
            <Btn icon="media" onClick={() => onRequestImage('background-media')}>Kutoka Media</Btn>
            <Btn icon="trash" variant="danger" onClick={() => onBackground({ type: 'solid', color: DEFAULT_WHITE, opacity: bg.opacity, prev: current }, null)}>Ondoa picha</Btn>
          </div>
          <p className="cve-hint">Picha inafunika turubai kwa kujaza (cover). Nafasi na kipimo bado hazijaunganishwa.</p>
        </Group>
      ) : null}

      <Group title="Uwazi na ukungu">
        <Slider
          label="Uwazi"
          value={Math.round((bg.opacity ?? 1) * 100)}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => onBackground({ ...current, opacity: v / 100 }, 'bgo')}
        />
        {bg.type === 'image' ? (
          <Slider label="Ukungu (blur)" value={bg.blur} min={0} max={40} unit="px" onChange={(v) => onBackground({ ...current, blur: v }, 'bgb')} />
        ) : (
          <p className="cve-hint">Ukungu unatumika kwa picha ya mandhari tu.</p>
        )}
      </Group>

      <Group title="Rudisha">
        <div className="cve-actions">
          <Btn icon="back" disabled={!prev} onClick={() => onBackground({ ...prev, prev: current }, null)}>Rudisha mandhari ya awali</Btn>
          <Btn icon="back" onClick={() => onBackground({ type: 'solid', color: DEFAULT_WHITE, opacity: 1, prev: current }, null)}>Rudisha mandhari (asili)</Btn>
        </div>
        <p className="cve-hint">Mandhari ya awali inahifadhiwa aina au picha inapobadilika, na inabaki kwenye mradi.</p>
      </Group>

      <Group title="Turubai">
        <dl className="cve-dl">
          <dt>Ukubwa</dt><dd>{doc.width} × {doc.height} px</dd>
          <dt>Aina</dt><dd>{doc.mode}</dd>
          <dt>Tabaka</dt><dd>{doc.layers.length}</dd>
        </dl>
      </Group>
    </div>
  )
}

