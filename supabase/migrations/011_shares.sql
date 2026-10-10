-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 011: shares
--
-- Inalingana na: feedService.sharePost() + posts.shares_count
-- Dependency: profiles (001), posts (003)
-- Rollback: DROP TABLE IF EXISTS shares CASCADE;
--           DROP FUNCTION IF EXISTS update_share_count() CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  platform    TEXT NOT NULL DEFAULT 'pasihai'
                CHECK (platform IN ('pasihai', 'whatsapp', 'twitter', 'facebook', 'link')),
  message     TEXT CHECK (char_length(message) <= 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shares_post ON shares(post_id, created_at DESC);
CREATE INDEX idx_shares_user ON shares(user_id) WHERE created_at > now() - interval '30 days';

-- ── Trigger: update shares_count on posts ───────────────────
CREATE OR REPLACE FUNCTION update_share_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET shares_count = shares_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET shares_count = shares_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shares_count
  AFTER INSERT OR DELETE ON shares
  FOR EACH ROW EXECUTE FUNCTION update_share_count();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares FORCE ROW LEVEL SECURITY;

-- SELECT: wote wanaona shares za posts wanazoweza kuona
CREATE POLICY "shares_select_visible"
  ON shares FOR SELECT
  USING (can_see_post((SELECT p FROM posts p WHERE p.id = post_id)));

-- INSERT: mtumiaji yeyote aliyeingia anaweza kushiriki
CREATE POLICY "shares_insert_auth"
  ON shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: mtumiaji anaweza kufuta shares zake mwenyewe
CREATE POLICY "shares_delete_own"
  ON shares FOR DELETE
  USING (auth.uid() = user_id);
