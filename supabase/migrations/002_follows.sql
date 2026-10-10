-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 002: follows
--
-- Inalingana na: identityRepository.toggleFollow() + passesChannelGate()
-- Dependency: profiles (migration 001)
-- Rollback: DROP TABLE IF EXISTS follows CASCADE;
--           DROP FUNCTION IF EXISTS update_follow_counts() CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id != followee_id)
);

CREATE INDEX idx_follows_followee ON follows(followee_id);

-- ── Trigger: count updates ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- SECURITY DEFINER: runs as supabase_admin (table owner)
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET followers_count = followers_count + 1
      WHERE user_id = NEW.followee_id;
    UPDATE profiles SET following_count = following_count + 1
      WHERE user_id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET followers_count = GREATEST(0, followers_count - 1)
      WHERE user_id = OLD.followee_id;
    UPDATE profiles SET following_count = GREATEST(0, following_count - 1)
      WHERE user_id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows FORCE ROW LEVEL SECURITY;

-- SELECT: Yeyote aliyeingia anaweza kusoma (kwa hesabu na UI)
CREATE POLICY "follows_select_all"
  ON follows FOR SELECT TO authenticated
  USING (true);

-- INSERT: Mtumiaji anaweza kufuata kwa niaba yake PEKEE
-- Kuzuia user spoofing: follower_id lazima iwe auth.uid()
CREATE POLICY "follows_insert_own"
  ON follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

-- DELETE: Mtumiaji anaweza kuacha kufuata kwa niaba yake PEKEE
CREATE POLICY "follows_delete_own"
  ON follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- Hakuna UPDATE — follows haina fields za kubadilisha baada ya kuundwa.
-- Kubadilisha = DELETE + INSERT.
