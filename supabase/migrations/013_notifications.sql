-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 013: notifications
--
-- Inalingana na: notificationService.list() + activityRepository
-- Dependency: profiles (001), posts (003)
-- Rollback: DROP TABLE IF EXISTS notifications CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'like', 'comment', 'reply', 'follow', 'friend_request',
                'friend_accept', 'mention', 'share', 'system')),
  actor_id    UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  body        TEXT CHECK (char_length(body) <= 500),
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_all ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_actor ON notifications(actor_id)
  WHERE actor_id IS NOT NULL;

-- ── Helper: unread count ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_unread_count(target_user UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT FROM notifications
  WHERE user_id = target_user AND read_at IS NULL;
$$ LANGUAGE sql STABLE;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

-- SELECT: mtumiaji anaona notifications zake pekee
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: system au actor (kwa sasa hakuna admin role, hivyo auth pekee)
-- Kwa sasa, notifications zinaundwa na application logic, si DB triggers
CREATE POLICY "notifications_insert_auth"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = actor_id OR actor_id IS NULL);

-- UPDATE: mtumiaji anaweza kusasisha read_at yake
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: mtumiaji anaweza kufuta notifications zake
CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);
