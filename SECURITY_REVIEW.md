# PASIHAI Chat RLS Security Review — 2026-10-13

## 1. Tatizo lilikuwa nini na ushahidi wake

### Error: `42501 — new row violates row-level security policy for table "chat_conversations"`

**Root cause chain:**

1. **Migration 027** used `DROP POLICY IF EXISTS` + `CREATE POLICY` pattern.
   If 027 partially applied (DROP succeeded, CREATE failed due to `is_chat_member` overload error),
   the INSERT policy was deleted with no replacement → all INSERTs blocked.

2. **`is_chat_member` overload conflict:** Migration 012 created `is_chat_member(UUID)`.
   Migration 026 created `is_chat_member(UUID, UUID DEFAULT auth.uid())`.
   `CREATE OR REPLACE` cannot remove an old overload → PostgreSQL ERROR 42725 "function is not unique".

3. **`participants_insert_creator` subquery bug (v1):** The policy used:
   `EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND created_by = auth.uid())`
   This reads `chat_conversations`, which has SELECT RLS requiring `is_chat_member()`.
   When creator tries to add themselves as first participant (no participants yet),
   `is_chat_member()` returns false → SELECT blocks the subquery → 0 rows → INSERT fails → 42501.

4. **`conversations_select_participant` missing creator check (v1):**
   Only checked `is_chat_member()`. Creator couldn't SELECT their own conversation
   after creating it (before being added as participant).

### Usahidi wa code:
- `supabaseChatRepository.js` line ~392: `supabase.from('chat_conversations').insert(...)` → 42501
- Migration 027 line 28-33: DROP + CREATE pattern with is_chat_member
- Migration 012 line 89-94: Original INSERT policy using subquery

## 2. Faili zilizobadilishwa

| Faili | Aina | Sababu |
|---|---|---|
| `supabase/fixes/CHAT_RLS_FIX.sql` | Rewritten (v2) | Fixed subquery bug + creator SELECT check |
| `supabase/migrations/030_fix_chat_rls.sql` | New | Copy ya CHAT_RLS_FIX.sql |
| `supabase/tests/005_chat_rls_security.sql` | New | 18 RLS security tests |
| `src/data/mock.js` | Modified | label 'Mchanganyiko' → 'All' |
| `src/data/repositories/supabaseGunduaRepository.js` | Modified | label 'Mchanganyiko' → 'All' |

## 3. Marekebisho muhimu (v2)

### conversations_select_participant — FIXED
```sql
USING (created_by = auth.uid() OR is_chat_member(chat_conversations.id))
```
Creator can now SELECT their own conversation after creating it.

### participants_insert_creator — subquery now works
```sql
EXISTS (SELECT 1 FROM chat_conversations WHERE id = conversation_id AND created_by = auth.uid())
```
This works because conversations_select_participant now allows creator to read.

### Self-join protection
User C (not creator) → subquery: created_by = C ≠ A → 0 rows → BLOCKED.

## 4. Tests

| Test | Result |
|---|---|
| Smoke tests | 510/510 ✅ |
| Build | ✅ built in 5.07s |
| git diff --check | Clean ✅ |
| RLS security (18) | NOT RUN — requires Supabase SQL Editor |

## 5. Kosa la 42501

- **Kwenye code:** NDIYO — marekebisho yamefanywa
- **Kwenye production:** BADO — SQL haijaendeshwa

## 6. Tofauti local vs live

Live database state unknown. CHAT_RLS_FIX.sql handles all cases via DROP IF EXISTS + CREATE.

## 7. ZIP

`PASIHAI_FULL_PROJECT_RLS_FIX.zip` — 14 MB, 494 files, verified no errors.

## 8. Hatua zinazohitaji idhini

1. Endesha CHAT_RLS_FIX.sql kwenye Supabase SQL Editor
2. Endesha 005_chat_rls_security.sql — hakikisha 18/18 PASS
3. Test manually: anzisha direct conversation
4. Baada ya kuthibitisha: commit, push, db push

Hakuna hatua itakayofanywa bila idhini yako.