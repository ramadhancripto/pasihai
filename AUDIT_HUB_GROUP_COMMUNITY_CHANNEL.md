# PASIHAI — Audit: Home Feed, Hub, Group, Community, Channel

Hali: AUDIT TU. Hakuna code iliyobadilishwa katika hatua hii.
Tarehe ya ukaguzi: 2026-10-09.

## 1. Mambo ya msingi ya mfumo

- Frontend pekee. Data yote inatoka kwenye `src/data/mock.js` kupitia `src/data/repositories/*`.
- Hakuna backend, hakuna API call (`fetch`/`axios`/`supabase` hazikupatikana), hakuna auth.
- Kwa hiyo ruhusa (roles, permissions, comment policy, private feedback) **hazitekelezwi na backend**.
  Ruhusa zote zitakazowekwa zitakuwa UI/model pekee, na lazima zitangazwe waziwazi kama hivyo.
- Hakuna audit trail iliyopatikana kwenye ukaguzi wa msimbo.

## 2. Home Feed

| Kipengele | Hali | Maelezo |
|---|---|---|
| Tabs (Mchanganyiko, Reels, Friends, Channels, Live) | Zipo | Lebo na orodha vinatoka `catalogRepository.getHomeTabs()`. |
| Jina "Mchanganyiko" → "Kwa ajili yako" | Inawezekana | Ni mabadiliko ya lebo kwenye catalog pekee. |
| Chanzo cha data ya kila tab | **Kinachanganya** | Tabs zote zinachuja orodha MOJA ya feed (`feedService.getFeed`): Reels = `source==='reel'`, Friends = `entity.type==='friend'`, Channels = `entity.type==='channel'`, Live = `source==='liveSession'`. Hakuna feed tofauti kwa kila tab. |
| Data | Mock | Haijawekwa alama ya "sampuli" kwenye UI. |

## 3. Hub (Jamii kuu)

| Kipengele | Hali | Maelezo |
|---|---|---|
| Entity ya Hub | Ipo | `type: 'hub'` kwenye `mock.js` (k.m. Morogoro Organic Farming Hub, Dar Tech Hub). |
| Wanachama/Team roles | Sehemu | `spacesRepository` ina `team` (Owner, Mwanachama) na `memberRoles`. Hakuna moderator/admin role kamili. |
| Posts za wanachama kulingana na ruhusa | **Haijathibitishwa** | Hakuna sheria ya "nani anaweza kuchapisha" iliyopatikana. |
| Announcements | Sehemu | Feed ina `kind: 'announcement'` (mock 689), lakini hakuna ruhusa ya kuchapisha announcement. |
| Replies za faragha kwa admin | **Haipo** | Hakuna model ya private reply. |
| Hub yenye Groups/Communities nyingi | **Haipo** | Hakuna uhusiano wa parent/child kati ya Hub na Groups. |

## 4. Group (Mazungumzo)

| Kipengele | Hali | Maelezo |
|---|---|---|
| Entity ya Group | Ipo | `type: 'group'` kwenye chat (c2 Madaktari Class, c3 Wakulima Dar, c5 Flutter & AI Developers). |
| Uhusiano na Hub/Community | Sehemu | Chat ya Wakulima Dar inaonyesha "Kikundi · Wakulima Tanzania" kama metadata ya maandishi tu. |
| Ujumbe, reactions, faili | Zipo | Thread ina ujumbe, reactions, faili (kiwango cha UI). |
| Admin kudhibiti kujiunga, roles na kanuni | **Haipo** | Hakuna model ya admin wa Group. |
| Group tofauti na public post comments | Zipo kiasi | Thread ya chat haichanganyiki na comments za post, lakini hakuna uthibitisho kwenye code. |

## 5. Community (Jumuiya)

| Kipengele | Hali | Maelezo |
|---|---|---|
| Entity ya Community | Ipo | `type: 'community'` (k.m. Wakulima Tanzania, Afya kwa Jamii). |
| Announcements za admin | **Haipo** | Hakuna chanzo cha announcement cha Community. |
| Groups nyingi zinazohusiana | **Haipo** | Hakuna uhusiano wa Community → Groups. |
| Feedback ya faragha (admin/moderator pekee) | **Haipo** | Hakuna model wala UI ya feedback ya faragha. |
| Tofauti na Group/Channel | Kiasi | Ina lebo na aikoni yake (IconGlobe), lakini model yake ni sawa na Hub. |

## 6. Channel

| Kipengele | Hali | Maelezo |
|---|---|---|
| Entity ya Channel | Ipo | `type: 'channel'` (k.m. Pasihai Updates, Tech Sasa, Elimu Yetu). |
| Waandishi walioidhinishwa | **Haipo** | Hakuna model ya waandishi. |
| Follow / react / share / copy | Sehemu | Follow ipo (`isFollowing`). Vitendo vingine vinatakiwa kuthibitishwa kwenye UI. |
| Comments: Everyone / Followers only / Admins only / Off | **Haipo** | Hakuna maneno hayo kwenye UI wala mock. |
| Private Channel (access ya maudhui) | Sehemu | Kuna `priv` / "private-listed" kwenye spaces, lakini access control ya maudhui haijathibitishwa. |
| Collaboration na audit trail | **Haipo** | Hakuna model ya collaborator wala audit log. |

