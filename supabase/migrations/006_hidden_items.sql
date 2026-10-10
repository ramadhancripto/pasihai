-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 006: hidden_items
--
-- Inalingana na: contentRepository.hideItem() + session.hidden
-- Dependency: profiles (001), posts (003)
-- Rollback: DROP TABLE IF EXISTS hidden_items CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE hidden_items (
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE hidden_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "hidden_select_own"
  ON hidden_items FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "hidden_insert_own"
  ON hidden_items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "hidden_delete_own"
  ON hidden_items FOR DELETE TO authenticated
  USING (user_id = auth.uid());
