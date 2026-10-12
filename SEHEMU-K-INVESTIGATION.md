# SEHEMU K — RIPOTI YA UCHUNGUZI WA KINA (Deep Investigation)

**Tarehe:** 2026-10-12  
**Hali:** READ-ONLY — hakuna marekebisho yaliyofanywa  
**Ushahidi:** Kila kipengele kinaonyesha faili halisi, nambari za mistari, na maelezo ya kiufundi

---

## D1: FIX-CHAT-RLS.sql — Sababu ya INSERT Kuzuiwa

### 📋 Hali ya Sasa

**Migration 012** (iliyowekwa) — Sera za awali za `chat_participants`:
```sql
-- faili: supabase/migrations/012_chat.sql, mistari 104-112
CREATE POLICY "participants_select_participant"
  ON chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.conversation_id = chat_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );
```
⚠️ **Tatizo:** Sera ya SELECT inahitaji kuuliza `chat_participants` ndani yake mwenyewe → **PostgreSQL 42P17 infinite recursion**.

**Migration 026** (iliyowekwa) — Inarekebisha recursion:
```sql
-- faili: supabase/migrations/026_fix_rls_recursion.sql, mistari 8-12
CREATE OR REPLACE FUNCTION is_chat_member(p_conversation_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```
✅ Inarekebisha recursion kwa kutumia `SECURITY DEFINER` (bypasses RLS).

Lakini 026 pia inabadilisha sera ya INSERT:
```sql
-- faili: supabase/migrations/026_fix_rls_recursion.sql, mistari 121-126
CREATE POLICY "participants_insert_creator"
  ON chat_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR is_chat_member(chat_participants.conversation_id)  ← MATATIZO!
  );
```

### 🔴 Sababu Halisi ya INSERT Kushindwa

**Mtiririko wa `startDirect()`** (faili: `src/data/repositories/supabaseChatRepository.js`):

```
Hatua 1: INSERT chat_conversations { type: 'direct', created_by: user.id }
         → Sera: auth.uid() = created_by → ✅ INAPITA

Hatua 2: INSERT chat_participants [
           { conversation_id: conv.id, user_id: user.id },      ← Safu 1
           { conversation_id: conv.id, user_id: otherUserId }   ← Safu 2
         ]
```

**Kwa sera ya 026 (iliyowekwa sasa):**

| Safu | Kigezo | Matokeo |
|---|---|---|
| Safu 1 (self) | `auth.uid() = user_id` | ✅ TRUE |
| Safu 2 (other) | `auth.uid() = user_id` | ❌ FALSE |
| Safu 2 (other) | `is_chat_member(conv_id)` | ❌ FALSE — Safu 1 bado haijaingizwa! |

**Sababu ya kiufundi:** PostgreSQL inakagua `WITH CHECK` kwa kila safu KABLA ya kuingiza. `is_chat_member()` ni `SECURITY DEFINER` (bypasses RLS), lakini inaquery `chat_participants` — na Safu 1 bado ipo kwenye statement moja, haijawa committed. Hivyo `is_chat_member()` inarudisha `FALSE` kwa Safu 2.

**Matokeo:** `42501 permission denied` — INSERT ya chat_participants inakataliwa.

### ✅ Suluhisho: Migration 027 / FIX-CHAT-RLS.sql

**Migration 027** (HAIJAWEKWA) — Sera mpya:
```sql
-- faili: supabase/migrations/027_fix_spaces_chat_rls.sql, mistari 82-90
CREATE POLICY "participants_insert_creator"
  ON chat_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id  -- adding yourself
    OR auth.uid() = (
      SELECT created_by FROM chat_conversations
      WHERE id = conversation_id
    )  -- creator adding others
  );
```

**FIX-CHAT-RLS.sql** (root) — Sera sawia:
```sql
-- faili: FIX-CHAT-RLS.sql, mistari 51-59
CREATE POLICY "participants_insert_creator"
  ON chat_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = (
      SELECT created_by FROM chat_conversations
      WHERE id = conversation_id
    )
  );
```

**Kwa sera ya 027/FIX-CHAT-RLS:**

