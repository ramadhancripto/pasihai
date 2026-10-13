-- ══════════════════════════════════════════════════════════════
-- PASIHAI — CHAT RLS FIX (v2 — corrected subquery + creator SELECT)
--
-- Root cause ya 42501:
--   1. 027 ilikuwa DROP + CREATE — ikiwa ilikuwa partially applied,
--      INSERT policy ilipotea (DROP ilifanikiwa, CREATE ilishindwa)
--   2. is_chat_member overload (012 single-param vs 026 two-param)
--      ilisababisha ERROR 42725
--   3. participants_insert_creator subquery ilikuwa inasoma
--      chat_conversations — SELECT policy yake ilikuwa inahitaji
--      is_chat_member() pekee → inarudisha false kabla ya participant
--      kuwepo → subquery haioni row → INSERT inashindwa → 42501
--   4. conversations_select_participant ilikuwa na is_chat_member()
--      pekee — creator haoni conversation yake baada ya kuunda
--
-- Suluhisho v2:
--   1. CREATE OR REPLACE is_chat_member (SECURITY DEFINER, hardened)
--   2. conversations_select_participant: ongeza creator check
--      — created_by = auth.uid() OR is_chat_member(id)
--   3. participants_insert_creator: subquery sasa inaweza kusoma
--      chat_conversations kwa sababu ya #2
--   4. Hakikisha SELECT/UPDATE/DELETE zinafanya kazi
--
-- Salama:
--   - DROP POLICY IF EXISTS kabla ya CREATE (idempotent)
--   - CREATE OR REPLACE FUNCTION (idempotent)
--   - Haina DELETE au UPDATE ya data
--   - Inaweza kuendeshwa mara nyingi bila madhara
--   - Rollback: re-create policies za zamani (012/027)
-- ══════════════════════════════════════════════════════════════


-- ── 1. is_chat_member function ───────────────────────────────
-- SECURITY DEFINER: bypasses RLS kwenye chat_participants
-- search_path hardened: public, pg_temp (zuia search_path injection)
-- GRANT: authenticated pekee (si PUBLIC, si anon)

DO $$
BEGIN
  -- Drop single-param overload (from 012)
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'is_chat_member' AND p.pronargs = 1) THEN
    DROP FUNCTION public.is_chat_member(UUID);
  END IF;
  -- Drop two-param overload — may fail if policies depend on it
  BEGIN
    DROP FUNCTION public.is_chat_member(UUID, UUID);
  EXCEPTION WHEN dependent_objects_still_exist THEN
    NULL; -- CREATE OR REPLACE will handle it
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_chat_member(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_chat_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_chat_member(UUID, UUID) TO authenticated;


-- ── 2. chat_conversations INSERT ──────────────────────────────
DROP POLICY IF EXISTS "conversations_insert_auth" ON chat_conversations;

CREATE POLICY "conversations_insert_auth"
  ON chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );


-- ── 3. chat_conversations SELECT ──────────────────────────────
-- v2 MAREKEBISHO: Ongeza creator check.
-- Bila hii, subquery ya participants_insert_creator haikuweza kusoma
-- chat_conversations kwa sababu SELECT policy ilikuwa inazuia
-- (is_chat_member = false, hakuna participant bado).

DROP POLICY IF EXISTS "conversations_select_participant" ON chat_conversations;

CREATE POLICY "conversations_select_participant"
  ON chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR is_chat_member(chat_conversations.id)
  );


-- ── 4. chat_conversations UPDATE ──────────────────────────────
DROP POLICY IF EXISTS "conversations_update_participant" ON chat_conversations;

CREATE POLICY "conversations_update_participant"
  ON chat_conversations
  FOR UPDATE
  TO authenticated
  USING (is_chat_member(chat_conversations.id));


-- ── 5. chat_conversations DELETE ──────────────────────────────
DROP POLICY IF EXISTS "conversations_delete_creator" ON chat_conversations;

CREATE POLICY "conversations_delete_creator"
  ON chat_conversations
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());


-- ── 6. chat_participants INSERT ───────────────────────────────
-- Subquery sasa inafanya kazi kwa sababu conversations_select_participant
-- (section 3) inaruhusu creator kusoma (created_by = auth.uid() check).
--
-- USALAMA WA SELF-JOIN:
--   User C (si creator) → subquery: created_by = C ≠ actual created_by A
--     → 0 rows → condition (a) false
--   is_chat_member(conv_id) = false for C → condition (b) false
--   → BLOCKED

DROP POLICY IF EXISTS "participants_insert_creator" ON chat_participants;

CREATE POLICY "participants_insert_creator"
  ON chat_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = conversation_id
        AND created_by = auth.uid()
    )
    OR (
      user_id = auth.uid()
      AND is_chat_member(conversation_id)
    )
  );


-- ── 7. chat_participants SELECT ───────────────────────────────
DROP POLICY IF EXISTS "participants_select_participant" ON chat_participants;

CREATE POLICY "participants_select_participant"
  ON chat_participants
  FOR SELECT
  TO authenticated
  USING (is_chat_member(chat_participants.conversation_id));


-- ── 8. chat_participants UPDATE ───────────────────────────────
DROP POLICY IF EXISTS "participants_update_own" ON chat_participants;

CREATE POLICY "participants_update_own"
  ON chat_participants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 9. chat_participants DELETE ───────────────────────────────
DROP POLICY IF EXISTS "participants_delete_own" ON chat_participants;

CREATE POLICY "participants_delete_own"
  ON chat_participants
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ── 10. chat_messages SELECT ──────────────────────────────────
DROP POLICY IF EXISTS "messages_select_participant" ON chat_messages;

CREATE POLICY "messages_select_participant"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND is_chat_member(chat_messages.conversation_id)
  );


-- ── 11. chat_messages INSERT ──────────────────────────────────
DROP POLICY IF EXISTS "messages_insert_participant" ON chat_messages;

CREATE POLICY "messages_insert_participant"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND is_chat_member(chat_messages.conversation_id)
  );


-- ── 12. chat_messages UPDATE ──────────────────────────────────
DROP POLICY IF EXISTS "messages_update_sender" ON chat_messages;

CREATE POLICY "messages_update_sender"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);


-- ── 13. chat_messages DELETE ──────────────────────────────────
DROP POLICY IF EXISTS "messages_delete_sender" ON chat_messages;

CREATE POLICY "messages_delete_sender"
  ON chat_messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);


-- ══════════════════════════════════════════════════════════════
-- VERIFY
-- ══════════════════════════════════════════════════════════════

SELECT '=== CHAT POLICIES ===' as info;
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE tablename IN ('chat_conversations', 'chat_participants', 'chat_messages')
ORDER BY tablename, policyname;

SELECT '=== FUNCTIONS ===' as info;
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name IN ('is_chat_member', 'is_space_member')
  AND routine_schema = 'public';

SELECT '=== GRANTS ===' as info;
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'is_chat_member'
  AND routine_schema = 'public';

SELECT '=== CONVERSATIONS SELECT POLICY ===' as info;
SELECT policyname, qual::text as using_expression
FROM pg_policies
WHERE tablename = 'chat_conversations' AND cmd = 'SELECT';

SELECT '=== PARTICIPANTS INSERT POLICY ===' as info;
SELECT policyname, qual::text as with_check_expression
FROM pg_policies
WHERE tablename = 'chat_participants' AND cmd = 'INSERT';

SELECT '=== DONE ===' as info;