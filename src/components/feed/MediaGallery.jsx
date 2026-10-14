// ══════════════════════════════════════════════════════════════
// PASIHAI — MEDIA GALLERY (grid / carousel ya media nyingi)
//
// Hutumika pale chapisho linapokuwa na media ZAIDI YA MOJA.
// Data ya sasa ina media moja kwa post; component hii inasoma
// `item.mediaItems` ikiwa ipo (hakuna muundo mpya unaobuniwa) na
// hutoa muonekano unaolingana na idadi HALISI ya media:
//
//   media 1  → frame moja (adaptive kwa ratio yake)
//   media 2  → grid ya safu 2
//   media 3  → grid ya safu 2 + moja chini
//   media 4  → grid 2 × 2
//   media 5+ → carousel (swipe/scroll) yenye dots
//
// Kila kipande kinahifadhi ratio yake; grid inatumia cover ili
// seli zilingane, lakini aspect-ratio ya container inatokana na
// media ya kwanza (si ya kubuni).
// ══════════════════════════════════════════════════════════════

import { useRef, useState } from 'react'
import { MediaFrame } from '../ui.jsx'
import { galleryShape, mediaItemsOf, mediaAspect, orientationOf } from '../../utils/mediaLayout.js'
import { IconArrowRight, IconChevronLeft } from '../icons.jsx'

function Item({ media, fit, index, total }) {
  return (
    <MediaFrame
      tone={media?.tone ?? 'green'}
      ratio={media?.ratio ?? '4 / 3'}
      caption={media?.caption}
      mediaUrl={media?.url}
      mediaType={media?.mediaType || 'image'}
      poster={media?.poster}
      fit={fit}
      rounded={false}
      showCaption={false}
      sizes={{ width: media?.width, height: media?.height }}
      overlay={
        total > 1 ? (
          <span className="psh-gallery__count" aria-hidden="true">
            {index + 1}/{total}
          </span>
        ) : null
      }
    />
  )
}

export default function MediaGallery({ item }) {
  const items = mediaItemsOf(item)
  const shape = galleryShape(items.length)
  const scrollerRef = useRef(null)
  const [index, setIndex] = useState(0)

  if (items.length <= 1) {
    const media = items[0]
    return (
      <div className="psh-gallery psh-gallery--single">
        <Item media={media} fit="contain" index={0} total={1} />
      </div>
    )
  }

  if (shape === 'carousel') {
    const scrollTo = (next) => {
      const clamped = Math.max(0, Math.min(items.length - 1, next))
      setIndex(clamped)
      const el = scrollerRef.current
      if (!el) return
      const child = el.children[clamped]
      if (child) el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: 'smooth' })
    }
    return (
      <div className="psh-gallery psh-gallery--carousel">
        <div
          className="psh-gallery__track"
          ref={scrollerRef}
          onScroll={(event) => {
            const el = event.currentTarget
            const child = el.children[0]
            if (!child) return
            const step = child.getBoundingClientRect().width + 8
            setIndex(Math.round(el.scrollLeft / step))
          }}
        >
          {items.map((media, i) => (
            <div className="psh-gallery__slide" key={i}>
              <Item media={media} fit="contain" index={i} total={items.length} />
            </div>
          ))}
        </div>
        <div className="psh-gallery__nav">
          <button
            type="button"
            className="psh-gallery__navbtn"
            onClick={() => scrollTo(index - 1)}
            disabled={index === 0}
            aria-label="Media iliyopita"
          >
            <IconChevronLeft size={16} />
          </button>
          <span className="psh-gallery__dots" aria-hidden="true">
            {items.map((_, i) => (
              <span key={i} className={`psh-gallery__dot ${i === index ? 'is-active' : ''}`} />
            ))}
          </span>
          <button
            type="button"
            className="psh-gallery__navbtn"
            onClick={() => scrollTo(index + 1)}
            disabled={index >= items.length - 1}
            aria-label="Media inayofuata"
          >
            <IconArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  const aspect = mediaAspect(items[0])
  return (
    <div
      className={`psh-gallery psh-gallery--${shape}`}
      style={{ '--psh-gallery-ar-w': orientationOf(aspect) === 'portrait' ? 1 : 1.5 }}
    >
      {items.map((media, i) => (
        <div className="psh-gallery__cell" key={i}>
          <Item media={media} fit="cover" index={i} total={items.length} />
        </div>
      ))}
    </div>
  )
}