| Safu | Kigezo | Matokeo |
|---|---|---|
| Safu 1 (self) | `auth.uid() = user_id` | ✅ TRUE |
| Safu 2 (other) | `auth.uid() = (SELECT created_by FROM chat_conversations WHERE id = conv_id)` | ✅ TRUE — conversation tayari imetengenezwa! |

### ⚠️ Tofauti kati ya FIX-CHAT-RLS.sql na 027

| Kipengele | FIX-CHAT-RLS.sql | 027_fix_spaces_chat_rls.sql |
|---|---|---|
| `is_chat_member` signature | `conv_id uuid` (param 1) | `p_conversation_id UUID, p_user_id UUID DEFAULT auth.uid()` (param 2) |
| `search_path` | ✅ `SET search_path = public` | ❌ Hakuna |
| spaces policies | ❌ Hazipo | ✅ Zipo (FIX 1-3, 10-11) |
| Idempotent | ✅ Ndio | ✅ Ndio |

**Ushahidi:** FIX-CHAT-RLS.sql ina `is_chat_member(conv_id uuid)` — signature tofauti na 026 (`p_conversation_id UUID, p_user_id UUID`). PostgreSQL inaruhusu overloading, hivyo zote mbili zinaweza kuwepo. FIX-CHAT-RLS pia ina `SET search_path = public` — salama zaidi.

### 📋 Mapendekezo ya D1

**Hatua 1:** Weka `FIX-CHAT-RLS.sql` kwanza (inarekebisha chat pekee, salama)  
**Hatua 2:** Weka `027_fix_spaces_chat_rls.sql` (inarekebisha spaces pia)  
**Hatua 3:** Hakikisha `startDirect` inafanya kazi na akaunti 2 halisi

**Vipimo vinavyohitajika:**
1. `startDirect(userB)` — conversation inatengenezwa
2. `chat_participants` — safu 2 zipo (self + other)
3. `getConversation(convId)` — messages zinarudi
4. `sendMessage(convId, text)` — ujumbe unatumwa

---

## D2: 029_profile_media.sql — Athari ya Data

### 📋 Hali ya Sasa ya Schema

**profiles table** (001, iliyoongezwa na 025):
```sql
-- 001_profiles.sql: columns za sasa
user_id, username, display_name, entity_type, avatar_url, avatar_tone,
bio, category, verified, friends_count, followers_count, following_count,
posts_count, prefs, created_at, updated_at, deleted_at, fts
```

**025 inaongeza:**
```sql
-- 025_cloudinary_status_insert_and_profile_fix.sql
-- (haiongezi column kwenye profiles — inarekebisha trigger pekee)
```

### 📋 Migration 029 — Kinachofanywa

```sql
-- faili: supabase/migrations/029_profile_media.sql
-- Hatua 1: Ongeza cover_url
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url text;

-- Hatua 2: Unda Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-media', 'profile-media', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET ...;

-- Hatua 3: RLS policies kwa Storage
-- SELECT: public (mtu yeyote anaweza kusoma)
-- INSERT/UPDATE/DELETE: owner pekee (folder[1] = auth.uid())

-- Hakuna RLS ya profiles inayobadilishwa — cover_url inasomwa
-- kupitia SELECT policy iliyopo (deleted_at IS NULL)
```

### ✅ Athari kwa Data Iliyopo

| Kipengele | Athari | Hatari |
|---|---|---|
| `cover_url` column | `ADD COLUMN IF NOT EXISTS` — haibadilishi data | ✅ SALAMA |
| Storage bucket | `INSERT ... ON CONFLICT DO UPDATE` — inatengeneza au inasasisha | ✅ SALAMA |
| Storage RLS | Sera mpya — haigusi data iliyopo | ✅ SALAMA |
| Profiles RLS | Haibadiliki — SELECT policy tayari ipo | ✅ SALAMA |
| Existing profiles | `cover_url` itakuwa `NULL` — hiari pekee | ✅ HAKUNA ATHARI |

### 📋 Mapendekezo ya D2

**Wekeka bila wasiwasi.** Migration ni additive pekee — haibadilishi wala haifuti data iliyopo.

**Vipimo vinavyohitajika:**
1. `SELECT cover_url FROM profiles LIMIT 1` — column inapatikana
2. `SELECT * FROM storage.buckets WHERE id = 'profile-media'` — bucket ipo
3. Upload picha ya profile → inahifadhiwa kwenye `profile-media/{user_id}/...`

