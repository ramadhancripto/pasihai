-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 005: bookmarks
--
-- Inalingana na: contentRepository.toggleSaved() + saveEntity()
--                + session.saved + session.savedEntities
-- Dependency: profiles (001)
-- Rollback: DROP TABLE IF EXISTS bookmarks CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  ref_type    TEXT NOT NULL CHECK (ref_type IN ('post','entity')),
  ref_id      UUID NOT NULL,  -- posts.id au profiles.user_id
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- UNIQUE: kuzuia duplicates (mtumiaji + ref_type + ref_id)
  UNIQUE (user_id, ref_type, ref_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
CREATE INDEX idx_bookmarks_ref ON bookmarks(ref_type, ref_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks FORCE ROW LEVEL SECURITY;

-- SELECT: Mtumiaji anaona bookmarks zake PEKEE
CREATE POLICY "bookmarks_select_own"
  ON bookmarks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Mtumiaji anaweza kuongeza bookmark yake PEKEE
CREATE POLICY "bookmarks_insert_own"
  ON bookmarks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: Mtumiaji anaweza kuondoa bookmark yake PEKEE
CREATE POLICY "bookmarks_delete_own"
  ON bookmarks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Hakuna UPDATE — bookmark haibadiliki. Kubadilisha = DELETE + INSERT.
