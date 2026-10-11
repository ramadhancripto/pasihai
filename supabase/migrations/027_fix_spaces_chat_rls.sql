-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 027: Fix remaining RLS recursion + chat INSERT
--
-- Tatizo 1: spaces SELECT policy queries space_members →
--   space_members SELECT policy (026) uses is_space_member() which
--   queries space_members (SECURITY DEFINER, no recursion).
--   BUT spaces SELECT still queries space_members directly →
--   space_members RLS fires → queries spaces → recursion!
--
-- Suluhisho: spaces SELECT uses is_space_member() too.
--
-- Tatizo 2: chat_conversations INSERT blocked by RLS (42501).
--   Policy: WITH CHECK (auth.uid() = created_by OR created_by IS NULL)
--   This should work, but if policy was not properly replaced by 025/026,
--   the old policy may still be active. Re-create it explicitly.
--
-- Tatizo 3: chat_participants INSERT may need broader permission
--   to allow the creator to add both themselves and the other user.
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE POLICY
-- ══════════════════════════════════════════════════════════════

-- ── FIX 1: spaces SELECT — remove direct space_members query ──
DROP POLICY IF EXISTS "spaces_select_visible" ON spaces;

CREATE POLICY "spaces_select_visible"
  ON spaces FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      visibility IN ('public', 'listed')
      OR is_space_member(spaces.id)
    )
  );

-- ── FIX 2: spaces INSERT — ensure creator can create ──────────
DROP POLICY IF EXISTS "spaces_insert_auth" ON spaces;

CREATE POLICY "spaces_insert_auth"
  ON spaces FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- ── FIX 3: spaces UPDATE — use helper to avoid recursion ──────
DROP POLICY IF EXISTS "spaces_update_admin" ON spaces;

CREATE POLICY "spaces_update_admin"
  ON spaces FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR is_space_member(spaces.id)
  );

-- ── FIX 4: chat_conversations INSERT — explicit re-create ─────
DROP POLICY IF EXISTS "conversations_insert_auth" ON chat_conversations;

CREATE POLICY "conversations_insert_auth"
  ON chat_conversations FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    OR created_by IS NULL
  );

-- ── FIX 5: chat_conversations SELECT — use helper ─────────────
DROP POLICY IF EXISTS "conversations_select_participant" ON chat_conversations;

CREATE POLICY "conversations_select_participant"
  ON chat_conversations FOR SELECT
  USING (is_chat_member(chat_conversations.id));

-- ── FIX 6: chat_conversations UPDATE — use helper ─────────────
DROP POLICY IF EXISTS "conversations_update_participant" ON chat_conversations;

CREATE POLICY "conversations_update_participant"
  ON chat_conversations FOR UPDATE
  USING (is_chat_member(chat_conversations.id));

-- ── FIX 7: chat_participants INSERT — creator can add anyone ──
DROP POLICY IF EXISTS "participants_insert_creator" ON chat_participants;

CREATE POLICY "participants_insert_creator"
  ON chat_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id  -- adding yourself
    OR auth.uid() = (
      SELECT created_by FROM chat_conversations
      WHERE id = conversation_id
    )  -- creator adding others
  );

-- ── FIX 8: chat_participants UPDATE — own last_read_at ────────
DROP POLICY IF EXISTS "participants_update_own" ON chat_participants;

CREATE POLICY "participants_update_own"
  ON chat_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── FIX 9: chat_participants DELETE — leave conversation ───────
DROP POLICY IF EXISTS "participants_delete_own" ON chat_participants;

CREATE POLICY "participants_delete_own"
  ON chat_participants FOR DELETE
  USING (auth.uid() = user_id);

-- ── FIX 10: space_members policies — already fixed in 026,
--    but re-apply INSERT with broader admin check ──────────────
DROP POLICY IF EXISTS "space_members_insert_join" ON space_members;

CREATE POLICY "space_members_insert_join"
  ON space_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin')
    )
  );

-- ── FIX 11: space_members UPDATE/DELETE ────────────────────────
DROP POLICY IF EXISTS "space_members_update_admin" ON space_members;

CREATE POLICY "space_members_update_admin"
  ON space_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "space_members_delete_leave" ON space_members;

CREATE POLICY "space_members_delete_leave"
  ON space_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'admin')
    )
  );