## 7. Mapping ya models zilizopo (PENDEKEZO — inasubiri idhini, hakuna code iliyobadilishwa)

### 7.1 Home feed: chanzo kimoja, sheria tano tofauti (hakuna module mpya)

Hali ya sasa: `feedService.getFeed` inatumia `listFeed()` moja, kisha `TAB_RULES` zinachuja tu.
Pendekezo: kubadilisha `TAB_RULES` kuwa `TAB_SOURCES` ndani ya `feedService.js` (module ileile).
Kila tab inapata: sheria ya chanzo, sheria ya mpangilio, na lebo kutoka catalog.

| Tab (lebo mpya) | ID | Chanzo | Mpangilio | Mabadiliko kutoka sasa |
|---|---|---|---|---|
| Kwa ajili yako (For You) | `mchanganyiko` (ID ibaki) | Friends + Channels zinazofuatwa + Hubs/Communities + Creators; si Live | Score iliyopo (relationship + recency + type) | Lebo tu, na sasa inachuja kwa "zinazofuatwa" |
| Friends | `friends` | `entity.type === 'friend'` pekee | Recency (mpya kwanza) | Hakuna mabadiliko ya chanzo; ongeza recency-only ordering |
| Reels | `reels` | `source === 'reel'` pekee | Views/recency | Hakuna mabadiliko ya chanzo |
| Channels | `channels` | `entity.type === 'channel'` **na `isFollowing(entity.id)`** | Recency | **Mabadiliko ya tabia:** sasa inaonyesha channels zote, si zinazofuatwa |
| Live | `live` | `source === 'liveSession'` pekee | live > upcoming > replay (kama sasa) | Hakuna mabadiliko |

Kanuni za usalama wa tabia:
- Hakuna feed mbili zinazofanana: kila tab inatofautishwa na chanzo (friend / reel / channel / liveSession) na si na lebo tu.
- `mine` (chapisho langu) kwa sasa linapanda juu kila tab. Pendekezo: libaki kwenye "Kwa ajili yako" na "Friends" tu. (Inahitaji idhini.)
- Mock data: feed nzima ni mock. Hakuna kuonyesha kuwa ni data halisi; maelezo yatawekwa kwenye audit.

### 7.2 Uhusiano kati ya Hub, Group, Community na Channel (PENDEKEZO)

- **Hub** = jamii pana (chuo, mtaa, taasisi). Inaweza kuwa na **Groups** na **Communities** nyingi. Ina wanachama, moderators na announcements.
- **Community** = kundi lenye kusudi na uongozi. Inaweza kuwa na **Groups** nyingi zinazohusiana, na inaweza kuwa ndani ya Hub au kujitegemea. Ina announcements na feedback (ya faragha au ya umma).
- **Group** = mazungumzo ya wanachama. Inaweza kuwa ndani ya Hub/Community (`parentId`) au kujitegemea (`parentId: null`). Haichanganyiki na comments za post.
- **Channel** = jukwaa la mmiliki/creator/taasisi. Kwa kawaida kujitegemea. Ina waandishi, followers na comment policy. Si Group wala Community.

Mapping kwa models zilizopo (bila kuunda entity mpya):
- Hub → `spaces` entity, `type: 'hub'`; ongeza `children: { groups[], communities[] }` na `team` roles (owner / admin / moderator / member).
- Community → `spaces` entity, `type: 'community'`; ongeza `parentId` (Hub, au null) na `children.groups[]`; `announcements` kutoka team roles.
- Channel → `spaces` entity, `type: 'channel'`; ongeza `commentPolicy` (`everyone` | `followers` | `admins` | `off`) na `writers[]`.
- Group → chat entity, `type: 'group'`; ongeza `parentId` (Hub au Community, au null) na `roles`.

Mipaka ya utekelezaji: haya yote ni model/UI ya frontend. Ruhusa hazitekelezwi na backend, na hilo litaandikwa wazi kwenye UI na audit.

### 7.3 Hatua zinazofuata baada ya idhini
1. Home tabs (7.1) pekee: tekeleza, test, build.
2. Channel (commentPolicy, writers).
3. Hub, Community, Group (7.2).

## 8. Mambo ya kuthibitisha na mtumiaji

1. "Tumia vyote ili isijaze sehemu ya card" kwenye Mchanganyiko: maana yake haieleweki kwangu.
2. Ruhusa ziwekwe kama UI/model tu (bila backend), na zitangazwe kama hivyo?
