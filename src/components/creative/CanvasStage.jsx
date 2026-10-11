// ══════════════════════════════════════════════════════════════
// CanvasStage — turubai moja kwa modes zote.
//   Chagua · sogeza (na snap + miongozo) · badilisha ukubwa · zungusha · hariri maandishi.
//   Kila gesture inatoa `onLive` wakati wa kuburuta na `onCommit` mwishoni (hatua moja ya undo).
//   Preview hii ni ya kuona tu; export halisi inatumia creativeRender.js.
// ══════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react'
import {
  fontFor, snapPosition, updateLayer, DEFAULT_INK, angleDeg, resizeGeometry, rotationFor,
} from '../../creative/creativeModel.js'
import { shapePrimitives, imageFilterString, displayText, tintColor } from '../../creative/creativeRender.js'
import { shadowCss } from '../../creative/creativeModel.js'

const DRAG_SLOP_PX = 3
const HANDLES = [
  { id: 'nw', sx: -1, sy: -1, cursor: 'nwse-resize' },
  { id: 'ne', sx: 1, sy: -1, cursor: 'nesw-resize' },
  { id: 'se', sx: 1, sy: 1, cursor: 'nwse-resize' },
  { id: 'sw', sx: -1, sy: 1, cursor: 'nesw-resize' },
]

// Rangi yenye uwazi juu ya nyeupe (sawa na paintBackground kwenye export).
function withAlpha(hex, a) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// Picha ya mandhari inahitaji safu yake (BackgroundImageLayer) ikiwa ina ukungu au uwazi.
export function bgNeedsLayer(bg) {
  return bg?.type === 'image' && ((bg.blur ?? 0) > 0 || (bg.opacity ?? 1) < 1)
}

export function docBackgroundStyle(bg) {
  if (!bg) return { background: '#ffffff' }
  const a = bg.opacity ?? 1
  if (bg.type === 'image') {
    if (bgNeedsLayer(bg)) return { background: '#ffffff' }
    return { background: `url("${bg.src}") center / cover no-repeat` }
  }
  if (bg.type === 'gradient') {
    if (a >= 1) return { background: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})` }
    return { background: `linear-gradient(${bg.angle}deg, ${withAlpha(bg.from, a)}, ${withAlpha(bg.to, a)}), #ffffff` }
  }
  if (a >= 1) return { background: bg.color }
  return { background: `linear-gradient(${withAlpha(bg.color, a)}, ${withAlpha(bg.color, a)}), #ffffff` }
}

function BackgroundImageLayer({ bg, W, H }) {
  const b = bg.blur ?? 0
  const m = b > 0 ? b * 2 : 0
  return (
    <div
      aria-hidden="true"
      data-testid="doc-bg-image"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: bg.opacity ?? 1 }}
    >
      <div
        style={{
          position: 'absolute',
          left: -m,
          top: -m,
          width: W + 2 * m,
          height: H + 2 * m,
          background: `url(${JSON.stringify(bg.src)}) center / cover no-repeat`,
          filter: b > 0 ? `blur(${b}px)` : undefined,
        }}
      />
    </div>
  )
}

