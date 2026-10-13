-- ══════════════════════════════════════════════════════════════
-- EMERGENCY FIX: chat_conversations INSERT blocked by RLS (42501)
--
-- Run this in Supabase Dashboard → SQL Editor
-- This is idempotent — safe to run multiple times.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Helper function (idempotent) ──────────────────────────
CREATE OR REPLACE FUNCTION is_chat_member(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

-- ── 2. chat_conversations INSERT ──────────────────────────────
DROP POLICY IF EXISTS "conversations_insert_auth" ON chat_conversations;

CREATE POLICY "conversations_insert_auth"
  ON chat_conversations FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    OR created_by IS NULL
  );

-- ── 3. chat_conversations SELECT ──────────────────────────────
DROP POLICY IF EXISTS "conversations_select_participant" ON chat_conversations;

CREATE POLICY "conversations_select_participant"
  ON chat_conversations FOR SELECT
  USING (is_chat_member(chat_conversations.id));

-- ── 4. chat_conversations UPDATE ──────────────────────────────
DROP POLICY IF EXISTS "conversations_update_participant" ON chat_conversations;

CREATE POLICY "conversations_update_participant"
  ON chat_conversations FOR UPDATE
  USING (is_chat_member(chat_conversations.id));

-- ── 5. chat_participants INSERT — creator can add anyone ─────
DROP POLICY IF EXISTS "participants_insert_creator" ON chat_participants;

CREATE POLICY "participants_insert_creator"
  ON chat_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = (
      SELECT created_by FROM chat_conversations
      WHERE id = conversation_id
    )
  );

-- ── 6. chat_participants UPDATE — own last_read_at ───────────
DROP POLICY IF EXISTS "participants_update_own" ON chat_participants;

CREATE POLICY "participants_update_own"
  ON chat_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 7. chat_participants DELETE — leave conversation ──────────
DROP POLICY IF EXISTS "participants_delete_own" ON chat_participants;

CREATE POLICY "participants_delete_own"
  ON chat_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Done. Test: try starting a direct conversation.