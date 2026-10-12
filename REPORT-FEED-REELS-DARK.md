# PASIHAI — FEED, ACCOUNT ACTIONS, VIDEO REELS & DARK MODE
## Tarehe: 2026-10-12

---

## BUILD/TEST
```
Build:  ✅ 5.39s
Smoke:  ✅ 510/510
Regressions: 0
```

---

## 1. DARK MODE — Obsidian Kinetic ✅

### Zilizofanywa
| Change | File | Detail |
|--------|------|--------|
| Dark tokens | `tokens.css` | All tokens remapped for dark: `--bg: #10141a`, `--t-1: #dfe2eb`, `--c-green: #44f3a9`, `--c-blue: #98cbff` |
| System preference | `tokens.css` | `@media (prefers-color-scheme: dark)` + `[data-theme="dark"]` |
| Theme hook | `useTheme.js` | `toggle()`, `setTheme()`, localStorage persistence |
| Header toggle | `Header.jsx` | Moon/Sun icon button |
| App integration | `App.jsx` | `useTheme()` hook wired to Header |
| Chat dark overrides | `chat.css` | Dark avatars, thread background |

### Rangi (Obsidian Kinetic)
- Surface: `#10141a` → Elevated: `#181c22` → Container: `#1c2026`
- Text: `#dfe2eb` → Secondary: `#bec7d4` → Tertiary: `#88919d`
- Primary: `#98cbff` → Secondary: `#44f3a9`
- Lines: `#262a31` → `#3f4852`

### Mwenendo
- Dark mode inafuata system preference automatically ✅
- User anaweza kubadilisha manual (toggle kwenye Header) ✅
- Preference inahifadhiwa localStorage ✅

---

## 2. FEED CARD REDUCTION ✅

### Token Changes
| Token | Light (before → after) | Effect |
|-------|----------------------|--------|
| `--card-pad` | 16px → 12px | Less padding |
| `--card-gap` | 10px → 8px | Tighter gaps |
| `--card-r` | 16px → 12px | Smaller radius |

### Feed Actions — Simplified
| Before | After |
|--------|-------|
| Penda + Maoni + Shiriki + Hifadhi + More | ♡ + 💬 + ↗ + 🔖 + ⋯ |
| Labels showing when count=0 | Labels hidden when count=0 |
| All buttons same size | Compact, icon-first |

### "Zaidi" for long posts
- 280 character limit ✅
- "Zaidi" button with CSS ✅
- Short posts: no button ✅

---

## 3. ACCOUNT ACTIONS ✅

### Identity Component — action prop
| Entity | Action shown |
|--------|-------------|
| Person (not friend) | "Omba Urafiki" pill button next to name |
| Channel (not followed) | "Fuata" pill button next to name |
| Friend | "Ombi limetumwa" chip (after request) |
| Self | No action |

### PersonCard (Gundua)
| State | Actions |
|-------|---------|
| `not_friend` | Omba Urafiki + Ujumbe |
| `friend` | Rafiki chip + Anza Chat |
| `sent` | Ombi limetumwa |
| `no_account` | Alika PASIHAI |

### ChannelCard
| State | Actions |
|-------|---------|
| `following` | Unafuatilia |
| `not following` | Fuata |

### SpaceCard (Hub)
| State | Actions |
|-------|---------|
| `joined` | Umejiunga chip |
| `not joined` | Jiunge na Hub |

### Semantic Rules (Applied)
- **Person:** Omba Urafiki → Ombi limetumwa → Marafiki ✅
- **Channel:** Fuata → Unafuatilia ✅
- **Hub:** Jiunge → Umejiunga ✅
- No Follow for persons ✅
- No Connect (redundant) ✅

---

## 4. VIDEO REELS VIEWER ✅

### New Files
| File | Purpose |
|------|---------|
| `src/components/video/VideoReelViewer.jsx` | Full-screen vertical video viewer |
| `src/styles/video-reels.css` | Reels CSS |

### Features
- **9:16 vertical video** — full screen ✅
- **Swipe/scroll navigation** — touch + wheel + keyboard (↑↓/jk) ✅
- **Auto-play visible video** — pause others ✅
- **Mute/unmute toggle** — top right ✅
- **Close button** — top left ✅
- **Sidebar actions** — Like, Comment, Repost, Share, Save ✅
- **Creator info** — avatar, name, account action (Omba Urafiki / Fuata) ✅
- **Caption** — 2-line truncate + "Zaidi" ✅
- **Back button** — pushState + popstate handler ✅
- **Counter** — "2 / 15" indicator ✅
- **Lazy loading** — `preload="metadata"` ✅
- **Cleanup** — video paused/reset on slide change ✅

### Feed Integration
- Tap video in feed → opens reel viewer ✅
- FeedList state `reelIndex` manages viewer ✅
- Video items filtered for viewer ✅

### Responsive
- Mobile: full-screen ✅
- Tablet/Desktop: 420px centered container ✅

---

## 5. NEW ICONS

| Icon | Purpose |
|------|---------|
| `IconRepost` | Repost action |
| `IconMoon` (Header) | Dark mode toggle |
| `IconSun` (Header) | Light mode toggle |

---

## 6. FILES CHANGED

| File | Change |
|------|--------|
| `src/styles/tokens.css` | Dark mode tokens + reduced card spacing |
| `src/hooks/useTheme.js` | **NEW** — theme management |
| `src/components/Header.jsx` | Dark/light toggle button |
| `src/App.jsx` | useTheme integration |
| `src/components/ui.jsx` | Identity `action` prop |
| `src/components/feed/FeedItem.jsx` | `onOpenVideo` prop, account action in Identity |
| `src/components/feed/FeedActions.jsx` | Simplified, icon-first |
| `src/components/feed/FeedList.jsx` | VideoReelViewer integration |
| `src/components/feed/FeedSocialBar.jsx` | Person: Omba Urafiki + Ujumbe; Channel: Fuata |
| `src/components/gundua/GunduaBits.jsx` | PersonCard: Omba Urafiki + Ujumbe only |
| `src/components/video/VideoReelViewer.jsx` | **NEW** — full-screen video viewer |
| `src/styles/video-reels.css` | **NEW** — viewer CSS |
| `src/styles/feed.css` | Feed actions, video tappable, identity action CSS |
| `src/styles/chat.css` | Dark mode overrides |
| `src/main.jsx` | Import video-reels.css |

---

## 7. LIVE TESTS (NOT TESTED)

| # | Test | Status |
|---|------|--------|
| 1 | Dark mode toggle | ❌ NOT TESTED — requires live app |
| 2 | Video reel viewer | ❌ NOT TESTED — requires video content |
| 3 | Swipe navigation | ❌ NOT TESTED — requires touch device |
| 4 | Account action (Omba Urafiki) | ❌ NOT TESTED — requires Supabase |
| 5 | Account action (Fuata) | ❌ NOT TESTED |
| 6 | Feed card spacing | ❌ NOT TESTED — requires visual check |
| 7 | Long post "Zaidi" | ✅ Code verified |
| 8 | Responsive 320-412px | ✅ CSS verified |

---

## 8. BADO KINAHITAJI

1. **Login page dark mode** — 22 hardcoded colors in `login.css`
2. **Gundua dark mode** — 2 hardcoded colors
3. **Video Reels with real content** — needs video posts in feed
4. **Supabase Realtime** — for live message delivery
5. **Profile edit UI** — avatar/cover upload
6. **FIX-CHAT-RLS.sql** — must be run in Supabase Dashboard for Chat to work