export default function CanvasStage({
  doc, selectedIds = [], editingId, scale, guides, snap = true, onSelect, onEditText, onLive, onCommit, onGuides,
}) {
  // Kipengele kimoja tu ndicho kinachopata mipini ya kubadilisha ukubwa na kuzungusha.
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const docRef = useRef(null)
  const gestureRef = useRef(null)
  // Thamani za hivi karibuni zinahitajika ndani ya event listeners za window.
  const live = useRef({})
  live.current = { doc, scale, snap, onLive, onCommit, onGuides }
  // Listeners za window lazima ziwe thabiti (stable) ili ziondolewe kwa kitu kile kile kilichoongezwa.
  const api = useRef({})
  const listeners = useRef(null)
  if (!listeners.current) {
    listeners.current = {
      move: (e) => api.current.move?.(e),
      end: () => api.current.end?.(),
    }
  }

  // Hakikisha listeners zinaondolewa mtu anapotoka kwenye ukurasa wakati wa gesture.
  useEffect(() => () => endGestureListeners(), [])

  function docPoint(e) {
    const rect = docRef.current.getBoundingClientRect()
    const s = live.current.scale || 1
    return { x: (e.clientX - rect.left) / s, y: (e.clientY - rect.top) / s }
  }

  function handleMove(e) {
    const g = gestureRef.current
    if (!g) return
    const { scale: s, onLive: setLive, onGuides: setGuides } = live.current
    const p = docPoint(e)
    const dx = p.x - g.start.x
    const dy = p.y - g.start.y
    if (!g.moved && Math.hypot(dx, dy) * s < DRAG_SLOP_PX) return
    g.moved = true

    let next = null
    if (g.type === 'move') {
      // Snap inatumia kipengele kikuu (kilichobofya); vingine vinasogea kwa delta ile ile.
      const sn = g.snap
        ? snapPosition(g.base, g.layer, g.orig.x + dx, g.orig.y + dy)
        : { x: g.orig.x + dx, y: g.orig.y + dy, guides: { v: [], h: [] } }
      setGuides(sn.guides)
      const ddx = Math.round(sn.x) - g.orig.x
      const ddy = Math.round(sn.y) - g.orig.y
      next = g.members.reduce(
        (d, m) => updateLayer(d, m.id, { x: Math.round(m.x + ddx), y: Math.round(m.y + ddy) }),
        g.base,
      )
    } else if (g.type === 'resize') {
      const geo = resizeGeometry(g.orig, g.sx, g.sy, dx, dy, g.layer.type === 'image')
      next = updateLayer(g.base, g.id, geo)
    } else if (g.type === 'rotate') {
      const rot = rotationFor(g.orig.rotation, g.startAngle, angleDeg(g.center, p))
      next = updateLayer(g.base, g.id, { rotation: rot })
    }
    if (next) {
      g.last = next
      setLive(next)
    }
  }

  function endGestureListeners() {
    window.removeEventListener('pointermove', listeners.current.move)
    window.removeEventListener('pointerup', listeners.current.end)
    window.removeEventListener('pointercancel', listeners.current.end)
  }

  function handleEnd() {
    const g = gestureRef.current
    endGestureListeners()
    gestureRef.current = null
    live.current.onGuides({ v: [], h: [] })
    if (g?.moved && g.last) live.current.onCommit(g.last, null)
    else if (g) live.current.onLive(null)
  }

  function beginGesture(e, type, layer, extra = {}) {
    if (e.button !== undefined && e.button !== 0) return
    if (editingId === layer.id) return
    e.stopPropagation()
    e.preventDefault()
    const base = live.current.doc
    const cur = base.layers.find((l) => l.id === layer.id) ?? layer
    // Wanachama wa kuhamisha: vipengele vilivyochaguliwa visivyofungwa/visivyofichwa (au kipengele kimoja).
    const memberIds = type === 'move' && extra.group ? selectedIds : [layer.id]
    const members = memberIds
      .map((id) => base.layers.find((l) => l.id === id))
      .filter((l) => l && !l.locked && !l.hidden)
      .map((l) => ({ id: l.id, x: l.x, y: l.y }))
    gestureRef.current = {
      type, id: layer.id, layer: cur, base,
      orig: { x: cur.x, y: cur.y, w: cur.w, h: cur.h, rotation: cur.rotation || 0 },
      start: docPoint(e), moved: false, last: null, snap: live.current.snap, members, ...extra,
    }
    window.addEventListener('pointermove', listeners.current.move)
    window.addEventListener('pointerup', listeners.current.end)
    window.addEventListener('pointercancel', listeners.current.end)
  }

  // Layer iliyochaguliwa inapata uteuzi kabla ya kuburuta.
  function onLayerDown(e, layer) {
    // Shift/Ctrl/Cmd + bofya: ongeza au ondoa kwenye uteuzi bila kuanza kuburuta.
    if (e.shiftKey || e.ctrlKey || e.metaKey) { e.stopPropagation(); onSelect(layer.id, true); return }
    if (layer.locked) { onSelect(layer.id); e.stopPropagation(); return }
    // Kipengele ndani ya uteuzi wa vingi: buruta vyote pamoja, bila kupoteza uteuzi.
    const inGroup = selectedIds.length > 1 && selectedIds.includes(layer.id)
    if (!inGroup) onSelect(layer.id)
    beginGesture(e, 'move', layer, { group: inGroup })
  }

  function onHandleDown(e, layer, h) {
    beginGesture(e, 'resize', layer, { sx: h.sx, sy: h.sy })
  }

  function onRotateDown(e, layer) {
    const cx = layer.x + layer.w / 2
    const cy = layer.y + layer.h / 2
    const p = docPoint(e)
    beginGesture(e, 'rotate', layer, {
      center: { x: cx, y: cy },
      startAngle: angleDeg({ x: cx, y: cy }, p),
    })
  }

  api.current = { move: handleMove, end: handleEnd }

  const k = 1 / scale
  const W = doc.width
  const H = doc.height
  const selected = selectedId ? doc.layers.find((l) => l.id === selectedId) ?? null : null

  return (
    <div className="cve-page" style={{ width: W * scale, height: H * scale }}>
      <div
        ref={docRef}
        className="cve-doc"
        data-testid="creative-doc"
        role="application"
        aria-label={`Turubai: ${doc.title}, ${W} kwa ${H}`}
        style={{ width: W, height: H, transform: `scale(${scale})`, '--k': k, ...docBackgroundStyle(doc.background) }}
        onPointerDown={(e) => {
          if (e.target === docRef.current) { onSelect(null); onEditText(null) }
        }}
      >
        {bgNeedsLayer(doc.background) ? <BackgroundImageLayer bg={doc.background} W={W} H={H} /> : null}
        {doc.layers.map((layer, index) => {
          if (layer.hidden) return null
          const isSel = selectedIds.includes(layer.id)
          const isEditing = editingId === layer.id
          return (
            <div
              key={layer.id}
              className={`cve-layer${isSel ? ' is-sel' : ''}${layer.locked ? ' is-locked' : ''}`}
              data-layer-id={layer.id}
              data-type={layer.type}
              style={{
                left: layer.x, top: layer.y, width: layer.w, height: layer.h,
                transform: [
                  layer.rotation ? `rotate(${layer.rotation}deg)` : '',
                  layer.flipX || layer.flipY ? `scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})` : '',
                ].filter(Boolean).join(' ') || undefined,
                zIndex: index + 1,
                cursor: layer.locked ? 'default' : isEditing ? 'text' : 'move',
              }}
              onPointerDown={(e) => onLayerDown(e, layer)}
              onDoubleClick={(e) => {
                if (layer.type === 'text' && !layer.locked) { e.stopPropagation(); onSelect(layer.id); onEditText(layer.id) }
              }}
              aria-label={`${layer.name}${layer.locked ? ', imefungwa' : ''}`}
            >
              <div className="cve-layer__content" style={{ opacity: layer.opacity }}>
                {layer.type === 'text' ? (
                  isEditing ? null : <TextView layer={layer} />
                ) : layer.type === 'image' ? (
                  <ImageView layer={layer} />
                ) : (
                  <ShapeView layer={layer} />
                )}
              </div>

              {isEditing && layer.type === 'text' ? (
                <textarea
                  className="cve-inline-edit"
                  autoFocus
                  aria-label={`Hariri maandishi: ${layer.name}`}
                  style={textStyle(layer)}
                  value={layer.text}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const base = live.current.doc
                    live.current.onLive(updateLayer(base, layer.id, { text: e.target.value }))
                  }}
                  onBlur={() => {
                    const d = live.current.doc
                    live.current.onCommit(d, `text:${layer.id}`)
                    onEditText(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur() }
                    e.stopPropagation()
                  }}
                />
              ) : null}

              {selectedId === layer.id && !layer.locked && !isEditing ? (
                <>
                  <div className="cve-sel" aria-hidden="true" />
                  {HANDLES.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      tabIndex={-1}
                      className="cve-handle"
                      data-handle={h.id}
                      aria-label={`Badilisha ukubwa (${h.id})`}
                      style={{
                        left: h.sx < 0 ? 0 : '100%',
                        top: h.sy < 0 ? 0 : '100%',
                        cursor: h.cursor,
                      }}
                      onPointerDown={(e) => onHandleDown(e, layer, h)}
                    />
                  ))}
                  <button
                    type="button"
                    tabIndex={-1}
                    className="cve-rot"
                    data-handle="rot"
                    aria-label="Zungusha"
                    onPointerDown={(e) => onRotateDown(e, layer)}
                  >
                    <span className="cve-rot__stem" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
          )
        })}

        {guides.v.map((x) => (
          <div key={`gv-${x}`} className="cve-guide cve-guide--v" style={{ left: x }} aria-hidden="true" />
        ))}
        {guides.h.map((y) => (
          <div key={`gh-${y}`} className="cve-guide cve-guide--h" style={{ top: y }} aria-hidden="true" />
        ))}
      </div>
      {selected && selected.locked ? <span className="u-sr">Kipengele kilichochaguliwa kimefungwa</span> : null}
    </div>
  )
}