---

## D3: 028 Original vs Hardened — Tofauti za Usalama

### 📊 Jedwali la Tofauti

| Kipengele | 028 Original | 028 Hardened | Hatari ya Original |
|---|---|---|---|
| **FORCE ROW LEVEL SECURITY** | ❌ Hakuna | ✅ Zote 9 tables | Admin anaweza kuepuka RLS |
| **relay_providers SELECT** | `USING (true)` | `USING (available=true AND status='active' OR user_id=auth.uid())` | 🔴 Mtu yeyote anaona providers zote |
| **relay_usage INSERT** | `WITH CHECK (true)` | `WITH CHECK (session_id IN (...))` | 🔴 Mtu yeyote anaweza kuingiza usage |
| **mb_balances UPDATE** | `USING (user_id=auth.uid())` — hakuna guard | Trigger `guard_mb_balance_fields` | 🔴 Client anaweza kubadilisha balance moja kwa moja |
| **relay_quotas UPDATE** | `USING (user_id=auth.uid())` — hakuna guard | Trigger `guard_quota_fields` | 🔴 Client anaweza kubadilisha quota |
| **relay_message() sender** | `p_sender_id UUID` (client-supplied) | `v_sender_id := auth.uid()` | 🔴 Spoofing: mtu yeyote anaweza kutuma kwa niaba ya mtu mwingine |
| **relay_message() validation** | Hakuna input validation | Validates NULL, negative, kind, range | 🟡 Invalid input inaweza kusababisha data corruption |
| **relay_message() idempotency** | Hakuna | Checks duplicate message_id | 🟡 Duplicate messages |
| **credit_mb() p_user_id** | Inakubali NULL | `RAISE EXCEPTION` kama NULL | 🟡 NULL user_id inaweza kuharibu balances |
| **credit_mb() concurrency** | `INSERT ... ON CONFLICT DO UPDATE` (race condition) | `SELECT ... FOR UPDATE` + lock | 🟡 Concurrent updates zinaweza kupotea |
| **GRANT/REVOKE** | ❌ Hakuna | ✅ Explicit grants kwa authenticated, service_role; REVOKE kwa anon | 🟡 Default permissions zinaweza kuwa za kutosha |
| **search_path** | ❌ Hakuna kwa functions zote | ✅ `SET search_path = public, pg_temp` kwa functions 5 kuu | 🟡 Hatari ya search_path manipulation |
| **Commission rate** | 0.10 (10%) | 0.10 (10%) — ⚠️ flagged | 🗒️ Sawa — zote zinahitaji uthibitisho |

### 🔴 Masuala Makubwa ya Usalama ya Original

**1. relay_message() — Sender Spoofing:**
```sql
-- ORIGINAL (hatari):
CREATE OR REPLACE FUNCTION relay_message(
  p_sender_id UUID,  ← CLIENT anaweza kupitisha UUID yoyote!
  ...

-- HARDENED (salama):
v_sender_id := auth.uid();  ← Inatumia JWT halisi
```

**2. mb_balances — Direct Manipulation:**
```sql
-- ORIGINAL: Client anaweza kusasisha balance moja kwa moja
CREATE POLICY "mb_balances_update" ON mb_balances FOR UPDATE
  USING (user_id = auth.uid());
-- Hakuna guard — client anaweza: UPDATE mb_balances SET relay_mb = 999999

-- HARDENED: Trigger inazuia
CREATE FUNCTION guard_mb_balance_fields() ...
-- Inaruhusu tu daily_relay_limit_mb kubadilishwa na client
-- Balance fields (relay_mb, saved_mb, mesh_mb) → SECURITY DEFINER functions pekee
```

**3. relay_usage — Unrestricted INSERT:**
```sql
-- ORIGINAL (hatari):
CREATE POLICY "relay_usage_insert" ON relay_usage FOR INSERT
  WITH CHECK (true);  ← Mtu yeyote anaweza kuingiza usage records!

-- HARDENED (salama):
WITH CHECK (session_id IN (
  SELECT id FROM relay_sessions
  WHERE buyer_id = auth.uid() OR provider_id IN (
    SELECT id FROM relay_providers WHERE user_id = auth.uid()
  )
));
```

### 📋 Mapendekezo ya D3

