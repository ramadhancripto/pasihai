-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 026: Fix infinite recursion in RLS
--
-- Tatizo: chat_participants SELECT policy queries chat_participants
-- inside itself → PostgreSQL 42P17 "infinite recursion".
-- Same for space_members SELECT policy.
--
-- Suluhisho: SECURITY DEFINER helper functions that check membership
-- without triggering RLS, then policies use these functions.
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE POLICY
--              CREATE OR REPLACE FUNCTION
-- ══════════════════════════════════════════════════════════════

-- ── Helper: is user a participant in this conversation? ──────
-- SECURITY DEFINER: bypasses RLS on chat_participants
CREATE OR REPLACE FUNCTION is_chat_member(p_conversation_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper: is user an active member of this space? ──────────
-- SECURITY DEFINER: bypasses RLS on space_members
CREATE OR REPLACE FUNCTION is_space_member(p_space_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id AND user_id = p_user_id AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ══════════════════════════════════════════════════════════════
-- FIX 1: chat_participants SELECT — remove self-reference
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "participants_select_participant" ON chat_participants;

CREATE POLICY "participants_select_participant"
  ON chat_participants FOR SELECT
  USING (is_chat_member(chat_participants.conversation_id));

-- ══════════════════════════════════════════════════════════════
-- FIX 2: space_members SELECT — remove self-reference
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "space_members_select_visible" ON space_members;

CREATE POLICY "space_members_select_visible"
  ON space_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE id = space_members.space_id AND deleted_at IS NULL
      AND (
        visibility IN ('public', 'listed')
        OR is_space_member(space_members.space_id)
      )
    )
  );

-- ══════════════════════════════════════════════════════════════
-- FIX 3: space_posts SELECT — same recursion risk
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "space_posts_select_visible" ON space_posts;

CREATE POLICY "space_posts_select_visible"
  ON space_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE id = space_posts.space_id AND deleted_at IS NULL
      AND (
        visibility IN ('public', 'listed')
        OR is_space_member(space_posts.space_id)
      )
    )
  );

-- ══════════════════════════════════════════════════════════════
-- FIX 4: space_members INSERT — same recursion risk
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "space_members_insert_join" ON space_members;

CREATE POLICY "space_members_insert_join"
  ON space_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
  );

-- ══════════════════════════════════════════════════════════════
-- FIX 5: space_members UPDATE/DELETE — same recursion risk
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "space_members_update_admin" ON space_members;

CREATE POLICY "space_members_update_admin"
  ON space_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "space_members_delete_leave" ON space_members;

CREATE POLICY "space_members_delete_leave"
  ON space_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
  );

-- ══════════════════════════════════════════════════════════════
-- FIX 6: chat INSERT — participant can add others
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "participants_insert_creator" ON chat_participants;

CREATE POLICY "participants_insert_creator"
  ON chat_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR is_chat_member(chat_participants.conversation_id)
  );

-- ══════════════════════════════════════════════════════════════
-- FIX 7: chat_messages SELECT/INSERT — use helper
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "messages_select_participant" ON chat_messages;

CREATE POLICY "messages_select_participant"
  ON chat_messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND is_chat_member(chat_messages.conversation_id)
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON chat_messages;

CREATE POLICY "messages_insert_participant"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND is_chat_member(chat_messages.conversation_id)
  );

-- ══════════════════════════════════════════════════════════════
-- FIX 8: space_posts INSERT/DELETE — use helper
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "space_posts_insert_member" ON space_posts;

CREATE POLICY "space_posts_insert_member"
  ON space_posts FOR INSERT
  WITH CHECK (is_space_member(space_posts.space_id));

DROP POLICY IF EXISTS "space_posts_delete_author_or_admin" ON space_posts;

CREATE POLICY "space_posts_delete_author_or_admin"
  ON space_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts WHERE id = space_posts.post_id AND author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_posts.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
  );