# FIX: is_chat_member Function Overload (ERROR 42725)

## Tatizo

Wakati wa kufanya migration ya chat system, console inaonyesha:

```
ERROR: 42725: function is_chat_member(uuid) is not unique
HINT: Could not choose a best candidate function. You might need to add explicit type casts.
```

## Chanzo

Database ina function **MBILI** za `is_chat_member`:

| # | Signature | Chanzo |
|---|---|---|
| 1 | `is_chat_member(uuid)` | Migration 012 (ya zamani) |
| 2 | `is_chat_member(uuid, uuid DEFAULT auth.uid())` | Migration 026 (mpya) |

### Kwa nini?

`CREATE OR REPLACE FUNCTION` katika migration 026 ilikuwa na signature tofauti na ya zamani:
- Zamani: parameter 1 (`uuid`)
- Mpya: parameters 2 (`uuid, uuid` with DEFAULT)

PostgreSQL inafanya overload — function mbili zinakubali `uuid` moja. `CREATE OR REPLACE` haifuti overloads — inaunda mpya tu.

### Matokeo

PostgreSQL haielewi ipi kutumia unapoitwa `is_chat_member(some_uuid)`:
- Inaweza kuwa `is_chat_member(uuid)` — ya zamani
- Au `is_chat_member(uuid, uuid)` — ya 026 (parameter ya pili ikiwa na DEFAULT)

## Suluhisho

**Migration 029:** `029_fix_is_chat_member_overload.sql`

```sql
-- Step 1: Futa overload ya zamani
DROP FUNCTION IF EXISTS public.is_chat_member(UUID);

-- Step 2: Unda upya function sahihi
CREATE OR REPLACE FUNCTION public.is_chat_member(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

-- Step 3: Permission
GRANT EXECUTE ON FUNCTION public.is_chat_member(UUID, UUID) TO authenticated;
```

## Matokeo Baada ya Fix

- Function moja tu: `is_chat_member(uuid, uuid)` — ya pili ikiwa na DEFAULT
- Zote: `is_chat_member(uuid)` na `is_chat_member(uuid, uuid)` zitafanya kazi
- RLS policies zote bado zinafanya kazi
- Spaces na mifumo mingine haiathiriki

## Hatua za Kuthibitisha

1. Endesha `029_fix_is_chat_member_overload.sql` kwenye Supabase SQL Editor
2. Jaribu kuanzisha mazungumzo mapya ya mtu kwa mtu
3. Hakikisha error 42501 haionekani tena
4. Hakikisha group chats bado zinafanya kazi

## Faili Zilizobadilishwa

- **New:** `supabase/migrations/029_fix_is_chat_member_overload.sql`