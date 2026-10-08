# PASIHAI — repo KAMILI (hali: baada ya awamu N · Spaces)

Hii ni **repo yote** — kila faili iliyopo kwenye mradi (bila `node_modules` na `dist` pekee,
ambazo ni za kutengenezwa).

## Kuanza (dakika 1)
```bash
npm install          # inaweka vite, react, playwright… (dependencies pekee)
npm run build        # inatarajiwa: CSS 143.54 kB · JS 627.81 kB
npm run smoke        # inatarajiwa: 460/460
npm run dev          # terminal ya kwanza (http://localhost:5173)
npm run shots        # terminal ya pili — inahitaji dev server → 331/331, console 0
```
> `npm run shots` inahitaji browser ya Playwright. Kama haipo:
> `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright install chromium`

## Ramani ya faili (341 entries · faili 304)
| Eneo | Faili | Ni nini |
|---|---|---|
| `src/App.jsx` | 1 | shell: Header + kurasa 4 halisi (Home · Chat · Gundua · Spaces) + Business (placeholder) + panels |
| `src/pages/` | 6 | Home · Chat · Gundua · **Spaces (mpya)** · PlaceholderPage · StyleGuide |
| `src/components/` | 40+ | `spaces/` (mpya) · `feed/` · `chat/` · `gundua/` · `home/` · `system/` · `ui.jsx` · `icons.jsx` · `panels.jsx` |
| `src/data/` | 15 | `mock.js` (data + Spaces) · `repositories/` (identity·content·activity·catalog·system·chat·gundua·**spaces**) · `mappers/` |
| `src/services/` | 12 | application layer (home·feed·chat·gundua·**spaces**·system·account·settings·notification·productInfo…) |
| `src/styles/` | 14 | tokens · base · shell · home · feed · panels · chat · gundua · **spaces (mpya)** · system · guide |
| `src/hooks/`, `src/utils/` | 4 | `useAsyncData` · `format` · `time` |
| `scripts/` | 2 | `smoke.jsx` (460 assertions) · `shots.mjs` (331 assertions + picha) |
| `public/` | 12 | fonts za ndani (woff2) + favicon — app inafanya kazi bila internet |
| `docs/` | 210 | ripoti/audit zote + `shots/**` (picha 176) + `review/*/gallery.html` |

## Nyaraka muhimu
- `docs/N-REPORT.md` — **awamu ya sasa** (Spaces): kilichojengwa · reuse · ufikivu · faili · QA · mipaka
- `docs/SPACES-AUDIT.md` — ukaguzi wa awamu 0 (A–H) ulioidhinishwa
- `docs/CHAT-REPORT.md` · `docs/GUNDUA-REPORT.md` · `docs/M-REPORT.md` — awamu zilizopita
- `docs/review/spaces/gallery.html` — gallery ya QA ya Spaces (picha 21)
- `docs/review/premium/gallery.html` · `.../gundua/gallery.html` · `.../chat/gallery.html` — galleries za awamu zilizopita

## Hali halisi ya mradi (usidhani zaidi ya hivi)
- **Nav: destinations 5** (Home · Chat · Gundua · Spaces · Business) — haijabadilika.
- **Spaces** = Hubs & Jumuiya (familia moja) + Channels (tawi la kuchapisha). Vikundi = **Chat**.
- **Ufikivu ni hali**: Wazi · Binafsi-Iliyoorodheshwa · Binafsi-Fichwa (hakuna "Private Space").
- **Hakuna engine ya pili**: mkondo · maoni · reactions · hifadhi · matukio (content) · rasilimali (Save Offline) · chat · discovery.
- **Hakuna backend**: hali zote ni za kikao (zinapotea ukifunga app). Firebase/Auth/Storage ⛔ bado.
- **Hakuna namba za kubuni**: takwimu = machapisho, reactions, maoni, kushiriki, wafuatiliaji pekee.
- Awamu zilizokamilika: system def (ADW) · PHASE-1/2A · STITCH · UI-POLISH 1–2 · TOP SYSTEM · RELAY POLICY ·
  CHAT §1–32 · GUNDUA · M · **SPACES (N)**.
