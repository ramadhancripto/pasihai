-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 010: poll_options
--
-- Inalingana na: feedService.votePoll() + posts.poll_question
-- Dependency: posts (003)
-- Rollback: DROP TABLE IF EXISTS poll_options CASCADE;
--           DROP TABLE IF EXISTS poll_votes CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE poll_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  label       TEXT NOT NULL CHECK (char_length(label) >= 1 AND char_length(label) <= 200),
  position    INT NOT NULL CHECK (position >= 0),
  votes_count INT NOT NULL DEFAULT 0 CHECK (votes_count >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, position)
);

CREATE INDEX idx_poll_options_post ON poll_options(post_id, position);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options FORCE ROW LEVEL SECURITY;

-- SELECT: wote wanaona poll options za posts wanazoweza kuona
CREATE POLICY "poll_options_select_visible"
  ON poll_options FOR SELECT
  USING (can_see_post((SELECT p FROM posts p WHERE p.id = post_id)));

-- INSERT: mwandishi wa post pekee anaweza kuongeza options (wakati wa kuunda post)
CREATE POLICY "poll_options_insert_author"
  ON poll_options FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT author_id FROM posts WHERE id = post_id)
  );

-- UPDATE: hakuna (votes_count inasasishwa na trigger)
-- DELETE: mwandishi wa post pekee
CREATE POLICY "poll_options_delete_author"
  ON poll_options FOR DELETE
  USING (
    auth.uid() = (SELECT author_id FROM posts WHERE id = post_id)
  );

-- ══════════════════════════════════════════════════════════════
-- poll_votes: kura za watumiaji
-- ══════════════════════════════════════════════════════════════

CREATE TABLE poll_votes (
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  option_id   UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id),  -- kura MOJA kwa kila poll
  UNIQUE (user_id, option_id)  -- kuzuia kura mbili kwa option moja
);

CREATE INDEX idx_poll_votes_option ON poll_votes(option_id);
CREATE INDEX idx_poll_votes_post ON poll_votes(post_id);

-- ── Trigger: update votes_count on poll_options ─────────────
CREATE OR REPLACE FUNCTION update_poll_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = NEW.option_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE poll_options SET votes_count = votes_count - 1 WHERE id = OLD.option_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_poll_votes_count
  AFTER INSERT OR DELETE ON poll_votes
  FOR EACH ROW EXECUTE FUNCTION update_poll_votes_count();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes FORCE ROW LEVEL SECURITY;

-- SELECT: wote wanaona kura (kwa matokeo ya poll)
CREATE POLICY "poll_votes_select_all"
  ON poll_votes FOR SELECT
  USING (can_see_post((SELECT p FROM posts p WHERE p.id = post_id)));

-- INSERT: mtumiaji aliyeingia anaweza kupiga kura (kura moja tu)
CREATE POLICY "poll_votes_insert_auth"
  ON poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: mtumiaji anaweza kubadilisha kura yake
CREATE POLICY "poll_votes_delete_own"
  ON poll_votes FOR DELETE
  USING (auth.uid() = user_id);