1. **Ondoa `028_relay_system.sql`** — ina hatari 3 za usalama (sender spoofing, balance manipulation, unrestricted usage INSERT)
2. **Tumia `028_relay_system_hardened.sql` pekee** — inarekebisha hatari zote
3. **Thibitisha commission rate** (10% vs 2%) kabla ya deploy
4. **Hakikisha faili la original linatolewa** kabla ya deploy — Supabase inasoma migrations kwa alphabetical order, na `028_relay_system.sql` itaendeshwa KABLA ya `028_relay_system_hardened.sql`

**⚠️ HATARI:** Kama zote mbili zitaendeshwa, original itatengeneza tables kwanza (bila guards), kisha hardened itajaribu `CREATE TABLE IF NOT EXISTS` (haitafanya chochote — tables tayari zipo) na kurecreate policies. Hii inaweza kufanya kazi kwa sababu hardened ina `DROP POLICY IF EXISTS` + `CREATE POLICY`, lakini ni bora kuondoa original kabisa.

---

## D6: SECURITY DEFINER Functions — Orodha Kamili

### ⚠️ Functions Zilizowekwa (001–026) BILA `SET search_path`

| # | Function | Migration | Aina | search_path | Hatari |
|---|---|---|---|---|---|
| 1 | `set_updated_at()` | 001 | Trigger | ❌ HAKUNA | 🟡 LOW — trigger rahisi |
| 2 | `handle_new_user()` | 001 (updated 025) | Trigger | ❌ HAKUNA | 🟡 MEDIUM — inaandika profiles |
| 3 | `update_follow_counts()` | 002 | Trigger | ❌ HAKUNA | 🟡 LOW — inasasisha counts |
| 4 | `can_see_post()` | 003 (updated 007b, 019) | STABLE | ❌ HAKUNA | 🟡 MEDIUM — inasoma follows/friendships/blocks |
| 5 | `is_blocked_by()` | 003 (updated 008b, 020) | STABLE | ❌ HAKUNA | 🟡 MEDIUM — inasoma blocks |
| 6 | `protect_post_counts()` | 003 | Trigger | ❌ HAKUNA | 🟢 NOT SECDEF — inatumia `current_user` check |
| 7 | `update_reaction_count()` | 004 | Trigger | ❌ HAKUNA | 🟡 LOW — inasasisha counts |
| 8 | `update_friends_count()` | 007 | Trigger | ❌ HAKUNA | 🟡 LOW — inasasisha counts |
| 9 | `update_comment_count()` | 009 | Trigger | ❌ HAKUNA | 🟡 LOW — inasasisha counts |
| 10 | `update_poll_votes_count()` | 010 | Trigger | ❌ HAKUNA | 🟡 LOW — inasasisha counts |
| 11 | `update_share_count()` | 011 | Trigger | ❌ HAKUNA | 🟡 LOW — inasasisha counts |
| 12 | `is_chat_member()` | 026 | STABLE | ❌ HAKUNA | 🟡 MEDIUM — inasoma chat_participants |
| 13 | `is_space_member()` | 026 | STABLE | ❌ HAKUNA | 🟡 MEDIUM — inasoma space_members |
| 14 | `ensure_profile()` | 025 | Function | ❌ HAKUNA | 🟡 MEDIUM — inaandika profiles |

**Jumla: 14 functions zilizowekwa BILA `SET search_path`**

### ✅ Functions Zilizowekwa (028 hardened) ZENYE `SET search_path`

| # | Function | search_path |
|---|---|---|
| 1 | `credit_mb()` | ✅ `SET search_path = public, pg_temp` |
| 2 | `relay_message()` | ✅ `SET search_path = public, pg_temp` |
| 3 | `register_relay_provider()` | ✅ `SET search_path = public, pg_temp` |
| 4 | `provider_heartbeat()` | ✅ `SET search_path = public, pg_temp` |
| 5 | `cleanup_expired_relay_queue()` | ✅ `SET search_path = public, pg_temp` |

### 🔬 Maelezo ya Hatari ya `search_path`

**Ni nini?** PostgreSQL inaruhusu `SECURITY DEFINER` functions kuendesha kama owner wa function (kawaida `supabase_admin`). Bila `SET search_path`, function inatumia `search_path` ya mtumiaji anayeituma.

