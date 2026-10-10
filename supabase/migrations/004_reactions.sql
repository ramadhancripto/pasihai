-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 004: reactions
--
-- Inalingana na: contentRepository.toggleLike() + session.liked
-- Dependency: profiles (001), posts (003)
-- Rollback: DROP TABLE IF EXISTS reactions CASCADE;
--           DROP FUNCTION IF EXISTS update_reaction_count() CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE reactions (
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL DEFAULT 'like'
                CHECK (emoji IN ('like','heart','clap','fire','laugh','sad')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)  -- reaction MOJA kwa kila post
);

CREATE INDEX idx_reactions_post ON reactions(post_id);

-- ── Trigger: count updates ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  -- SECURITY DEFINER: runs as supabase_admin (table owner)
  -- protect_post_counts allows supabase_admin to change counts
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET reactions_count = reactions_count + 1
      WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET reactions_count = GREATEST(0, reactions_count - 1)
      WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_reaction_count
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW EXECUTE FUNCTION update_reaction_count();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions FORCE ROW LEVEL SECURITY;

-- SELECT: Yeyote aliyeingia anaweza kusoma (kwa UI — likes count)
CREATE POLICY "reactions_select_all"
  ON reactions FOR SELECT TO authenticated
  USING (true);

-- INSERT: Mtumiaji anaweza kupenda kwa niaba yake PEKEE
-- Kuzuia user spoofing: user_id lazima iwe auth.uid()
CREATE POLICY "reactions_insert_own"
  ON reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: Mtumiaji anaweza kuondoa reaction yake PEKEE
CREATE POLICY "reactions_delete_own"
  ON reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- UPDATE: Hakuna — reaction haibadiliki. Kubadilisha = DELETE + INSERT.
