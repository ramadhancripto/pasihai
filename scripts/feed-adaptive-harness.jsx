// ══════════════════════════════════════════════════════════════
// PASIHAI — ADAPTIVE FEED HARNESS (SSR entry)
//
// Hu-render FeedItem HALISI kwa data ya aina mbalimbali za media.
// Data hapa ni ya MAJARIBIO ya component pekee (component check) —
// HAIINGII kwenye app wala kwenye mkondo wa production.
//
// Kila item ina muundo uleule unaotoka kwenye feed mapper halisi:
//   id · kind · entity · media{ ratio, url, mediaType, width, height }
// ══════════════════════════════════════════════════════════════

import { renderToString } from 'react-dom/server'
import FeedItem from '../src/components/feed/FeedItem.jsx'

const entity = (name, id = name) => ({
  id,
  name,
  handle: `@${name.toLowerCase().replace(/\s+/g, '')}`,
  type: 'friend',
  relationship: 'Rafiki',
  avatarTone: 'green',
})

/* Picha ya majaribio (data URI) yenye vipimo vinavyoonekana — hivyo
   cropping na uwiano vinaonekana wazi kwenye picha za uthibitisho. */
function demoAsset(w, h, hue = 160) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue} 52% 90%)"/><stop offset="1" stop-color="hsl(${hue} 55% 52%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
    `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 4}" fill="rgba(255,255,255,0.6)"/>` +
    `<text x="${w / 2}" y="${h / 2 + Math.min(w, h) / 24}" font-family="sans-serif" ` +
    `font-size="${Math.round(Math.min(w, h) / 7)}" text-anchor="middle" fill="#123a30">${w}×${h}</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const IMG = demoAsset(1600, 1200, 160)
const IMG_PORTRAIT = demoAsset(1080, 1920, 200)
const IMG_LANDSCAPE = demoAsset(1920, 1080, 140)
const IMG_SQUARE = demoAsset(1080, 1080, 95)
const cases = [
  {
    id: 'case-portrait-image',
    label: 'Picha ya wima (portrait) · picha 1080×1920',
    item: {
      kind: 'image',
      text: 'Picha ya wima — kipimo chake ni 9 / 16 kutoka data ya media (Cloudinary width × height).',
      media: { url: IMG_PORTRAIT, mediaType: 'image', ratio: '9 / 16', width: 1080, height: 1920, caption: 'Picha ya wima' },
    },
  },
  {
    id: 'case-landscape-image',
    label: 'Picha ya mlalo (landscape) · picha 1920×1080',
    item: {
      kind: 'image',
      text: 'Picha ya mlalo — kipimo 16 / 9, haikatwi vibaya.',
      media: { url: IMG_LANDSCAPE, mediaType: 'image', ratio: '16 / 9', width: 1920, height: 1080, caption: 'Picha ya mlalo' },
    },
  },
  {
    id: 'case-square-image',
    label: 'Picha ya mraba (1 / 1)',
    item: {
      kind: 'image',
      text: 'Picha ya mraba — 1 / 1.',
      media: { url: IMG_SQUARE, mediaType: 'image', ratio: '1 / 1', width: 1080, height: 1080, caption: 'Picha ya mraba' },
    },
  },
  {
    id: 'case-video-portrait',
    label: 'Video ya wima (9 / 16)',
    item: {
      kind: 'video',
      text: 'Video ya wima — inaonekana kubwa kwa uwiano wa 9 / 16.',
      media: { url: IMG_PORTRAIT, mediaType: 'video', ratio: '9 / 16', width: 1080, height: 1920, duration: '0:22' },
    },
  },
  {
    id: 'case-portrait-no-dims',
    label: 'Picha ya wima bila kipimo (fallback salama)',
    item: {
      kind: 'image',
      text: 'Bila width/height kwenye data: app inatumia ratio iliyohifadhiwa (4 / 5) — hakuna kuvunjika.',
      media: { url: IMG_PORTRAIT, mediaType: 'image', ratio: '4 / 5' },
    },
  },
  {
    id: 'case-no-media-meta',
    label: 'Picha bila ratio wala kipimo (fallback 4 / 3)',
    item: {
      kind: 'image',
      text: 'Media bila metadata yoyote — fallback ni 4 / 3.',
      media: { url: IMG, mediaType: 'image' },
    },
  },
  {
    id: 'case-gallery-2',
    label: 'Gallery · media 2',
    item: {
      kind: 'image',
      text: 'Gallery ya media mbili.',
      media: { url: IMG, mediaType: 'image', ratio: '4 / 3' },
      mediaItems: [
        { url: IMG, mediaType: 'image', ratio: '4 / 3' },
        { url: IMG_SQUARE, mediaType: 'image', ratio: '1 / 1' },
      ],
    },
  },
  {
    id: 'case-gallery-3',
    label: 'Gallery · media 3',
    item: {
      kind: 'image',
      text: 'Gallery ya media tatu.',
      media: { url: IMG, mediaType: 'image', ratio: '4 / 3' },
      mediaItems: [
        { url: IMG, mediaType: 'image', ratio: '4 / 3' },
        { url: IMG_LANDSCAPE, mediaType: 'image', ratio: '16 / 9' },
        { url: IMG_SQUARE, mediaType: 'image', ratio: '1 / 1' },
      ],
    },
  },
  {
    id: 'case-gallery-4',
    label: 'Gallery · media 4',
    item: {
      kind: 'image',
      text: 'Gallery ya media nne.',
      media: { url: IMG, mediaType: 'image', ratio: '4 / 3' },
      mediaItems: [
        { url: IMG, mediaType: 'image', ratio: '4 / 3' },
        { url: IMG_SQUARE, mediaType: 'image', ratio: '1 / 1' },
        { url: IMG_LANDSCAPE, mediaType: 'image', ratio: '16 / 9' },
        { url: IMG_PORTRAIT, mediaType: 'image', ratio: '3 / 4' },
      ],
    },
  },
  {
    id: 'case-gallery-6',
    label: 'Gallery · media 6 (carousel)',
    item: {
      kind: 'image',
      text: 'Gallery ya media sita — carousel yenye dots.',
      media: { url: IMG, mediaType: 'image', ratio: '4 / 3' },
      mediaItems: Array.from({ length: 6 }, (_, i) => ({
        url: i % 2 === 0 ? IMG : IMG_SQUARE,
        mediaType: 'image',
        ratio: i % 2 === 0 ? '4 / 3' : '1 / 1',
      })),
    },
  },
  {
    id: 'case-text-long',
    label: 'Maandishi marefu (kunja/fungua)',
    item: {
      kind: 'text',
      text: `${'Chapisho la maandishi marefu linaonyeshwa kwa urefu mzuri wa kusoma. '.repeat(8)}Mwisho wa maandishi.`,
    },
  },
]

export function render() {
  // Kama ilivyo kwenye app: items zote zinaishi ndani ya `.psh-feed`
  // yenye mode yake — selectors za production zinahitaji muundo huu.
  return `<section class="psh-feed psh-feed--large-post-feed" data-view-mode="auto">${
    cases
    .map(({ id, label, item }) => {
      const full = {
        id,
        userId: 'harness-user',
        ageMinutes: 12,
        reaction: null,
        source: 'post',
        filters: ['posts'],
        stats: { reactions: 24, comments: 5, shares: 0 },
        ...item,
        entity: entity('Neema Beats', 'harness-user'),
      }
      return `<p class="harness__label">${label}</p>${renderToString(
        <FeedItem item={full} onOpenProfile={() => {}} onToast={() => {}} />,
      )}`
    })
    .join('')}</section>`
}
