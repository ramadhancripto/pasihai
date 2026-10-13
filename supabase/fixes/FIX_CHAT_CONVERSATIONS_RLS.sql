-- ══════════════════════════════════════════════════════════════
-- PASIHAI — FIX: chat_conversations INSERT (42501)
--
-- Endesha hii SQL kwenye Supabase SQL Editor kutatua tatizo
-- la "new row violates row-level security policy"
-- ══════════════════════════════════════════════════════════════

-- ── 1. Futa ZOTE INSERT policies zilizopo kwenye chat_conversations ──
DROP POLICY IF EXISTS "conversations_insert_auth" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_insert" ON chat_conversations;
DROP POLICY IF EXISTS "allow_insert" ON chat_conversations;

-- ── 2. Unda policy mpya ─────────────────────────────────────────────
CREATE POLICY "conversations_insert_auth"
  ON chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()
      OR created_by IS NULL
    )
  );

-- ── 3. Hakikisha SELECT policy ───────────────────────────────────────
DROP POLICY IF EXISTS "conversations_select_participant" ON chat_conversations;

CREATE POLICY "conversations_select_participant"
  ON chat_conversations
  FOR SELECT
  TO authenticated
  USING (is_chat_member(chat_conversations.id));

-- ── 4. Hakikisha UPDATE policy ───────────────────────────────────────
DROP POLICY IF EXISTS "conversations_update_participant" ON chat_conversations;

CREATE POLICY "conversations_update_participant"
  ON chat_conversations
  FOR UPDATE
  TO authenticated
  USING (is_chat_member(chat_conversations.id));

-- ── 5. Hakikisha chat_participants INSERT ────────────────────────────
DROP POLICY IF EXISTS "participants_insert_creator" ON chat_participants;

CREATE POLICY "participants_insert_creator"
  ON chat_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE id = conversation_id
      AND created_by = auth.uid()
    )
  );

-- ── 6. Test: hakikisha policy mpya inafanya kazi ─────────────────────
-- Endesha hii kuona policies mpya:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('chat_conversations', 'chat_participants')
ORDER BY tablename, policyname;