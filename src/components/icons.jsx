// ══════════════════════════════════════════════════════════════
// PASIHAI — ICONS (Hatua 0)
// Seti moja ya icons: line style, viewBox 24, stroke 1.7.
// HAKUNA kujaza (fill) isipokuwa pale inapohitajika (k.m. notification dot).
// ══════════════════════════════════════════════════════════════

const S = ({ size = 22, children, strokeWidth = 1.7, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
)

/* ── Navigation kuu ─────────────────────────────────────── */

export const IconHome = (p) => (
  <S {...p}>
    <path d="M3.6 10.4 12 3.8l8.4 6.6" />
    <path d="M5.4 9.4V19a1.2 1.2 0 0 0 1.2 1.2h3.1v-4.5a2.3 2.3 0 0 1 4.6 0v4.5h3.1A1.2 1.2 0 0 0 18.6 19V9.4" />
  </S>
)

export const IconSoga = (p) => (
  <S {...p}>
    <path d="M20.4 11.6c0 4-3.8 7-8.4 7-1 0-2-.15-2.9-.43l-4.5 1.63a.5.5 0 0 1-.65-.62l1.2-3.5C3.9 14.4 3.6 13 3.6 11.6c0-4 3.8-7 8.4-7s8.4 3 8.4 7Z" />
  </S>
)

export const IconGundua = (p) => (
  <S {...p}>
    <circle cx="10.6" cy="10.6" r="6.6" />
    <path d="m15.4 15.4 4.6 4.6" />
  </S>
)

export const IconSpaces = (p) => (
  <S {...p}>
    <circle cx="9.6" cy="8.6" r="3.1" />
    <path d="M3.9 19.2c0-3.15 2.55-5.1 5.7-5.1s5.7 1.95 5.7 5.1" />
    <path d="M16.2 6.1a2.7 2.7 0 0 1 0 5.2" />
    <path d="M17.6 14.4c2 .5 3.5 2.05 3.5 4.4" />
  </S>
)

export const IconBusiness = (p) => (
  <S {...p}>
    <path d="M3.9 8.4h16.2v10a1.2 1.2 0 0 1-1.2 1.2H5.1a1.2 1.2 0 0 1-1.2-1.2Z" />
    <path d="M8.7 8.4V6.6A2.1 2.1 0 0 1 10.8 4.5h2.4a2.1 2.1 0 0 1 2.1 2.1v1.8" />
    <path d="M3.9 12.6h16.2" />
  </S>
)

/* ── Header ─────────────────────────────────────────────── */

export const IconBell = (p) => (
  <S {...p}>
    <path d="M12 4.2a5.4 5.4 0 0 1 5.4 5.4c0 3 .55 4.65 1.1 5.5a.6.6 0 0 1-.5.92H6a.6.6 0 0 1-.5-.92c.55-.85 1.1-2.5 1.1-5.5A5.4 5.4 0 0 1 12 4.2Z" />
    <path d="M10.1 19.1a2 2 0 0 0 3.8 0" />
  </S>
)

export const IconUser = (p) => (
  <S {...p}>
    <circle cx="12" cy="8.6" r="3.5" />
    <path d="M5.4 19.8c0-3.3 2.95-5.6 6.6-5.6s6.6 2.3 6.6 5.6" />
  </S>
)

export const IconMoreVertical = (p) => (
  <S {...p}>
    <circle cx="12" cy="5.4" r="1.35" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
    <circle cx="12" cy="18.6" r="1.35" fill="currentColor" stroke="none" />
  </S>
)

export const IconMoreHorizontal = (p) => (
  <S {...p}>
    <circle cx="5.4" cy="12" r="1.35" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
    <circle cx="18.6" cy="12" r="1.35" fill="currentColor" stroke="none" />
  </S>
)

/* ── Vitendo (actions) ──────────────────────────────────── */

export const IconHeart = ({ filled = false, ...p }) => (
  <S {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 19.6s-7.3-4.4-7.3-9.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.3 2.7c0 4.9-7.3 9.3-7.3 9.3Z" />
  </S>
)

export const IconComment = (p) => (
  <S {...p}>
    <path d="M20.2 11.8c0 3.7-3.6 6.6-8.1 6.6-1 0-1.95-.15-2.82-.42l-4.3 1.6a.5.5 0 0 1-.66-.6l1.05-3.3c-.9-1.1-1.4-2.45-1.4-3.88 0-3.7 3.65-6.7 8.13-6.7 4.48 0 8.1 3 8.1 6.7Z" />
  </S>
)

export const IconShare = (p) => (
  <S {...p}>
    <path d="M14.3 4.9 20 10.4l-5.7 5.5v-3.2c-5.4 0-8 1.3-9.6 4.4-.3-6 2.9-9.4 9.6-9.7Z" />
  </S>
)

export const IconBookmark = ({ filled = false, ...p }) => (
  <S {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M6.7 4.9h10.6v15.2l-5.3-3.6-5.3 3.6Z" />
  </S>
)

export const IconPlus = (p) => (
  <S {...p}>
    <path d="M12 5.4v13.2M5.4 12h13.2" />
  </S>
)

export const IconClose = (p) => (
  <S {...p}>
    <path d="m6.3 6.3 11.4 11.4M17.7 6.3 6.3 17.7" />
  </S>
)

export const IconChevronDown = (p) => (
  <S {...p}>
    <path d="m6.6 9.6 5.4 5.2 5.4-5.2" />
  </S>
)

export const IconChevronRight = (p) => (
  <S {...p}>
    <path d="m9.4 6.2 5.6 5.8-5.6 5.8" />
  </S>
)

export const IconChevronLeft = (p) => (
  <S {...p}>
    <path d="m14.6 6.2-5.6 5.8 5.6 5.8" />
  </S>
)

export const IconCheck = (p) => (
  <S {...p}>
    <path d="m5.4 12.6 4.2 4.2 9-9.6" />
  </S>
)

export const IconArrowRight = (p) => (
  <S {...p}>
    <path d="M4.6 12h14.2" />
    <path d="m13.4 6.6 5.4 5.4-5.4 5.4" />
  </S>
)

/* ── Media / content types ──────────────────────────────── */

export const IconPhoto = (p) => (
  <S {...p}>
    <rect x="3.7" y="5.4" width="16.6" height="13.2" rx="2.2" />
    <circle cx="9" cy="10.3" r="1.5" />
    <path d="m4.6 17.4 4.5-4.2a1.6 1.6 0 0 1 2.2 0l5.5 5.1" />
    <path d="m14.2 14.4 1.7-1.6a1.6 1.6 0 0 1 2.2 0l2.2 2" />
  </S>
)

export const IconVideo = (p) => (
  <S {...p}>
    <rect x="3.4" y="6.4" width="12.4" height="11.2" rx="2.2" />
    <path d="m15.8 12 4.8-3.3v6.6z" />
  </S>
)

export const IconPlay = ({ filled = true, size = 20, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke={filled ? 'none' : 'currentColor'}
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    <path d="M8.4 5.6 18.2 12 8.4 18.4Z" />
  </svg>
)

export const IconReel = (p) => (
  <S {...p}>
    <rect x="4.2" y="4.6" width="15.6" height="15.6" rx="4" />
    <path d="m10.4 9.4 4.7 2.9-4.7 2.9z" />
    <path d="M4.6 8.9h14.8" />
    <path d="m8.6 4.9 2.4 3.9M14.4 4.9l2.4 3.9" />
  </S>
)

export const IconMic = (p) => (
  <S {...p}>
    <rect x="9.2" y="3.6" width="5.6" height="10" rx="2.8" />
    <path d="M6.4 11.4a5.6 5.6 0 0 0 11.2 0" />
    <path d="M12 17.4V20.4" />
  </S>
)

export const IconLive = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
    <path d="M7.9 7.9a5.8 5.8 0 0 0 0 8.2M16.1 7.9a5.8 5.8 0 0 1 0 8.2" />
    <path d="M5.2 5.2a9.6 9.6 0 0 0 0 13.6M18.8 5.2a9.6 9.6 0 0 1 0 13.6" />
  </S>
)

export const IconPoll = (p) => (
  <S {...p}>
    <path d="M4.4 19.4V11M9.6 19.4V5.2M14.8 19.4v-6M20 19.4V8.6" />
  </S>
)

export const IconMegaphone = (p) => (
  <S {...p}>
    <path d="M18.6 5.6v12.8L8.2 15.2H5.6a1.6 1.6 0 0 1-1.6-1.6v-3.2a1.6 1.6 0 0 1 1.6-1.6h2.6Z" />
    <path d="M8.2 15.4v3.4a1.2 1.2 0 0 0 2.4 0v-3.1" />
    <path d="M20.2 9.6v4.8" />
  </S>
)

export const IconMapPin = (p) => (
  <S {...p}>
    <path d="M12 21s6.2-5.5 6.2-10.3A6.2 6.2 0 0 0 5.8 10.7C5.8 15.5 12 21 12 21Z" />
    <circle cx="12" cy="10.4" r="2.3" />
  </S>
)

export const IconLink = (p) => (
  <S {...p}>
    <path d="M10.2 13.8a3.6 3.6 0 0 0 5.1 0l2.1-2.1a3.6 3.6 0 0 0-5.1-5.1l-1 1" />
    <path d="M13.8 10.2a3.6 3.6 0 0 0-5.1 0l-2.1 2.1a3.6 3.6 0 0 0 5.1 5.1l1-1" />
  </S>
)

/* ── Mipangilio na menus ────────────────────────────────── */

export const IconSettings = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="2.7" />
    <path d="M12 3.6v2.1M12 18.3v2.1M4.6 12H6.7M17.3 12h2.1M6.75 6.75l1.5 1.5M15.75 15.75l1.5 1.5M17.25 6.75l-1.5 1.5M8.25 15.75l-1.5 1.5" />
  </S>
)

export const IconRefresh = (p) => (
  <S {...p}>
    <path d="M19.3 12a7.3 7.3 0 1 1-2.4-5.4" />
    <path d="M19.9 4.4v4.2h-4.2" />
  </S>
)

export const IconSliders = (p) => (
  <S {...p}>
    <path d="M4.4 8.2h9M17.2 8.2h2.4M4.4 15.8h3.2M11.2 15.8h8.4" />
    <circle cx="15.2" cy="8.2" r="1.9" />
    <circle cx="9.2" cy="15.8" r="1.9" />
  </S>
)

export const IconEye = (p) => (
  <S {...p}>
    <path d="M2.9 12S6.2 6.4 12 6.4 21.1 12 21.1 12 17.8 17.6 12 17.6 2.9 12 2.9 12Z" />
    <circle cx="12" cy="12" r="2.7" />
  </S>
)

export const IconGrid = (p) => (
  <S {...p}>
    <rect x="4.2" y="4.2" width="6.6" height="6.6" rx="1.6" />
    <rect x="13.2" y="4.2" width="6.6" height="6.6" rx="1.6" />
    <rect x="4.2" y="13.2" width="6.6" height="6.6" rx="1.6" />
    <rect x="13.2" y="13.2" width="6.6" height="6.6" rx="1.6" />
  </S>
)

export const IconExpand = (p) => (
  <S {...p}>
    <path d="M9.4 4.6H4.6v4.8M14.6 4.6h4.8v4.8M9.4 19.4H4.6v-4.8M14.6 19.4h4.8v-4.8" />
  </S>
)

export const IconGauge = (p) => (
  <S {...p}>
    <path d="M4.4 16.6a8.4 8.4 0 1 1 15.2 0" />
    <path d="m12 12.6 3.2-3.2" />
    <circle cx="12" cy="13.4" r="1.1" fill="currentColor" stroke="none" />
  </S>
)

export const IconInfo = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 11v5.2M12 8.2v.9" />
  </S>
)

export const IconSearchSmall = (p) => (
  <S {...p}>
    <circle cx="11" cy="11" r="5.8" />
    <path d="m15.4 15.4 3.8 3.8" />
  </S>
)

/* ── Spaces / Business (kwa kurasa za placeholder) ──────── */

export const IconHub = (p) => (
  <S {...p}>
    <circle cx="12" cy="6.4" r="2.4" />
    <circle cx="6.2" cy="17" r="2.4" />
    <circle cx="17.8" cy="17" r="2.4" />
    <path d="M10.4 8.5 7.4 14.7M13.6 8.5l3 6.2M8.6 17h6.8" />
  </S>
)

export const IconStorefront = (p) => (
  <S {...p}>
    <path d="M4.6 9.4V19a1 1 0 0 0 1 1h12.8a1 1 0 0 0 1-1V9.4" />
    <path d="M3.4 9.4 5.2 4.6h13.6l1.8 4.8a2.4 2.4 0 0 1-4.4 1.1A2.4 2.4 0 0 1 12 10.7a2.4 2.4 0 0 1-4.2-.2 2.4 2.4 0 0 1-4.4-1.1Z" />
    <path d="M9.6 20v-4.6h4.8V20" />
  </S>
)

export const IconSpark = (p) => (
  <S {...p}>
    <path d="M12 3.6l1.9 4.9 4.9 1.9-4.9 1.9L12 17.2l-1.9-4.9-4.9-1.9 4.9-1.9Z" />
    <path d="M18.4 16.4l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" />
  </S>
)

export const IconShield = (p) => (
  <S {...p}>
    <path d="M12 3.8 19 6.2v5.6c0 4.2-2.9 7.2-7 8.4-4.1-1.2-7-4.2-7-8.4V6.2Z" />
    <path d="m9 12 2.1 2.1L15 10.2" />
  </S>
)

export const IconGlobe = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M4.2 9.8h15.6M4.2 14.2h15.6" />
    <path d="M12 3.8c-4.6 4.6-4.6 11.8 0 16.4 4.6-4.6 4.6-11.8 0-16.4Z" />
  </S>
)

/* ── Nyongeza (Stitch integration) ───────────────────────── */

export const IconHeadset = (p) => (
  <S {...p}>
    <path d="M4.4 15.4v-3a7.6 7.6 0 0 1 15.2 0v3" />
    <path d="M4.4 14.6h1.8a1 1 0 0 1 1 1v2.6a1 1 0 0 1-1 1H5.4a1 1 0 0 1-1-1Z" />
    <path d="M19.6 14.6h-1.8a1 1 0 0 0-1 1v2.6a1 1 0 0 0 1 1h.8a1 1 0 0 0 1-1Z" />
    <path d="M12 19.2v1.2" />
  </S>
)

export const IconTimer = (p) => (
  <S {...p}>
    <circle cx="12" cy="13.4" r="7" />
    <path d="M12 10.2v3.4l2.2 1.6" />
    <path d="M9.4 3.6h5.2" />
  </S>
)

export const IconCalendarAdd = (p) => (
  <S {...p}>
    <rect x="3.8" y="5.6" width="16.4" height="14" rx="2.4" />
    <path d="M3.8 9.8h16.4M8.4 3.8v3.4M15.6 3.8v3.4" />
    <path d="M12 12.6v4.2M9.9 14.7h4.2" />
  </S>
)
