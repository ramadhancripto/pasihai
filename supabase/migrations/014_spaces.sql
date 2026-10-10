-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 014: spaces (LOW PRIORITY)
--
-- Inalingana na: spacesService + spacesRepository
-- Dependency: profiles (001)
-- Rollback: DROP TABLE IF EXISTS space_posts CASCADE;
--           DROP TABLE IF EXISTS space_members CASCADE;
--           DROP TABLE IF EXISTS spaces CASCADE;
-- ══════════════════════════════════════════════════════════════

-- ── spaces ──────────────────────────────────────────────────
CREATE TABLE spaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL
                CHECK (char_length(slug) >= 3 AND char_length(slug) <= 50
                       AND slug ~ '^[a-z0-9-]+$'),
  name        TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  type        TEXT NOT NULL CHECK (type IN ('hub', 'community', 'channel')),
  description TEXT CHECK (char_length(description) <= 1000),
  creator_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  visibility  TEXT NOT NULL DEFAULT 'public'
                CHECK (visibility IN ('public', 'listed', 'private')),
  avatar_url  TEXT,
  cover_url   TEXT,
  members_count INT NOT NULL DEFAULT 0 CHECK (members_count >= 0),
  posts_count   INT NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_spaces_type ON spaces(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_spaces_creator ON spaces(creator_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_spaces_slug ON spaces(slug) WHERE deleted_at IS NULL;

-- ── Trigger: updated_at ─────────────────────────────────────
CREATE TRIGGER trg_spaces_updated_at
  BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── space_members ──────────────────────────────────────────
CREATE TABLE space_members (
  space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('pending', 'active', 'banned', 'left')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);

CREATE INDEX idx_space_members_user ON space_members(user_id) WHERE status = 'active';
CREATE INDEX idx_space_members_space ON space_members(space_id) WHERE status = 'active';

-- ── space_posts (junction table linking posts to spaces) ────
CREATE TABLE space_posts (
  space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, post_id)
);

CREATE INDEX idx_space_posts_space ON space_posts(space_id, created_at DESC);

-- ── RLS: spaces ─────────────────────────────────────────────
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces FORCE ROW LEVEL SECURITY;

-- SELECT: public/listed spaces zinaonekana kwa wote; private kwa members pekee
CREATE POLICY "spaces_select_visible"
  ON spaces FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      visibility IN ('public', 'listed')
      OR EXISTS (
        SELECT 1 FROM space_members
        WHERE space_id = spaces.id AND user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- INSERT: mtumiaji yeyote aliyeingia anaweza kuunda space
CREATE POLICY "spaces_insert_auth"
  ON spaces FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- UPDATE: owner/admin pekee wanaweza kusasisha
CREATE POLICY "spaces_update_admin"
  ON spaces FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = spaces.id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- DELETE: owner pekee (soft delete)
CREATE POLICY "spaces_delete_owner"
  ON spaces FOR DELETE
  USING (auth.uid() = creator_id);

-- ── RLS: space_members ──────────────────────────────────────
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_members FORCE ROW LEVEL SECURITY;

-- SELECT: members wanaona washiriki wengine (au wote kwa public spaces)
CREATE POLICY "space_members_select_visible"
  ON space_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE id = space_members.space_id AND deleted_at IS NULL
      AND (
        visibility IN ('public', 'listed')
        OR EXISTS (
          SELECT 1 FROM space_members sm
          WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid() AND sm.status = 'active'
        )
      )
    )
  );

-- INSERT: mtumiaji anaweza kujiunga (au admin anaweza kumwongeza mtu)
CREATE POLICY "space_members_insert_join"
  ON space_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
  );

-- UPDATE: admin pekee wanaweza kusasisha role/status
CREATE POLICY "space_members_update_admin"
  ON space_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
  );

-- DELETE: mtumiaji anaweza kuondoka (au admin anaweza kumfukuza)
CREATE POLICY "space_members_delete_leave"
  ON space_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id AND sm.user_id = auth.uid() AND sm.role IN ('owner', 'admin')
    )
  );

-- ── RLS: space_posts ────────────────────────────────────────
ALTER TABLE space_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_posts FORCE ROW LEVEL SECURITY;

-- SELECT: members wanaona posts (au wote kwa public spaces)
CREATE POLICY "space_posts_select_visible"
  ON space_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE id = space_posts.space_id AND deleted_at IS NULL
      AND (
        visibility IN ('public', 'listed')
        OR EXISTS (
          SELECT 1 FROM space_members sm
          WHERE sm.space_id = space_posts.space_id AND sm.user_id = auth.uid() AND sm.status = 'active'
        )
      )
    )
  );

-- INSERT: members pekee wanaweza kuongeza posts
CREATE POLICY "space_posts_insert_member"
  ON space_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = space_posts.space_id AND user_id = auth.uid() AND status = 'active'
    )
  );

-- DELETE: mwandishi wa post au admin
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
