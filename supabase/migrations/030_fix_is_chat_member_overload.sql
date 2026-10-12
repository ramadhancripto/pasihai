-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 030: Fix is_chat_member function overload
--
-- Tatizo: Database ina function MBILI za is_chat_member:
--   1. is_chat_member(uuid)         — ya zamani (012)
--   2. is_chat_member(uuid, uuid)   — ya 026 (DEFAULT auth.uid())
--
-- CREATE OR REPLACE FUNCTION haiwezi kufuta overload ya zamani.
-- Hivyo PostgreSQL haielewi ipi kutumia → ERROR 42725.
--
-- Suluhisho: DROP old overload kisha CREATE OR REPLACE ya sahihi.
-- Idempotent: DROP IF EXISTS + CREATE OR REPLACE.
-- ══════════════════════════════════════════════════════════════

-- Step 1: Futa overload ya zamani (parameter 1 tu)
DROP FUNCTION IF EXISTS public.is_chat_member(UUID);

-- Step 2: Unda upya function sahihi (parameter 2, ya pili ikiwa na DEFAULT)
CREATE OR REPLACE FUNCTION public.is_chat_member(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

-- Step 3: Hakikisha permission
GRANT EXECUTE ON FUNCTION public.is_chat_member(UUID, UUID) TO authenticated;
