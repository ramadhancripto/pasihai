# PASIHAI — Roadmap ya Kujenga Jukwaa la Kijamii

**Kanuni kuu:** PASIHAI ni jukwaa la kijamii lenye mawasiliano kwanza.

---

## 1. Misingi isiyobadilika (Design Constitution)

Hizi ni sheria ambazo hazitakiukwa katika hatua yoyote:

1. **Brand:** Jina lionekane **Pasihai** — `Pasi` green, `hai` blue. Hakuna wordmark kubwa kwenye Home.
2. **Bottom nav ni 5 pekee:** Home · Soga · Gundua · Spaces · Business. Hakuna ya sita.
3. **Home tabs:** Mchanganyiko · Reels · Friends · Channels · Live.
   Hakuna "For You", hakuna Hubs/Groups/People/Businesses/Nearby kama permanent tabs.
4. **Home haijengwi kwa mtazamo wa followers.** Mtumiaji mwenye marafiki pekee apate uzoefu kamili.
5. **Channels ≠ Chat. Hubs ≠ Chat.**
   Soga = Mawasiliano · Gundua = Kugundua · Spaces = Kushiriki · Business = Kuendesha · Home = Kutumia (consume).
6. **Feed si giant cards.** Separation ni subtle. Hakuna glassmorphism, gradients nyingi, dark dashboard, huge shadows, pill overload.
7. **Live si post ya kawaida.** Ina presentation yake.
8. **Sifa ndogo za brand:** gold `#D4A72C` inatumika kwa nadra tu.

---

## 2. Design Tokens (msingi wa kila kitu)

| Kipengele | Thamani |
|---|---|
| Primary green | `#18A982` |
| Secondary blue | `#3B82F6` |
| Light green | `#EAF8F3` |
| Primary text | `#17201D` |
| Secondary text | `#66736E` |
| Background | `#FFFFFF` |
| Secondary background | `#F7FAF9` |
| Gold accent (sparingly) | `#D4A72C` |
| Error | `#DC2626` |
| Headings font | Inter Tight |
| UI text font | Inter |
| Wordmark size | ~20–22px, Semi Bold |

Spacing scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 (px)
Radius: ndogo (8–14px). Hakuna pills kila mahali.

---

## 3. Hatua za Ujenzi (kila hatua = kitu kinachoonekana)

### ✓ HATUA 0 — Msingi (Design System + Mock Data) — IMEKAMILIKA
**Lengo:** Lugha moja ya muonekano kabla ya kuunganisha skrini.
- Design tokens kama CSS variables
- Typography hierarchy (subtle, si kubwa kupita kiasi)
- Icon set (inline SVG, line style, consistent stroke)
- Component primitives: avatar, identity chip, button, chip, divider, badge
- Mock data tofauti: friends, channels, spaces, businesses, posts, reels, live, statuses
- **Output:** `style-guide` — ukurasa wa kuona rangi, herufi, na components zote.

### ✓ HATUA 1 — App Shell — IMEKAMILIKA
**Lengo:** Mfumo wa app unaobofywa.
- Header: `Pasihai` upande wa kushoto; 🔔 👤 ⋮ kama group moja compact upande wa kulia
- Bottom navigation (5 destinations) + switching ya kurasa
- Kurasa za placeholder kwa Soga, Gundua, Spaces, Business — kwa mtindo wa brand, si tupu
- Responsive frame: mobile, tablet, desktop
- **Output:** shell inayobofywa — nav inafanya kazi.

### ◻ HATUA 2 — Mkondo wa Home (feed + identity system) — INAFUATA
- **Status/Stories row:** `＋ Your Status` + status za marafiki, ring (viewed/unviewed), horizontal scroll huru
- **Feed navigation:** Mchanganyiko | Reels | Friends | Channels | Live (Mchanganyiko = default)
- **Content filter:** compact dropdown (All ▾ / Mchanganyiko ▾) — secondary, si tabs nyingine
- **Create area:** `[DP] What's happening?` + Photo · Video · Post · Reel · Live
- **Output:** mifupa ya Home yote ikiwa sahihi kwa hierarchy.

### HATUA 3 — Feed na Aina za Content
- Post ya kawaida: avatar, jina, relationship + muda, maandishi, media, actions (♡ 💬 ↗ Save)
- **Identity system** ikiwa consistent: Friend · Channel · Hub · Business · Space
- Aina za content: text, text+image, video-first, long post, poll card, announcement, live activity
- Local interactions: like, save, react states
- **Output:** feed halisi ya kuonekana na kubofywa.

### HATUA 4 — View Modes + More Menu
- **Automatic / Vertical / Horizontal (Full Scroll)** — selector ndani ya More menu / Feed Preferences
- More menu ya Home pekee: Feed preferences · View mode · Content preferences · Saved · Data saver · Refresh · Settings
- Horizontal mode = mazingira ya kutazama content kwa undani (si stories row)
- **Output:** kubadilisha modes kunaonekana tofauti wazi.

### HATUA 5 — Tabs za Home
- **Reels:** immersive vertical
- **Friends:** post za marafiki tu — first-class
- **Channels:** one-to-many publishing, update-style, si chat
- **Live:** video live, audio live, live activity (video/audio/text/location/mixed), categories
- **Output:** kila tab ina utambulisho wake wa muonekano.

### HATUA 6 — Notifications, Profile/Account, Story Viewer
- Notifications panel
- Profile/Account preview: Friends · Following · Followers · Channels · Spaces (inajieleza vizuri hata followers = 0)
- Story/Status viewer (fullscreen)
- **Output:** panels za header zote zinafanya kazi.

### HATUA 7 — Unganisho (Integration)
- Kuunganisha kila kitu kwenye app moja
- State ya pamoja: active tab, view mode, filter, likes, saves, follow/friend states
- **Output:** `pasihai-home-prototype` — app moja kamili.

### HATUA 8 — Responsive Polish + QA
- Mobile / tablet / desktop — desktop si mobile iliyonyooshwa
- Checklist ya rules zote (kutoka spec) — hakuna kukiuka
- Accessibility: focus states, aria labels, contrast
- **Output:** final prototype + ripoti fupi ya QA.

---

## 4. Jinsi tutakavyofanya kazi

1. Kila hatua: **mimi najenga → wewe unaona preview → unatoa maoni → tunasafisha → tunaendelea.**
2. Hatua moja haijaanza mpaka iliyotangulia ikubaliwe.
3. Ikiwa kuna kitu kipya tunachoona kinahitajika, kitaongezwa kwenye roadmap kwa idhini yako.
4. Vitu vilivyoachwa kwa makusudi: backend, auth, real-time, mesh, payments, production APIs.

---

## 5. Ramani ya Navigation (ukumbusho wa mipaka)

| Eneo | Kazi | Hali |
|---|---|---|
| **Home** | Consume — kutazama content | 5 tabs za Home |
| **Soga** | Communicate — mawasiliano | Bottom nav |
| **Gundua** | Discover — kugundua | Bottom nav |
| **Spaces** | Participate — Hubs, Communities, Groups, Private Spaces | Bottom nav |
| **Business** | Operate — biashara | Bottom nav |

Mipaka hii haivunjwi kwa kuweka Groups/Hubs/Nearby ndani ya Home.