// ── Mitindo ya maandishi (inatumika kwenye preview na kwenye kuhariri ndani ya turubai) ──
export function textStyle(layer) {
  const font = fontFor(layer.fontKey)
  return {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    margin: 0,
    padding: 0,
    border: 0,
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    fontFamily: font.stack,
    fontSize: layer.fontSize,
    fontWeight: layer.bold ? 700 : 400,
    fontStyle: layer.italic ? 'italic' : 'normal',
    textDecoration: [layer.underline ? 'underline' : '', layer.strike ? 'line-through' : ''].filter(Boolean).join(' ') || undefined,
    lineHeight: `${layer.fontSize * layer.lineHeight}px`,
    letterSpacing: `${layer.letterSpacing}px`,
    color: layer.color,
    background: layer.bgColor ?? 'transparent',
    textAlign: layer.align,
    textShadow: layer.shadow
      ? `${layer.shadow.offsetX}px ${layer.shadow.offsetY}px ${layer.shadow.blur}px ${shadowCss(layer.shadow)}`
      : undefined,
    WebkitTextStroke: layer.stroke?.width > 0 ? `${layer.stroke.width}px ${layer.stroke.color}` : undefined,
  }
}

function TextView({ layer }) {
  return <div className="cve-text" style={textStyle(layer)}>{displayText(layer) || ' '}</div>
}

