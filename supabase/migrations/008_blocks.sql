-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 008: blocks
--
-- Inalingana na: chatService.blockContact() + session.blocked
-- Dependency: profiles (001)
-- Rollback: DROP TABLE IF EXISTS blocks CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE blocks (
  blocker_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks FORCE ROW LEVEL SECURITY;

-- SELECT: Mtumiaji anaona blocks zake PEKEE
CREATE POLICY "blocks_select_own"
  ON blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

-- INSERT: Mtumiaji anaweza kuzuia kwa niaba yake PEKEE
-- Kuzuia: self-block na user spoofing
CREATE POLICY "blocks_insert_own"
  ON blocks FOR INSERT TO authenticated
  WITH CHECK (
    blocker_id = auth.uid()
    AND blocker_id != blocked_id
  );

-- DELETE: Mtumiaji anaweza kufungua kwa niaba yake PEKEE
CREATE POLICY "blocks_delete_own"
  ON blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- Hakuna UPDATE — block haibadiliki. Kubadilisha = DELETE + INSERT.
