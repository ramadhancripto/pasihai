// ══════════════════════════════════════════════════════════════
// CreativeEditor — mhariri mmoja wa hati kwa modes zote (desktop + mobile).
//   Hali: historia ya hati (undo/redo) · uchaguzi · hali ya uhariri wa maandishi · flyouts · mobile view.
//   Hifadhi: creativeProjects (kifaa, user-scoped, revision). Recovery: writeRecovery (kila sekunde chache).
//   Export/preview: creativeRender.exportPng (renderer moja). Publish: feedService.createPost + publishOutcome.
//   Kila kitendo kinaandikwa kupitia commit moja ya historia, kwa hiyo undo/redo inafanya kazi kila mahali.
// ══════════════════════════════════════════════════════════════
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  MODES, MAX_TITLE_LENGTH, addLayer, alignLayer, alignLayers, applyTemplate, canRedo, canUndo, commitHistory,
  copyLayers, createHistory, distributeLayers, duplicateLayer, duplicateLayers, findLayer, makeImage, makeShape,
  makeText, moveLayer, pasteLayers, removeLayer, removeLayers, scaleForBox, setBackground, setLayersFlag, setTitle,
  undoHistory, redoHistory, updateLayer, sanitizeDocument,
} from '../../creative/creativeModel.js'
import { exportImage, EXPORT_FORMATS, defaultLoadImage } from '../../creative/creativeRender.js'
import { plannedGroupSummary } from '../../creative/plannedGroups.js'
import { TOOLS, findTool } from '../../creative/toolRegistry.js'
import { toolState } from '../../creative/capabilities.js'
import { loadToolPrefs, saveToolPrefs, pushRecent } from '../../creative/toolPrefs.js'
import {
  CreativeConflictError, CreativeQuotaError, clearRecovery, readRecovery, removeProject, saveProject, writeRecovery,
} from '../../creative/creativeProjects.js'
import { feedService } from '../../services/feedService.js'
import { isSupabaseLive } from '../../lib/supabaseClient.js'
import { POST_IMAGE_ACCEPT, postMediaErrorMessage } from '../../utils/postMedia.js'
import { publishMessage, publishOutcome } from '../../utils/quickPost.js'
import CanvasStage from './CanvasStage.jsx'
import LayerList from './LayerList.jsx'
import PropertiesPanel from './PropertiesPanel.jsx'
import ToolLibrary from './ToolLibrary.jsx'
import { ToolFlyout } from './ToolFlyout.jsx'
import { Btn, Icon } from './controls.jsx'
import '../../styles/creative-editor.css'
import EditorRail from './EditorRail.jsx'
import { bottomTabsFor } from '../../creative/panelConfig.js'

export const CANVAS_IMAGE_MAX_BYTES = 1_500_000 // kikomo cha picha moja kwenye mradi
const ALLOWED_IMAGE_TYPES = POST_IMAGE_ACCEPT.split(',')
const MOBILE_QUERY = '(max-width: 820px)'
const ZOOM_MIN = 0.25
const ZOOM_MAX = 4
// Vitendo vya export vinavyoonyeshwa kwenye menyu ya "Hamisha" (vimetoka kwenye rejista).
// Bottom nav ya mhariri (MASTER §4): Select · Text · Image · Background · Shapes · More.
const MOBILE_EDITOR_TABS = [
  { id: 'select', label: 'Select', icon: 'pointer' },
  { id: 'text', label: 'Text', icon: 'type', group: 'B' },
  { id: 'image', label: 'Image', icon: 'image', group: 'C' },
  { id: 'background', label: 'Background', icon: 'paintBucket', group: 'D' },
  { id: 'shapes', label: 'Shapes', icon: 'shapes', group: 'E' },
  { id: 'more', label: 'More', icon: 'more' },
]
const EXPORT_TOOLS = TOOLS.filter((t) => t.group === 'P' && t.action && t.action.startsWith('export.'))

