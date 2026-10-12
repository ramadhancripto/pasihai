# PASIHAI — PHASE 1: CHAT FUNCTIONALITY + UI SIMPLIFICATION
## Tarehe: 2026-10-12

---

## AUDIT RESULTS

### BUG 1 (CRITICAL): RLS blocks chat_conversations INSERT — Error 42501
- **Root Cause:** Migration 027 (`027_fix_spaces_chat_rls.sql`) is NOT deployed to Supabase production
- **Effect:** No user can start any new direct conversation — `startDirect()` returns `null`
- **Error:** `new row violates row-level security policy for table "chat_conversations"`
- **Files:** `supabaseChatRepository.startDirect()`, `027_fix_spaces_chat_rls.sql`
- **Fix:** Run `FIX-CHAT-RLS.sql` in Supabase Dashboard → SQL Editor

### BUG 2 (CRITICAL): getConversation returns raw messages — Thread renders blank
- **Root Cause:** `getConversation()` maps messages with `{ senderId, createdAt }` but Thread expects `{ from: 'me'|'them', at: '14:30', kind: 'text', state: 'synced' }`
- **Effect:** Even if conversation opens (after Bug 1 fix), all messages appear as blank/invisible
- **Files:** `supabaseChatRepository.getConversation()`
- **Fix:** Use `toUiMessage()` (already exists) instead of raw mapping

### BUG 3 (SEMANTIC): PersonCard shows "Kufuata" for ordinary persons
- **Root Cause:** `not_friend` state shows Omba Urafiki + Kufuata + Unganika + Ujumbe
- **Effect:** Confusing — "Kufuata" (Follow) is a Channel action, not a person action
- **Files:** `GunduaBits.jsx`, `FeedSocialBar.jsx`, `FeedItem.jsx`
- **Fix:** Remove Kufuata/Unganika for persons; keep for channels only

---

## FIXES APPLIED (Code)

| # | File | Fix |
|---|------|-----|
| 1 | `src/data/repositories/supabaseChatRepository.js` | `getConversation` — use `toUiMessage(m, user.id)` instead of raw mapping |
| 2 | `src/components/gundua/GunduaBits.jsx` | PersonCard `not_friend` — Omba Urafiki + Ujumbe only; `sent` — Ombi limetumwa only |
| 3 | `src/components/feed/FeedSocialBar.jsx` | Channel: Kufuata only; Person: Omba Urafiki + Ujumbe only |
| 4 | `src/components/feed/FeedItem.jsx` | Remove `onConnect` prop; include channels in showSocial |
| 5 | `src/components/feed/FeedList.jsx` | Remove `handleConnect`; remove `onConnect` prop |
| 6 | `src/styles/feed.css` | Add `.psh-feedtext__more` CSS for "Zaidi" button |

### Previous session fixes (still active):
| # | File | Fix |
|---|------|-----|
| 7 | `src/services/gunduaService.js` | `openChat()` null safety |
| 8 | `src/pages/Gundua.jsx` | `chat()` action null safety + error toast |
| 9 | `FIX-CHAT-RLS.sql` | Complete SQL for RLS fix (user must run in Supabase Dashboard) |

---

## FIX-CHAT-RLS.sql (Must run in Supabase Dashboard)

This SQL is **idempotent** — safe to run multiple times.

**What it does:**
1. Creates `is_chat_member()` helper function (SECURITY DEFINER)
2. Re-creates `chat_conversations` INSERT policy
3. Re-creates `chat_conversations` SELECT policy (uses helper)
4. Re-creates `chat_participants` INSERT/UPDATE/DELETE policies

**How to run:**
1. Go to https://supabase.com/dashboard/project/lbcpacijbiukqcpkfktp
2. Click "SQL Editor"
3. Paste contents of `FIX-CHAT-RLS.sql`
4. Click "Run"

---

## FRIEND VS CHANNEL SEMANTICS (Applied)

| Entity Type | Actions |
|-------------|---------|
| Ordinary person | Omba Urafiki / Rafiki / Ombi limetumwa / Kubali / Kataa |
| Channel | Kufuata / Unamfuata / Umeacha kufuata |
| Hub/Business | (existing actions preserved) |

**Removed for persons:**
- ~~Kufuata~~ (Follow — channel only)
- ~~Unganika~~ (Connect — redundant with Omba Urafiki)

**Preserved:**
- Ujumbe (Message) — available even before friend request accepted

---

## UI SIMPLIFICATION (Applied)

1. **"Zaidi" button** — already exists (280 char limit); added CSS `.psh-feedtext__more`
2. **PersonCard** — simplified from 4 buttons to 2 (Omba Urafiki + Ujumbe)
3. **FeedSocialBar** — simplified from 4 buttons to 2 (Omba Urafiki + Ujumbe) for persons

---

## TESTS

### Automated
```
Build:  ✅ 5.51s
Smoke:  ✅ 510/510 zimepita
Regressions: 0
```

### Live Tests (CANNOT VERIFY — requires Supabase credentials + 2 accounts)
| # | Test | Status |
|---|------|--------|
| 1 | A ↔ B marafiki, A anafungua B na kuanzisha Chat | ❌ NOT TESTED — requires RLS fix deployment |
| 2 | A anatuma ujumbe; B anaupata | ❌ NOT TESTED — requires live Supabase |
| 3 | B anajibu; A anaupata | ❌ NOT TESTED |
| 4 | Conversation persists after app restart | ❌ NOT TESTED |
| 5 | No duplicate conversations | ❌ NOT TESTED |
| 6 | Non-friend/channel rules | ❌ NOT TESTED (code-level verified) |
| 7 | No unauthorized access | ❌ NOT TESTED (RLS-level verified) |
| 8 | Post ndefu ina "Zaidi" | ✅ Code verified |
| 9 | Icon-only actions | ✅ Code verified |
| 10 | Responsive 320–412px | ✅ CSS verified |

**Wazi:** Haijathibitishwa live kwa sababu credentials/network hazipo kwenye sandbox. RLS fix inahitaji kutekelezwa kwenye Supabase Dashboard.

---

## RISKS

1. **Migration 027 deployment** — if other migrations depend on 027, they must run in order
2. **is_chat_member() function** — uses SECURITY DEFINER; must be reviewed for security
3. **Message realtime** — no Supabase Realtime subscription; messages only appear on manual refresh/polling
4. **Existing conversations** — conversations created before RLS fix may have inconsistent data

---

## HATUA INAYOFUATA

1. **Run FIX-CHAT-RLS.sql** in Supabase Dashboard (highest priority)
2. **Deploy code changes** — rebuild and deploy app
3. **Test with 2 accounts** — verify full chat flow
4. **Add Supabase Realtime** — for live message delivery (Phase 2)
5. **Profile edit UI** — avatar/cover upload (Phase 2)
6. **Push notifications** — Service Worker + Push API (Phase 3)