// ══════════════════════════════════════════════════════════════
// PASIHAI — StructuredPost (renderer moja ya chapisho lenye muundo)
//
// Inatumiwa na: feed (FeedText), preview ya Post Studio, na preview ya
// quick area (More → Muundo). Maandishi yanatolewa kama text ya React —
// hakuna HTML ya mtumiaji. Ukubwa/rangi/background vinatoka kwenye
// allowlist ya postContent.js.
// ══════════════════════════════════════════════════════════════

import { BACKGROUNDS, PALETTE, SIZE_PX, TEMPLATES, sanitizeContent } from '../../utils/postContent.js'

const TEXT_STYLE = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6, margin: 0 }

function bgHex(key) {
  return BACKGROUNDS[key]?.hex ?? undefined
}

export default function StructuredPost({ content, className = '' }) {
  const c = sanitizeContent(content)
  const layout = TEMPLATES[c.template.id]?.layout ?? 'plain'
  const headingStyle = {
    fontSize: SIZE_PX[c.heading.size],
    color: PALETTE[c.heading.color].hex,
    fontWeight: 700,
    lineHeight: 1.25,
    margin: '0 0 8px',
    overflowWrap: 'anywhere',
  }
  const bodyStyle = {
    ...TEXT_STYLE,
    fontSize: SIZE_PX[c.body.size],
    textAlign: c.body.align,
    color: PALETTE.ink.hex,
  }
  const background = bgHex(c.background)
  const boxStyle = background
    ? { background, borderRadius: 12, padding: '14px 16px' }
    : undefined

  if (layout === 'article') {
    return (
      <article className={`psh-spost psh-spost--article ${className}`.trim()} aria-label="Makala">
        {c.heading.text ? <h2 style={headingStyle}>{c.heading.text}</h2> : null}
        {c.body.text ? <div style={bodyStyle}>{c.body.text}</div> : null}
        {c.conclusion.text ? (
          <section
            aria-label="Hitimisho"
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: `2px solid ${PALETTE[c.conclusion.color].hex}`,
            }}
          >
            <p style={{ ...TEXT_STYLE, fontSize: SIZE_PX[c.conclusion.size], color: PALETTE[c.conclusion.color].hex, fontWeight: 600 }}>
              {c.conclusion.text}
            </p>
          </section>
        ) : null}
      </article>
    )
  }

  if (layout === 'emphasis') {
    return (
      <div className={`psh-spost psh-spost--emphasis ${className}`.trim()} style={boxStyle}>
        {c.heading.text ? <h2 style={headingStyle}>{c.heading.text}</h2> : null}
        {c.body.text ? <div style={bodyStyle}>{c.body.text}</div> : null}
      </div>
    )
  }

  if (layout === 'quote') {
    return (
      <figure className={`psh-spost psh-spost--quote ${className}`.trim()} style={{ margin: 0, ...boxStyle }}>
        <blockquote style={{ ...bodyStyle, margin: 0, fontStyle: 'italic' }}>{c.body.text}</blockquote>
        {c.attribution ? (
          <figcaption style={{ marginTop: 8, fontSize: SIZE_PX.sm, color: PALETTE.slate.hex }}>
            — {c.attribution}
          </figcaption>
        ) : null}
      </figure>
    )
  }

  if (layout === 'media') {
    return (
      <div className={`psh-spost psh-spost--media ${className}`.trim()}>
        {c.heading.text ? <h2 style={headingStyle}>{c.heading.text}</h2> : null}
        {c.body.text ? <div style={bodyStyle}>{c.body.text}</div> : null}
      </div>
    )
  }

  // plain / poll: aya ya maandishi tu
  return (
    <div className={`psh-spost psh-spost--plain ${className}`.trim()}>
      {c.body.text ? <div style={bodyStyle}>{c.body.text}</div> : null}
    </div>
  )
}