export default function CreativeEditor({ userId, initial, onExit, onSaved, onFeedChanged }) {
  const isMobile = useIsMobile()
  const [hist, setHist] = useState(() => createHistory(initial.doc))
  const [live, setLive] = useState(null)
  const [savedDoc, setSavedDoc] = useState(initial.doc)
  const [projectId, setProjectId] = useState(initial.projectId ?? null)
  const [revision, setRevision] = useState(initial.revision ?? 0)
  const [selIds, setSelIds] = useState([]) // vipengele vilivyochaguliwa; cha mwisho = kikuu
  const [libOpen, setLibOpen] = useState(true)
  // Kategoria iliyo kwenye rail (desktop). Inaanza na Select & Arrange (A).
  const [railGroup, setRailGroup] = useState('A')
  const [libQuery, setLibQuery] = useState('')
  const [snapOn, setSnapOn] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const [clip, setClip] = useState([])
  const [prefs, setPrefsState] = useState(() => loadToolPrefs())
  const searchRef = useRef(null)
  const setPrefs = (p) => { setPrefsState(p); saveToolPrefs(p) }
  const [editingId, setEditingId] = useState(null)
  const [guides, setGuides] = useState({ v: [], h: [] })
  const [zoom, setZoom] = useState(1)
  const [box, setBox] = useState({ w: 900, h: 600 })
  const [flyout, setFlyout] = useState(null)
  const [mediaPurpose, setMediaPurpose] = useState('add')
  const [bottomOpen, setBottomOpen] = useState(true)
  const [mobileView, setMobileView] = useState('canvas')
  // Paneli ya kundi (G, H) kwenye simu; null = sifa za kawaida.
  const [mobileFocus, setMobileFocus] = useState(null)
  const openMobileFocus = (group) => { if (isMobile) { setMobileFocus(group); setMobileView('props') } }
  // Kundi la zana linaloonyeshwa kwenye sheet ya mobile (A–P). null = menyu kamili ya More.
  const [mobileGroup, setMobileGroup] = useState(null)
  const [saveState, setSaveState] = useState({ tone: 'idle', text: '' })
  const [busy, setBusy] = useState(null) // 'save' | 'export' | 'preview' | 'publish' | null
  const [progress, setProgress] = useState(null)
  const [toast, setToast] = useState('')
  const [titleDraft, setTitleDraft] = useState(null)
  const [dialog, setDialog] = useState(null) // { kind, ... }
  const [moreOpen, setMoreOpen] = useState(false)
  const [recovery, setRecovery] = useState(() => offerRecovery(userId, initial))

  const viewportRef = useRef(null)
  const fileRef = useRef(null)
  const filePurpose = useRef('add')
  const busyRef = useRef(false)

  const view = live ?? hist.present
  const doc = view
  const mode = MODES[doc.mode] ?? MODES.blank
  const dirty = hist.present !== savedDoc
  // Kipengele kimoja tu ndicho kinachopata sifa za kina (handles, maandishi, picha).
  const selectedId = selIds.length === 1 ? selIds[0] : null
  const selected = selectedId ? findLayer(doc, selectedId) : null
  const selLayers = selIds.map((id) => findLayer(doc, id)).filter(Boolean)
  const selTypes = [...new Set(selLayers.map((l) => l.type))]
  const selectedText = !!selected && selected.type === 'text' && !selected.locked
  const selCtx = {
    selectionCount: selLayers.length,
    selectionType: selTypes.length === 1 ? selTypes[0] : null,
    hasClipboard: clip.length > 0,
    plan: 'free',
  }
  const canPublish = mode.status !== 'planned' && mode.id !== 'ad'
  const publishReason = mode.id === 'ad'
    ? 'Matangazo bado hayajaunganishwa kwenye PASIHAI. Hamisha PNG badala yake.'
    : mode.status === 'planned' ? 'Hali hii bado haijaunganishwa.' : ''

  // ── Vipimo vya turubai ──────────────────────────────────────
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return undefined
    const measure = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) setBox({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [isMobile])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const fit = scaleForBox(doc.width, doc.height, box.w - 48, box.h - 48) || 0.1
  const scale = Math.max(0.05, fit * zoom)

  // ── Historia ────────────────────────────────────────────────
  const commitNext = useCallback((next, key = null) => {
    setHist((h) => commitHistory(h, next, key))
    setLive(null)
  }, [])

  // Operesheni moja: inatupa kosa la muundo → ujumbe, bila kuvunja UI.
  const tryOp = (fn, key = null) => {
    try {
      const next = fn(hist.present)
      if (next !== hist.present) commitNext(next, key)
      return true
    } catch (err) {
      notify(err?.message || 'Kitendo hakikufanikiwa.')
      return false
    }
  }

  const undo = () => { if (canUndo(hist)) { setHist(undoHistory(hist)); setLive(null); setEditingId(null) } }
  const redo = () => { if (canRedo(hist)) { setHist(redoHistory(hist)); setLive(null); setEditingId(null) } }

  // Vipengele vilivyochaguliwa visivyokuwepo tena (undo, futa) vinaondolewa kwenye uteuzi.
  useEffect(() => {
    setSelIds((cur) => {
      const alive = cur.filter((id) => findLayer(hist.present, id))
      return alive.length === cur.length ? cur : alive
    })
    if (editingId && !findLayer(hist.present, editingId)) setEditingId(null)
  }, [hist.present, editingId])

  // select(id) → uteuzi mmoja; select(id, true) → ongeza/ondoa (Shift/Ctrl); select(null) → ondoa vyote.
  function select(id, additive = false) {
    setEditingId(null)
    if (id === null || id === undefined) return setSelIds([])
    if (!additive) return setSelIds([id])
    return setSelIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function notify(message) { setToast(message) }
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(''), 4500)
    return () => clearTimeout(t)
  }, [toast])

  // ── Vitendo vya hati ────────────────────────────────────────
  const patchSel = (patch, key = null) => {
    const id = selectedId
    if (!id) return
    tryOp((d) => (findLayer(d, id) ? updateLayer(d, id, patch) : d), key)
  }

  const onBackground = (bg, key) => tryOp((d) => setBackground(d, bg), key)

  function addText() {
    const W = hist.present.width
    const H = hist.present.height
    const w = Math.min(640, Math.round(W * 0.8))
    const layer = makeText({
      name: 'Maandishi',
      w, h: 140,
      x: Math.round((W - w) / 2), y: Math.round(H / 2 - 70),
      fontSize: clampInt(Math.round(H * 0.06), 12, 240),
    })
    if (tryOp((d) => addLayer(d, layer).doc)) select(layer.id)
  }

  function addShape(kind) {
    const W = hist.present.width
    const H = hist.present.height
    const probe = makeShape(kind)
    const layer = makeShape(kind, { x: Math.round((W - probe.w) / 2), y: Math.round((H - probe.h) / 2) })
    if (tryOp((d) => addLayer(d, layer).doc)) select(layer.id)
    setFlyout(null)
  }

  function applyTpl(id) {
    tryOp((d) => applyTemplate(d, id))
    setSelIds([])
    setFlyout(null)
  }

  function layerAction(action, id, arg) {
    if (action === 'rename') return tryOp((d) => updateLayer(d, id, { name: arg }))
    if (action === 'toggle') {
      const cur = findLayer(hist.present, id)
      if (!cur) return undefined
      return tryOp((d) => updateLayer(d, id, { [arg]: !cur[arg] }))
    }
    if (action === 'order') return tryOp((d) => moveLayer(d, id, arg))
    if (action === 'duplicate') {
      let newId = null
      if (tryOp((d) => { const r = duplicateLayer(d, id); newId = r.id; return r.doc })) select(newId)
      return undefined
    }
    if (action === 'delete') {
      if (tryOp((d) => removeLayer(d, id)) && selectedId === id) select(null)
    }
    return undefined
  }

  function alignSel(where) {
    if (selIds.length > 1) return tryOp((d) => alignLayers(d, selIds, where))
    if (selectedId) tryOp((d) => alignLayer(d, selectedId, where))
    return undefined
  }

  function duplicateSel() {
    if (!selIds.length) return
    try {
      const r = duplicateLayers(hist.present, selIds)
      if (r.ids.length) { commitNext(r.doc); setSelIds(r.ids) }
    } catch (err) {
      notify(err?.message || 'Nakala haikufanikiwa.')
    }
  }

  // Vipengele vilivyofungwa havifutwi; vinabaki vilivyochaguliwa na ujumbe unaeleza kwa nini.
  function deleteSel() {
    if (!selIds.length) return
    const targets = selLayers.filter((l) => !l.locked).map((l) => l.id)
    const skipped = selIds.length - targets.length
    if (!targets.length) return notify('Vipengele vimefungwa. Vifungue kwanza (Ctrl+L).')
    tryOp((d) => removeLayers(d, targets))
    setSelIds([])
    if (skipped) notify(`Vipengele ${skipped} vimefungwa na havikufutwa. Vifungue kwanza (Ctrl+L).`)
    return undefined
  }

  function distributeSel(axis) {
    if (selIds.length < 3) return notify('Chagua vipengele vitatu au zaidi kugawanya.')
    return tryOp((d) => distributeLayers(d, selIds, axis))
  }

  // Kufunga/kuficha: ikiwa kuna kisichofungwa, funga vyote; vinginevyo fungua vyote.
  function setFlagSel(flag, value) {
    if (!selIds.length) return notify('Chagua kipengele kwanza.')
    return tryOp((d) => setLayersFlag(d, selIds, flag, value))
  }
  function toggleLockSel() { return setFlagSel('locked', selLayers.some((l) => !l.locked)) }
  function toggleHideSel() { return setFlagSel('hidden', selLayers.some((l) => !l.hidden)) }

  // Geuza (flip): thamani moja inawekwa kwa vyote visivyofungwa.
  function flipSel(flag) {
    const targets = selLayers.filter((l) => !l.locked)
    if (!targets.length) return notify(selIds.length ? 'Vipengele vimefungwa.' : 'Chagua kipengele kwanza.')
    const target = !targets.some((l) => l[flag])
    return tryOp((d) => targets.reduce((acc, l) => updateLayer(acc, l.id, { [flag]: target }), d))
  }

  // Mitindo ya maandishi (nzito/italiki) kwa maandishi yote yaliyochaguliwa.
  function toggleTextStyle(flag) {
    const targets = selLayers.filter((l) => l.type === 'text' && !l.locked)
    if (!targets.length) return notify('Chagua maandishi kwanza.')
    const target = !targets.some((l) => l[flag])
    return tryOp((d) => targets.reduce((acc, l) => updateLayer(acc, l.id, { [flag]: target }), d), `style:${flag}`)
  }

  // Orodha ya maandishi: bofya tena aina ile ile kuiondoa.
  function setTextList(kind) {
    const targets = selLayers.filter((l) => l.type === 'text' && !l.locked)
    if (!targets.length) return notify('Chagua maandishi kwanza.')
    const target = targets.some((l) => l.list === kind) ? 'none' : kind
    return tryOp((d) => targets.reduce((acc, l) => updateLayer(acc, l.id, { list: target }), d), 'style:list')
  }

  // Mpangilio wa tabaka. Kwa vingi: front/back zinahifadhi mpangilio wa jamaa wa vilivyochaguliwa.
  function orderSel(op) {
    const ids = selLayers.filter((l) => !l.locked).map((l) => l.id)
    if (!ids.length) return undefined
    if (ids.length === 1) return tryOp((d) => moveLayer(d, ids[0], op))
    const idx = (id) => hist.present.layers.findIndex((l) => l.id === id)
    const asc = [...ids].sort((a, b) => idx(a) - idx(b))
    const desc = [...asc].reverse()
    const seq = op === 'front' || op === 'backward' ? asc : desc
    return tryOp((d) => seq.reduce((acc, id) => moveLayer(acc, id, op), d))
  }

  function nudgeSel(dx, dy) {
    const targets = selLayers.filter((l) => !l.locked).map((l) => l.id)
    if (!targets.length) return
    tryOp((d) => targets.reduce((acc, id) => {
      const l = findLayer(acc, id)
      return l ? updateLayer(acc, id, { x: l.x + dx, y: l.y + dy }) : acc
    }, d), 'nudge')
  }

  function selectAllVisible() {
    setSelIds(hist.present.layers.filter((l) => !l.hidden).map((l) => l.id))
  }

  // Clipboard ya mhariri: nakala safi (bila id). Bandika linaweka vipya juu, kidogo vimehamishwa.
  function copySel() {
    if (!selLayers.length) return notify('Chagua kipengele kwanza.')
    const payload = copyLayers(hist.present, selIds)
    setClip(payload)
    return notify(`Imenakiliwa: ${payload.length} ${payload.length === 1 ? 'kipengele' : 'vipengele'}. Bandika kwa Ctrl+V.`)
  }

  function pasteClip() {
    if (!clip.length) return notify('Clipboard ni tupu. Nakili kipengele kwanza (Ctrl+C).')
    try {
      const r = pasteLayers(hist.present, clip)
      commitNext(r.doc)
      setSelIds(r.ids)
    } catch (err) {
      notify(err?.message || 'Kubandika hakukufanikiwa.')
    }
    return undefined
  }

  // ── Picha: kifaa, Media, na kuweka kwenye turubai ──────────
  function requestImage(purpose) {
    if (purpose === 'replace-media' || purpose === 'background-media') {
      setMediaPurpose(purpose === 'replace-media' ? 'replace' : 'background')
      openFlyout('media')
      return
    }
    filePurpose.current = purpose
    fileRef.current?.click()
  }

  async function onFilePicked(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const purpose = filePurpose.current
    try {
      const src = await readImageFile(file)
      const natural = await loadNatural(src)
      placeImage(src, natural, purpose)
    } catch (err) {
      notify(err?.message || 'Picha haikupakiwa.')
    }
  }

  function placeImage(src, natural, purpose) {
    const d = hist.present
    if (purpose === 'background') {
      // Uwazi wa mandhari unabaki unapobadilisha picha; ukungu unarudi 0 kwa picha mpya.
      tryOp((x) => setBackground(x, { type: 'image', src, opacity: x.background?.opacity ?? 1 }))
      return
    }
    if (purpose === 'replace' && selected?.type === 'image') {
      const ratio = natural.width / natural.height
      tryOp((x) => updateLayer(x, selected.id, {
        src, naturalW: natural.width, naturalH: natural.height,
        crop: { x: 0, y: 0, w: 1, h: 1 },
        h: Math.max(8, Math.round(selected.w / ratio)),
      }))
      return
    }
    const layer = makeImage(src, natural, d)
    if (tryOp((x) => addLayer(x, layer).doc)) select(layer.id)
  }

  function onPickMedia({ url }, setErr) {
    loadNatural(url)
      .then((natural) => {
        setErr?.('')
        placeImage(url, natural, mediaPurpose)
        setFlyout(null)
      })
      .catch(() => setErr?.('Picha hii haikupakiwa. Jaribu nyingine au pakia kutoka kifaa.'))
  }

  // ── Zana ───────────────────────────────────────────────────
  // Kategoria kwenye rail: inafungua drawer yake. Bofya kategoria iliyo wazi tena kuifunga.
  function pickRail(groupId) {
    if (libOpen && railGroup === groupId) { setLibOpen(false); return }
    setRailGroup(groupId)
    setLibOpen(true)
  }

  function openFlyout(id) {
    setFlyout(id)
    if (isMobile) setMobileView('tools')
  }

  function toggleFlyout(kind) {
    if (flyout === kind) return setFlyout(null)
    return openFlyout(kind)
  }

  // Zana zote za rejista zinapitia hapa. Zana iliyozimwa inaeleza sababu; zana ya ready bila kitendo ina lebo tu.
  function runTool(tool, state) {
    // Kwenye simu, zana iliyopangwa au inayohitaji huduma/premium inafungua paneli ya kundi lake (Back iko juu).
    if (!state.enabled && isMobile && plannedGroupSummary(tool.group)) return openMobileFocus(tool.group)
    if (!state.enabled) return notify(state.reason || 'Zana hii haipatikani kwa sasa.')
    setPrefs(pushRecent(prefs, tool.id))
    if (!tool.action) return notify(tool.where ? `Utaipata: ${tool.where}` : tool.label)
    switch (tool.action) {
      case 'sel.all': return selectAllVisible()
      case 'sel.clear': return select(null)
      case 'obj.copy': return copySel()
      case 'obj.paste': return pasteClip()
      case 'obj.duplicate': return duplicateSel()
      case 'obj.delete': return deleteSel()
      case 'obj.lock': return toggleLockSel()
      case 'obj.hide': return toggleHideSel()
      case 'obj.flipX': return flipSel('flipX')
      case 'obj.flipY': return flipSel('flipY')
      case 'align.centerX': return alignSel('centerX')
      case 'align.centerY': return alignSel('centerY')
      case 'distribute.x': return distributeSel('x')
      case 'view.snap':
        setSnapOn((v) => !v)
        return notify(snapOn ? 'Snap imezimwa.' : 'Snap imewashwa.')
      case 'view.zoomIn': return setZoom((z) => clampZoom(z * 1.25))
      case 'view.zoomOut': return setZoom((z) => clampZoom(z / 1.25))
      case 'view.fit': return setZoom(1)
      case 'edit.undo': return undo()
      case 'edit.redo': return redo()
      case 'text.add': return addText()
      case 'text.edit': return selectedText ? setEditingId(selected.id) : notify('Chagua maandishi kwanza.')
      case 'text.toggleBold': return toggleTextStyle('bold')
      case 'text.toggleItalic': return toggleTextStyle('italic')
      case 'text.toggleUnderline': return toggleTextStyle('underline')
      case 'text.toggleStrike': return toggleTextStyle('strike')
      case 'text.listBullet': return setTextList('bullet')
      case 'text.listNumber': return setTextList('number')
      case 'bg.open':
        select(null)
        return isMobile ? (setMobileFocus(null), setMobileView('props')) : undefined
      // Makundi G na H yana paneli yake. Kwenye desktop iko kwenye rail; kwenye simu inafungua sheet
      // ya Sifa ikiwa na paneli hiyo.
      case 'color.hex':
      case 'color.recent':
      case 'color.rgb':
      case 'style.reuse': return openMobileFocus('G')
      case 'fx.presets':
      case 'fx.clear': return openMobileFocus('H')
      case 'bg.image': return requestImage('background')
      case 'image.upload': return requestImage('add')
      case 'image.replace': return requestImage('replace')
      case 'shapes.open': return toggleFlyout('shapes')
      case 'templates.open': return toggleFlyout('templates')
      case 'media.open': return toggleFlyout('media')
      case 'layers.open': return isMobile ? setMobileView('layers') : setBottomOpen(true)
      case 'order.forward': return orderSel('forward')
      case 'order.backward': return orderSel('backward')
      case 'order.front': return orderSel('front')
      case 'order.back': return orderSel('back')
      case 'publish.open':
        return canPublish ? setDialog({ kind: 'publish', caption: '', status: 'idle', error: '' }) : notify(publishReason)
      case 'file.save': return save()
      case 'file.preview': return openPreview()
      // Kundi P lina paneli yake: umbizo, ukubwa, ubora, hakiki, kipimo, hamisha.
      case 'export.panel': return isMobile ? openMobileFocus('P') : (setRailGroup('P'), setLibOpen(true))
      case 'export.png': return exportFile('png')
      case 'export.pngTransparent': return exportFile('png', { transparent: true })
      case 'export.jpeg': return exportFile('jpeg')
      case 'export.webp': return exportFile('webp')
      default: return notify('Kitendo hiki bado hakijaunganishwa.')
    }
  }

  // ── Hifadhi / recovery ─────────────────────────────────────
  const save = useCallback(() => {
    if (busyRef.current) return false
    busyRef.current = true
    setBusy('save')
    setSaveState({ tone: 'busy', text: 'Inahifadhi…' })
    try {
      const current = hist.present
      const { record, warnings } = saveProject(userId, { id: projectId, revision, doc: current, title: current.title })
      setProjectId(record.id)
      setRevision(record.revision)
      setSavedDoc(current)
      clearRecovery(userId)
      setSaveState({ tone: 'ok', text: `Imehifadhiwa · toleo ${record.revision}` })
      if (warnings.length) notify(warnings.join(' '))
      onSaved?.(record)
      return true
    } catch (err) {
      setSaveState({ tone: 'error', text: saveErrorText(err) })
      return false
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }, [userId, projectId, revision, hist.present, onSaved])

  // Recovery: mabadiliko ambayo hayajahifadhiwa yanaandikwa kila baada ya sekunde 1.5.
  useEffect(() => {
    if (!dirty) return undefined
    const t = setTimeout(() => {
      try { writeRecovery(userId, { projectId, doc: hist.present }) } catch { /* kifaa kimejaa: hakuna recovery */ }
    }, 1500)
    return () => clearTimeout(t)
  }, [hist.present, dirty, projectId, userId])

  // Tahadhari ya kufunga kichupo wakati kuna mabadiliko yasiyohifadhiwa.
  useEffect(() => {
    if (!dirty) return undefined
    const onBefore = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBefore)
    return () => window.removeEventListener('beforeunload', onBefore)
  }, [dirty])

  function restoreRecovery() {
    if (!recovery) return
    try {
      const { doc: rdoc } = sanitizeDocument(recovery.doc)
      commitNext(rdoc, null)
      notify('Mabadiliko yaliyohifadhiwa kwa dharura yamerejeshwa.')
    } catch (err) {
      notify(`Recovery haikufanikiwa: ${err?.message || 'data si sahihi'}`)
    }
    setRecovery(null)
  }

  function discardRecovery() {
    clearRecovery(userId)
    setRecovery(null)
  }

  function requestExit() {
    if (dirty) setDialog({ kind: 'exit' })
    else onExit()
  }

  // ── Export, hakiki, chapisha ───────────────────────────────
  // quality ni 50–100 (asilimia) kutoka kwenye paneli; exportImage inataka 0–1. Haitumiki kwa PNG.
  async function renderCurrent(format = 'png', { transparent = false, scale = 1, quality } = {}) {
    setProgress({ done: 0, total: 0 })
    return exportImage(hist.present, {
      format,
      transparent,
      scale,
      quality: quality == null ? undefined : quality / 100,
      loadImage: defaultLoadImage,
      onProgress: (p) => setProgress({ done: p.done, total: p.total }),
    })
  }

  async function exportFile(format = 'png', { transparent = false, scale = 1, quality } = {}) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy('export')
    try {
      const { blob, width, height, warnings, ext } = await renderCurrent(format, { transparent, scale, quality })
      const suffix = `${transparent ? '-bila-mandhari' : ''}${scale === 2 ? '-2x' : ''}`
      downloadBlob(blob, `${slugify(hist.present.title)}${suffix}.${ext}`)
      notify(`${EXPORT_FORMATS[format].label} imehifadhiwa (${width}×${height}).${warnings.length ? ' ' + warnings.join(' ') : ''}`)
    } catch (err) {
      notify(`Export imeshindikana: ${err?.message || 'hitilafu'}`)
    } finally {
      busyRef.current = false
      setBusy(null)
      setProgress(null)
    }
  }

  // Kipimo halisi: inasimba picha kwa mipangilio ile ile ya export, kisha inarudisha ukubwa wa faili.
  // Picha haihifadhiwi. Inakataa ikiwa kitendo kingine kinaendelea.
  async function measureExport(opts = {}) {
    if (busyRef.current) throw new Error('Subiri kitendo kingine kiishe kwanza.')
    busyRef.current = true
    setBusy('export')
    try {
      const r = await renderCurrent(opts.format ?? 'png', opts)
      return { bytes: r.blob.size, width: r.width, height: r.height, mime: r.mime, warnings: r.warnings }
    } finally {
      busyRef.current = false
      setBusy(null)
      setProgress(null)
    }
  }

  // Hakiki inatumia mipangilio ya paneli ya export; bila hoja, ni PNG ya kawaida.
  async function openPreview(opts = {}) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy('preview')
    try {
      const r = await renderCurrent(opts.format ?? 'png', opts)
      const { blob, width, height, ext } = r
      const url = URL.createObjectURL(blob)
      setDialog({ kind: 'preview', url, width, height, name: `${slugify(hist.present.title)}.${ext}` })
    } catch (err) {
      notify(`Hakiki imeshindikana: ${err?.message || 'hitilafu'}`)
    } finally {
      busyRef.current = false
      setBusy(null)
      setProgress(null)
    }
  }

  function closeDialog() {
    if (dialog?.kind === 'preview' && dialog.url) URL.revokeObjectURL(dialog.url)
    setDialog(null)
  }

  async function publish(caption) {
    if (busyRef.current || !canPublish) return
    busyRef.current = true
    setBusy('publish')
    setDialog((d) => ({ ...d, status: 'working', error: '' }))
    try {
      const { blob } = await renderCurrent()
      const file = new File([blob], `${slugify(hist.present.title)}.png`, { type: 'image/png' })
      const post = await feedService.createPost({ kind: 'photo', text: caption.trim(), file })
      const outcome = publishOutcome(post, { live: isSupabaseLive })
      if (outcome.status === 'failed') throw new Error(publishMessage(outcome))
      setDialog((d) => ({ ...d, status: 'done', message: publishMessage(outcome) }))
      onFeedChanged?.(post)
    } catch (err) {
      setDialog((d) => ({ ...d, status: 'error', error: postMediaErrorMessage(err) || err?.message || 'Chapisho halijahifadhiwa.' }))
    } finally {
      busyRef.current = false
      setBusy(null)
      setProgress(null)
    }
  }

  // ── Kibodi ─────────────────────────────────────────────────
  const keyRef = useRef(null)
  keyRef.current = (e) => {
    const tag = e.target?.tagName
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable
    if (dialog) return
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    if (mod && k === 's') { e.preventDefault(); return save() }
    if (mod && k === 'k') {
      e.preventDefault()
      setLibOpen(true)
      setRailGroup(null)
      if (isMobile) { setMobileGroup(null); setMobileView('tools') }
      searchRef.current?.focus()
      return undefined
    }
    if (typing) return
    if (mod) {
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); return undo() }
      if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); return redo() }
      if (k === 'a') { e.preventDefault(); return selectAllVisible() }
      if (k === 'c') { e.preventDefault(); return copySel() }
      if (k === 'v') { e.preventDefault(); return pasteClip() }
      if (k === 'd') { e.preventDefault(); return duplicateSel() }
      if (k === 'l') { e.preventDefault(); return toggleLockSel() }
      if (k === 'h' && e.shiftKey) { e.preventDefault(); return toggleHideSel() }
      if (k === 'b') { e.preventDefault(); return toggleTextStyle('bold') }
      if (k === 'i') { e.preventDefault(); return toggleTextStyle('italic') }
      if (k === '=' || k === '+') { e.preventDefault(); return setZoom((z) => clampZoom(z * 1.25)) }
      if (k === '-') { e.preventDefault(); return setZoom((z) => clampZoom(z / 1.25)) }
      if (k === '0') { e.preventDefault(); return setZoom(1) }
      if (k === ']') { e.preventDefault(); return orderSel('front') }
      if (k === '[') { e.preventDefault(); return orderSel('back') }
      return undefined
    }
    if (e.key === 'Escape') {
      if (editingId) return setEditingId(null)
      if (flyout) return setFlyout(null)
      if (selIds.length) return select(null)
      return undefined
    }
    if (e.key === '?') return setDialog({ kind: 'shortcuts' })
    if (e.altKey) return undefined
    if (k === 't' && !e.shiftKey) { e.preventDefault(); return addText() }
    if (k === 'i') { e.preventDefault(); return requestImage('add') }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selIds.length) { e.preventDefault(); deleteSel() }
      return undefined
    }
    if (e.key === 'Enter' && selectedText) { e.preventDefault(); return setEditingId(selected.id) }
    const step = e.shiftKey ? 10 : 1
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (moves[e.key]) {
      if (!selIds.length) return undefined
      e.preventDefault()
      return nudgeSel(...moves[e.key])
    }
    if (e.key === ']') return orderSel('forward')
    if (e.key === '[') return orderSel('backward')
    return undefined
  }

  useEffect(() => {
    const onKey = (e) => keyRef.current?.(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Mionekano ──────────────────────────────────────────────
  const statusLine = saveState.tone === 'busy' ? saveState.text
    : saveState.tone === 'error' ? saveState.text
      : dirty ? (projectId ? 'Mabadiliko hayajahifadhiwa' : 'Mradi mpya · haujahifadhiwa')
        : saveState.text || (projectId ? 'Imehifadhiwa' : 'Mradi mpya')

  const busyLabel = busy === 'export' || busy === 'preview' || busy === 'publish'
    ? (progress?.total ? `Inatengeneza… ${progress.done}/${progress.total}` : 'Inatengeneza…') : ''

  return (
    <div
      className={`cve-root${isMobile ? ' is-mobile' : ''}`}
      data-view={isMobile ? mobileView : 'desktop'}
      data-testid="creative-editor"
    >
      <input ref={fileRef} type="file" accept={POST_IMAGE_ACCEPT} className="cve-sr-file" onChange={onFilePicked} aria-label="Chagua picha" />

      <header className="cve-top">
        <div className="cve-top__left">
          <Btn icon="back" onClick={requestExit} aria-label="Rudi kwenye Studio" title="Rudi kwenye Studio">
            <span className="cve-hide-sm">Studio</span>
          </Btn>
          <input
            className="cve-title"
            aria-label="Jina la mradi"
            maxLength={MAX_TITLE_LENGTH}
            value={titleDraft ?? doc.title}
            onFocus={() => setTitleDraft(doc.title)}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              if (titleDraft !== null && titleDraft.trim() !== doc.title) tryOp((d) => setTitle(d, titleDraft))
              setTitleDraft(null)
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          />
        </div>

        <div className="cve-top__mid" role="group" aria-label="Historia">
          <Btn icon="undo" onClick={undo} disabled={!canUndo(hist)} aria-label="Rudisha (Undo)" title="Undo (Ctrl+Z)" />
          <Btn icon="redo" onClick={redo} disabled={!canRedo(hist)} aria-label="Rudia (Redo)" title="Redo (Ctrl+Y)" />
        </div>

        <div className="cve-top__right">
          <span className={`cve-status cve-status--${saveState.tone === 'error' ? 'error' : dirty ? 'dirty' : 'ok'}`} role="status" aria-live="polite">
            {statusLine}
          </span>
          <Btn icon="save" onClick={save} disabled={busy !== null} aria-label="Hifadhi" title="Hifadhi (Ctrl+S)">
            <span className="cve-hide-xs">Hifadhi</span>
          </Btn>
          <Btn icon="preview" onClick={() => openPreview()} disabled={busy !== null} aria-label="Hakiki" title="Hakiki">
            <span className="cve-hide-sm">Hakiki</span>
          </Btn>
          <span className="cve-desk-only cve-exportwrap">
            <Btn icon="download" onClick={() => setExportOpen((o) => !o)} disabled={busy !== null} aria-label="Hamisha" aria-haspopup="menu" aria-expanded={exportOpen} title="Hamisha: PNG, PNG bila mandhari, JPEG, WebP">Hamisha</Btn>
            {exportOpen ? (
              <div className="cve-menu cve-menu--export" role="menu" onMouseLeave={() => setExportOpen(false)} onKeyDown={(e) => { if (e.key === 'Escape') setExportOpen(false) }}>
                {EXPORT_TOOLS.map((t) => (
                  <button key={t.id} type="button" role="menuitem" onClick={() => { setExportOpen(false); runTool(t, toolState(t, selCtx)) }}>{t.label}</button>
                ))}
              </div>
            ) : null}
            <Btn
              variant="primary"
              icon="send"
              onClick={() => setDialog({ kind: 'publish', caption: '', status: 'idle', error: '' })}
              disabled={!canPublish || busy !== null}
              aria-describedby={publishReason ? 'cve-publish-reason' : undefined}
              title={publishReason || 'Chapisha kwenye PASIHAI'}
            >
              Chapisha
            </Btn>
          </span>
          <div className="cve-more">
            <Btn icon="more" onClick={() => setMoreOpen((o) => !o)} aria-label="Chaguo zaidi" aria-expanded={moreOpen} aria-haspopup="menu" />
            {moreOpen ? (
              <div className="cve-menu" role="menu" onMouseLeave={() => setMoreOpen(false)}>
                {EXPORT_TOOLS.map((t) => (
                  <button key={t.id} type="button" role="menuitem" onClick={() => { setMoreOpen(false); runTool(t, toolState(t, selCtx)) }}>{t.label}</button>
                ))}
                <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); setDialog({ kind: 'shortcuts' }) }}>Njia za mkato</button>
                <button type="button" role="menuitem" disabled={!canPublish} onClick={() => { setMoreOpen(false); setDialog({ kind: 'publish', caption: '', status: 'idle', error: '' }) }}>Chapisha kwenye PASIHAI</button>
                <button type="button" role="menuitem" disabled={!dirty || !projectId} onClick={() => { setMoreOpen(false); setDialog({ kind: 'revert' }) }}>Rudisha toleo lililohifadhiwa</button>
                <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); setDialog({ kind: 'clear' }) }}>Futa vipengele vyote</button>
                {projectId ? <button type="button" role="menuitem" className="is-danger" onClick={() => { setMoreOpen(false); setDialog({ kind: 'delete' }) }}>Futa mradi</button> : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {recovery ? (
        <div className="cve-banner" role="alert">
          <span>Kuna mabadiliko ambayo hayajahifadhiwa ya «{recovery.doc?.title ?? 'Mradi'}». Yanaweza kurejeshwa.</span>
          <span className="cve-banner__acts">
            <Btn variant="primary" onClick={restoreRecovery}>Rejesha</Btn>
            <Btn onClick={discardRecovery}>Tupa</Btn>
          </span>
        </div>
      ) : null}

      <div className="cve-body">
        {!isMobile ? <EditorRail activeGroup={railGroup} drawerOpen={libOpen} onPick={pickRail} /> : null}
        {(!isMobile && libOpen) || isMobile ? (
          <ToolLibrary
            onlyGroup={isMobile ? mobileGroup : railGroup}
            sheet={isMobile}
            prefs={prefs}
            onPrefs={setPrefs}
            ctx={selCtx}
            query={libQuery}
            onQuery={setLibQuery}
            onRun={runTool}
            onShortcuts={() => setDialog({ kind: 'shortcuts' })}
            activeFlyout={flyout ? { kind: flyout } : null}
            searchRef={searchRef}
            onClose={isMobile ? undefined : () => setLibOpen(false)}
          />
        ) : null}

        {flyout ? (
          <ToolFlyout
            kind={flyout}
            mobile={isMobile}
            onClose={() => setFlyout(null)}
            onAddShape={addShape}
            onApplyTemplate={applyTpl}
            onPickMedia={onPickMedia}
          />
        ) : null}

        <main className="cve-main" aria-label="Turubai">
          <div className="cve-stagebar">
            {!isMobile && !libOpen ? (
              <button type="button" className="cve-linkbtn" onClick={() => setLibOpen(true)} aria-label="Onyesha maktaba ya zana">
                <Icon name="sidebar" size={15} />
                <span>Zana</span>
              </button>
            ) : null}
            <span className="cve-stagebar__mode">
              {mode.label}
              <span className="cve-muted"> · {doc.width}×{doc.height} px</span>
              {mode.status === 'partial' ? <span className="cve-chip cve-chip--warn" title={mode.note}>Sehemu</span> : null}
            </span>
            <span className="cve-zoom" role="group" aria-label="Kuza">
              <Btn icon="minus" aria-label="Punguza" onClick={() => setZoom((z) => clampZoom(z / 1.25))} />
              <button type="button" className="cve-btn cve-btn--ghost cve-zoom__val" onClick={() => setZoom(1)} aria-label="Sawazisha ukubwa">
                {Math.round(scale * 100)}%
              </button>
              <Btn icon="plus" aria-label="Kuza ndani" onClick={() => setZoom((z) => clampZoom(z * 1.25))} />
            </span>
          </div>

          <div
            ref={viewportRef}
            className="cve-viewport"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget || e.target.classList?.contains('cve-page')) { setSelIds([]); setEditingId(null) }
            }}
          >
            <CanvasStage
              doc={doc}
              selectedIds={selIds}
              editingId={editingId}
              scale={scale}
              guides={guides}
              snap={snapOn}
              onSelect={select}
              onEditText={setEditingId}
              onLive={setLive}
              onCommit={commitNext}
              onGuides={setGuides}
            />
          </div>

          {isMobile && selIds.length ? (
            <div className="cve-mselbar" role="toolbar" aria-label="Vipengele vilivyochaguliwa">
              <span className="cve-mselbar__name">{selIds.length > 1 ? `${selIds.length} vimechaguliwa` : selected?.name}</span>
              <Btn onClick={() => { setMobileFocus(null); setMobileView('props') }}>Sifa</Btn>
              <Btn onClick={duplicateSel} icon="copy" aria-label="Nakili" />
              <Btn variant="danger" onClick={deleteSel} icon="trash" aria-label="Futa" />
            </div>
          ) : null}
        </main>

        <aside className="cve-props" aria-label="Sifa">
          {isMobile ? (
            <div className="cve-mback">
              <Btn icon="back" onClick={() => { setMobileFocus(null); setMobileView('canvas') }}>Rudi kwenye uwanja</Btn>
            </div>
          ) : null}
          <PropertiesPanel
            doc={doc}
            exportApi={{ preview: openPreview, exportWith: (o) => exportFile(o.format, o), measure: measureExport }}
            selectedIds={selIds}
            focus={isMobile ? (mobileView === 'props' ? mobileFocus : null) : (libOpen && railGroup ? railGroup : null)}
            onPatch={patchSel}
            onBackground={onBackground}
            onRequestImage={requestImage}
            onAction={(action, arg) => {
              if (action === 'align') return alignSel(arg)
              if (action === 'distribute') return distributeSel(arg)
              if (action === 'duplicate') return duplicateSel()
              if (action === 'delete') return deleteSel()
              if (action === 'lock') return setFlagSel('locked', arg)
              if (action === 'hide') return setFlagSel('hidden', arg)
              if (action === 'flip') return flipSel(arg)
              if (action === 'toggle') return selectedId ? layerAction('toggle', selectedId, arg) : undefined
              if (action === 'order') return orderSel(arg)
              return undefined
            }}
          />
        </aside>
      </div>

      <section className={`cve-bottom${bottomOpen ? '' : ' is-closed'}`} aria-label="Tabaka">
        <div className="cve-bottom__head">
          <button type="button" className="cve-linkbtn" aria-expanded={bottomOpen} onClick={() => setBottomOpen((o) => !o)}>
            <Icon name="layers" size={16} />
            <span>Tabaka ({doc.layers.length})</span>
            <Icon name={bottomOpen ? 'down' : 'up'} size={14} />
          </button>
          <div className="cve-tabs" role="tablist" aria-label="Sehemu za chini">
            {bottomTabsFor(doc.mode).map((tab) => (
              tab.status === 'ready' ? (
                <button key={tab.id} type="button" role="tab" aria-selected="true" className="cve-tab is-on">{tab.label}</button>
              ) : (
                <button key={tab.id} type="button" role="tab" aria-selected="false" className="cve-tab" disabled title={tab.note}>
                  {tab.label} <span className="cve-lib__badge cve-lib__badge--planned">Mpango</span>
                </button>
              )
            ))}
          </div>
        </div>
        {bottomOpen || isMobile ? (
          <div className="cve-bottom__body">
            <LayerList
              doc={doc}
              selectedIds={selIds}
              onSelect={select}
              onAction={layerAction}
              variant={isMobile ? 'list' : 'row'}
            />
          </div>
        ) : null}
      </section>

      <nav className="cve-mnav" aria-label="Urambazaji wa mhariri">
        {MOBILE_EDITOR_TABS.map((tab) => {
          const on = tab.id === 'select'
            ? mobileView === 'canvas'
            : mobileView === 'tools' && (tab.group ? mobileGroup === tab.group : mobileGroup === null)
          return (
            <button
              key={tab.id}
              type="button"
              className={`cve-mnav__btn${on ? ' is-on' : ''}`}
              aria-current={on ? 'page' : undefined}
              onClick={() => {
                if (tab.id === 'select') { setMobileGroup(null); setMobileView('canvas'); return }
                setMobileGroup(tab.group ?? null)
                setMobileView('tools')
                if (tab.id === 'more') searchRef.current?.focus()
              }}
            >
              <Icon name={tab.icon} size={20} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {busyLabel ? <div className="cve-busy" role="status">{busyLabel}</div> : null}
      <div className="cve-toast" role="status" aria-live="polite">{toast}</div>

      {dialog ? (
        <Dialog
          dialog={dialog}
          onClose={closeDialog}
          onExitNow={() => { setDialog(null); onExit() }}
          onSaveAndExit={() => { if (save()) { setDialog(null); onExit() } else setDialog(null) }}
          onRevert={() => { setHist((h) => commitHistory(h, savedDoc, null)); setLive(null); setDialog(null) }}
          onClear={() => { tryOp((d) => ({ ...d, layers: [] })); setSelIds([]); setDialog(null) }}
          onDelete={() => {
            if (projectId) { try { removeProject(userId, projectId) } catch { /* kifaa hakiruhusu: mradi unabaki */ } }
            setDialog(null)
            onExit()
          }}
          onPublish={publish}
          canPublish={canPublish}
          reason={publishReason}
          progress={progress}
        />
      ) : null}
    </div>
  )
}

// ── Dialog ya uthibitisho / hakiki / chapisho ─────────────────
function Dialog({ dialog, onClose, onExitNow, onSaveAndExit, onRevert, onClear, onDelete, onPublish, canPublish, reason, progress }) {
  const [caption, setCaption] = useState(dialog.caption ?? '')
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape' && dialog.status !== 'working') onClose() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [dialog.status, onClose])

  const title = {
    exit: 'Mabadiliko hayajahifadhiwa',
    preview: 'Hakiki',
    publish: 'Chapisha kwenye PASIHAI',
    revert: 'Rudisha toleo lililohifadhiwa?',
    clear: 'Futa vipengele vyote?',
    delete: 'Futa mradi huu?',
    shortcuts: 'Njia za mkato',
  }[dialog.kind]

  return (
    <div className="cve-modal" role="presentation" onPointerDown={(e) => { if (e.target === e.currentTarget && dialog.status !== 'working') onClose() }}>
      <div className="cve-dialog" role="dialog" aria-modal="true" aria-labelledby="cve-dialog-title">
        <header className="cve-dialog__head">
          <h2 id="cve-dialog-title">{title}</h2>
          <button type="button" className="cve-iconbtn" aria-label="Funga" onClick={onClose} disabled={dialog.status === 'working'}><Icon name="close" size={16} /></button>
        </header>

        {dialog.kind === 'shortcuts' ? <ShortcutList /> : null}

        {dialog.kind === 'exit' ? (
          <>
            <p>Hifadhi mabadiliko kabla ya kutoka, au toka bila kuhifadhi.</p>
            <div className="cve-dialog__acts">
              <Btn variant="primary" autoFocus onClick={onSaveAndExit}>Hifadhi na utoke</Btn>
              <Btn variant="danger" onClick={onExitNow}>Toka bila kuhifadhi</Btn>
              <Btn onClick={onClose}>Endelea kuhariri</Btn>
            </div>
          </>
        ) : null}

        {dialog.kind === 'preview' ? (
          <>
            <div className="cve-preview">
              <img src={dialog.url} alt="Hakiki ya muundo" width={dialog.width} height={dialog.height} />
            </div>
            <p className="cve-hint">{dialog.width} × {dialog.height} px · PNG</p>
            <div className="cve-dialog__acts">
              <a className="cve-btn cve-btn--primary" href={dialog.url} download={dialog.name}><Icon name="download" /><span>Pakua PNG</span></a>
              <Btn onClick={onClose}>Funga</Btn>
            </div>
          </>
        ) : null}

        {dialog.kind === 'publish' ? (
          <>
            {dialog.status === 'done' ? (
              <>
                <p role="status">{dialog.message}</p>
                <div className="cve-dialog__acts"><Btn variant="primary" onClick={onClose}>Sawa</Btn></div>
              </>
            ) : (
              <>
                {!canPublish ? <p className="cve-error" id="cve-publish-reason">{reason}</p> : null}
                <label className="cve-field">
                  <span className="cve-field__label"><span>Maelezo (si lazima)</span><em className="cve-muted">{caption.length}/500</em></span>
                  <textarea className="cve-input cve-textarea" rows={3} maxLength={500} value={caption} onChange={(e) => setCaption(e.target.value)} disabled={dialog.status === 'working' || !canPublish} />
                </label>
                <p className="cve-hint">Turubai litahifadhiwa kama picha ya PNG na kutumwa kwenye feed kupitia workflow ya kuchapisha ya PASIHAI.</p>
                {dialog.status === 'working' ? <p role="status">{progress?.total ? `Inatengeneza picha… ${progress.done}/${progress.total}` : 'Inachapisha…'}</p> : null}
                {dialog.status === 'error' ? <p className="cve-error" role="alert">{dialog.error}</p> : null}
                <div className="cve-dialog__acts">
                  <Btn variant="primary" onClick={() => onPublish(caption)} disabled={!canPublish || dialog.status === 'working'}>Chapisha</Btn>
                  <Btn onClick={onClose} disabled={dialog.status === 'working'}>Ghairi</Btn>
                </div>
              </>
            )}
          </>
        ) : null}

        {dialog.kind === 'revert' ? (
          <>
            <p>Mabadiliko yote tangu hifadhi ya mwisho yatapotea. Unaweza kurudia kwa Undo kabla ya kuhifadhi.</p>
            <div className="cve-dialog__acts"><Btn variant="danger" onClick={onRevert}>Rudisha</Btn><Btn onClick={onClose}>Ghairi</Btn></div>
          </>
        ) : null}

        {dialog.kind === 'clear' ? (
          <>
            <p>Vipengele vyote kwenye turubai vitafutwa. Unaweza kurudia kwa Undo.</p>
            <div className="cve-dialog__acts"><Btn variant="danger" onClick={onClear}>Futa vyote</Btn><Btn onClick={onClose}>Ghairi</Btn></div>
          </>
        ) : null}

        {dialog.kind === 'delete' ? (
          <>
            <p>Mradi uliohifadhiwa kwenye kifaa hiki utafutwa kabisa. Picha ya PNG uliyoichapisha haitaathirika.</p>
            <div className="cve-dialog__acts"><Btn variant="danger" onClick={onDelete}>Futa mradi</Btn><Btn onClick={onClose}>Ghairi</Btn></div>
          </>
        ) : null}
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────
function useIsMobile() {
  const get = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(MOBILE_QUERY).matches)
  const [mobile, setMobile] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia?.(MOBILE_QUERY)
    if (!mq) return undefined
    const on = () => setMobile(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return mobile
}

function offerRecovery(userId, initial) {
  try {
    const r = readRecovery(userId)
    if (!r) return null
    if ((r.projectId ?? null) !== (initial.projectId ?? null)) return null
    if (JSON.stringify(r.doc) === JSON.stringify(initial.doc)) return null
    return r
  } catch {
    return null
  }
}

function saveErrorText(err) {
  if (err instanceof CreativeConflictError) return 'Hifadhi imeshindikana: mradi umebadilishwa kwenye kichupo kingine. Funga na ufungue tena.'
  if (err instanceof CreativeQuotaError) return 'Hifadhi imeshindikana: mradi ni mkubwa sana kwa kifaa hiki. Punguza picha au tumia picha ndogo.'
  return `Hifadhi imeshindikana: ${err?.message || 'hitilafu'}`
}

const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
const clampInt = (n, min, max) => Math.min(max, Math.max(min, Math.round(n)))

function slugify(s) {
  return String(s || 'muundo').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'muundo'
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      reject(new Error('Aina ya picha haikubaliki. Tumia JPG, PNG, WEBP au GIF.'))
      return
    }
    if (file.size > CANVAS_IMAGE_MAX_BYTES) {
      reject(new Error('Picha ni kubwa kuliko 1.5 MB. Punguza ukubwa wake kisha ujaribu tena.'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Faili halikusomeka.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

function loadNatural(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Picha haikufunguka.'))
    img.src = src
  })
}

// ── Orodha ya njia za mkato (inatoka kwenye rejista; zana zilizopangwa hazionyeshwi) ──
function ShortcutList() {
  const rows = TOOLS.filter((t) => t.shortcut && t.status !== 'planned')
  return (
    <>
      <p className="cve-hint">Bonyeza ? wakati wowote kuona orodha hii. Njia hazifanyi kazi unapoandika kwenye kisanduku cha maandishi.</p>
      <dl className="cve-shortcuts">
        {rows.map((t) => (
          <div key={t.id} className="cve-shortcuts__row">
            <dt><kbd>{t.shortcut}</kbd></dt>
            <dd>{t.label}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
