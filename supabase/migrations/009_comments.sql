-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 009: comments
--
-- Inalingana na: feedService.addComment() + feedService.listComments()
-- Dependency: profiles (001), posts (003)
-- Rollback: DROP TABLE IF EXISTS comments CASCADE;
--           DROP FUNCTION IF EXISTS update_comment_count() CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,  -- kwa replies
  text        TEXT NOT NULL CHECK (char_length(text) >= 1 AND char_length(text) <= 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author ON comments(author_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON comments(parent_id)
  WHERE deleted_at IS NULL AND parent_id IS NOT NULL;

-- ── Trigger: update comments_count on posts ──────────────────
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE posts SET comments_count = comments_count - 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comments_count
  AFTER INSERT OR UPDATE OF deleted_at ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- ── updated_at trigger ──────────────────────────────────────
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments FORCE ROW LEVEL SECURITY;

-- SELECT: wote wanaona comments za posts wanazoweza kuona
CREATE POLICY "comments_select_visible"
  ON comments FOR SELECT
  USING (
    deleted_at IS NULL
    AND can_see_post((SELECT p FROM posts p WHERE p.id = post_id))
  );

-- INSERT: mtumiaji yeyote aliyeingia anaweza kucomment
CREATE POLICY "comments_insert_auth"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- UPDATE: mwandishi pekee anaweza kufuta (soft delete)
CREATE POLICY "comments_update_author"
  ON comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- DELETE: mwandishi au admin (hard delete — kwa sasa hakuna admin role)
CREATE POLICY "comments_delete_author"
  ON comments FOR DELETE
  USING (auth.uid() = author_id);