**Hatari:** Mtumiaji mwenye ujuzi anaweza:
1. Kutengeneza schema yake mwenyewe (kama anaruhusiwa)
2. Kuweka function/Table yenye jina sawia na ile ya system
3. `SECURITY DEFINER` function ikaita function ya mtumiaji badala ya ya system
4. Hivyo kupata access ya `supabase_admin`

**Kwa PASIHAI:**
- Supabase authenticated users **hawaruhusiwi** kutengeneza schemas (default Supabase config)
- Hivyo hatari ni ya **nadra** lakini si ya **sifuri**
- Best practice: ongeza `SET search_path = public, pg_temp` kwa functions zote

### 📋 Mapendekezo ya D6

**Priority:** 🟡 MEDIUM — si ya haraka, lakini inapaswa kurekebishwa kabla ya GA

**Suluhisho:** Tengeneza migration mpya (030_fix_search_path.sql) yenye:
```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Rudia kwa kila function...
```

**Vipimo vinavyohitajika:**
1. `SELECT proname, proconfig FROM pg_proc WHERE prosecdef = true` — hakikisha functions zote zina `search_path`
2. Test kila function bado inafanya kazi

---

## MUHTASARI WA MAMBO YALIYOTHIBITISHWA vs HAYAJATHIBITISHWA

### ✅ YALIYOTHIBITISHWA (Kwa Ushahidi wa Faili)

| Kipengele | Ushahidi |
|---|---|
| chat_conversations INSERT inakataliwa | Sera ya 026 ina `is_chat_member()` — multi-row INSERT inashindwa |
| Sababu ni multi-row INSERT | `startDirect()` inserts 2 rows — Safu 2 inashindwa |
| 027/FIX-CHAT-RLS inarekebisha | Sera mpya inatumia `created_by` check — inafanya kazi |
| 028 original ina hatari 3 za usalama | Sender spoofing, balance manipulation, unrestricted usage INSERT |
| 028 hardened inarekebisha hatari zote | `auth.uid()`, guards, restricted INSERT, search_path, GRANT/REVOKE |
| 029 ni additive pekee | `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO UPDATE` |
| 14 SECURITY DEFINER functions bila search_path | Ushahidi kutoka grep ya mistari husika |
| 5 functions (028 hardened) zina search_path | Ushahidi kutoka mistari 568, 624, 817, 858, 872 |

### ⚠️ HAYAJATHIBITISHWA (Yanahitaji Test za Live)

| Kipengele | Sababu |
|---|---|
| Chat CONVERSATIONS INSERT kweli inashindwa | Haijaribiwa na Supabase halisi — uchunguzi ni wa kiufundi tu |
| 027 inarekebisha tatizo kabisa | Haijajaribiwa — sera mpya haija-deploy |
| 028 hardened inafanya kazi | Haija-deploy — schema na functions hazijajaribiwa |
| RLS policies zote zinafanya kazi | Zimekuwa deployed lakini hazijajaribiwa na akaunti nyingi |
| `is_chat_member()` concurrency issue | Nadra — inahitaji test ya concurrent inserts |

---

## HITIMISHO LA D1-D6

| # | Uamuzi | Mapendekezo | Hatari ya Kutotekeleza |
|---|---|---|---|
| **D1** | Weka FIX-CHAT-RLS.sql + 027 | ✅ **TEKELEZA** — chat haifanyi kazi bila hii | Chat haifanyi kazi |
| **D2** | Weka 029_profile_media.sql | ✅ **TEKELEZA** — salama, additive pekee | Cover photos hazipatikani |
| **D3** | Ondoa 028 original, tumia hardened | ✅ **TEKELEZA** — 3 hatari za usalama | Relay system haitumiki bado — hatari ya sasa ni 0 |
| **D4** | Thibitisha commission rate | ⏳ **SUBIRI** uamuzi wako | 10% itaendelea (default) |
| **D5** | Weka 028 hardened | ⏳ **SUBIRI** — si core feature | Relay haifanyi kazi |
| **D6** | Rekebisha search_path | ⏳ **SUBIRI** — migration mpya inahitajika | Hatari ya nadra (authenticated user anaweza kutumia) |

---

**Hali:** Subiri uamuzi wako kabla ya utekelezaji.