function ImageView({ layer }) {
  const c = layer.crop
  const iw = layer.w / c.w
  const ih = layer.h / c.h
  const tint = tintColor(layer)
  const sh = layer.shadow
  // Tint inatumia mask ya picha yenyewe (alpha), ili pembezo la PNG lisipakwe rangi.
  const src = JSON.stringify(layer.src)
  const mask = {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: `${iw}px ${ih}px`,
    maskSize: `${iw}px ${ih}px`,
    WebkitMaskPosition: `${-c.x * iw}px ${-c.y * ih}px`,
    maskPosition: `${-c.x * iw}px ${-c.y * ih}px`,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  }
  return (
    <div
      className="cve-img"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        borderRadius: layer.radius,
        boxShadow: layer.border?.width > 0 ? `inset 0 0 0 ${layer.border.width}px ${layer.border.color}` : undefined,
        filter: sh ? `drop-shadow(${sh.offsetX}px ${sh.offsetY}px ${sh.blur / 2}px ${shadowCss(sh)})` : undefined,
      }}
    >
      <img
        src={layer.src}
        alt={layer.name}
        draggable={false}
        style={{
          position: 'absolute',
          width: iw,
          height: ih,
          left: -c.x * iw,
          top: -c.y * ih,
          maxWidth: 'none',
          filter: imageFilterString(layer),
          pointerEvents: 'none',
        }}
      />
      {tint ? (
        <div
          aria-hidden="true"
          data-testid="img-tint"
          style={{ position: 'absolute', inset: 0, background: tint, mixBlendMode: 'multiply', pointerEvents: 'none', ...mask }}
        />
      ) : null}
    </div>
  )
}

// Sawa na drawShape() kwenye creativeRender: rangi na unene vinatoka kwenye layer, si kwenye primitive.
function ShapeView({ layer }) {
  const prims = shapePrimitives(layer)
  const { w, h } = layer
  const strokeOn = Boolean(layer.stroke) && layer.strokeWidth > 0
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{
        display: 'block',
        overflow: 'visible',
        filter: layer.shadow
          ? `drop-shadow(${layer.shadow.offsetX}px ${layer.shadow.offsetY}px ${layer.shadow.blur / 2}px ${shadowCss(layer.shadow)})`
          : undefined,
      }} aria-hidden="true">
      {prims.map((p, i) => {
        if (p.kind === 'line') {
          return (
            <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
              stroke={layer.stroke ?? DEFAULT_INK} strokeWidth={p.width} strokeLinecap="round" />
          )
        }
        const fill = p.headFill ? (layer.stroke ?? DEFAULT_INK) : (layer.fill ?? 'none')
        const stroke = !p.headFill && strokeOn ? layer.stroke : 'none'
        const sw = !p.headFill && strokeOn ? layer.strokeWidth : 0
        if (p.kind === 'rect') {
          return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx || 0} fill={fill} stroke={stroke} strokeWidth={sw} />
        }
        if (p.kind === 'ellipse') {
          return <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={fill} stroke={stroke} strokeWidth={sw} />
        }
        if (p.kind === 'polygon') {
          return <polygon key={i} points={p.points.map((q) => q.join(',')).join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        }
        return null
      })}
    </svg>
  )
}
