-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 015: live_sessions + statuses + reports
--
-- LOW PRIORITY tables zilizobaki
-- Dependency: profiles (001), posts (003)
-- Rollback: DROP TABLE IF EXISTS reports CASCADE;
--           DROP TABLE IF EXISTS statuses CASCADE;
--           DROP TABLE IF EXISTS live_sessions CASCADE;
-- ══════════════════════════════════════════════════════════════

-- ── live_sessions ───────────────────────────────────────────
CREATE TABLE live_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  mode          TEXT NOT NULL DEFAULT 'Video'
                  CHECK (mode IN ('Video', 'Sauti')),
  state         TEXT NOT NULL DEFAULT 'live'
                  CHECK (state IN ('upcoming', 'live', 'ended')),
  category      TEXT NOT NULL DEFAULT 'General',
  visibility    TEXT NOT NULL DEFAULT 'public'
                  CHECK (visibility IN ('public', 'followers', 'private')),
  viewers_count INT NOT NULL DEFAULT 0 CHECK (viewers_count >= 0),
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  scheduled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_sessions_state ON live_sessions(state, created_at DESC)
  WHERE state IN ('live', 'upcoming');
CREATE INDEX idx_live_sessions_host ON live_sessions(host_id);

-- ── Trigger: updated_at ─────────────────────────────────────
CREATE TRIGGER trg_live_sessions_updated_at
  BEFORE UPDATE ON live_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions FORCE ROW LEVEL SECURITY;

-- SELECT: public sessions zinaonekana kwa wote
CREATE POLICY "live_sessions_select_visible"
  ON live_sessions FOR SELECT
  USING (
    visibility = 'public'
    OR (visibility = 'followers' AND host_id IN (
      SELECT followee_id FROM follows WHERE follower_id = auth.uid()
    ))
    OR host_id = auth.uid()
  );

-- INSERT: mtumiaji yeyote aliyeingia anaweza kuanza live session
CREATE POLICY "live_sessions_insert_auth"
  ON live_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- UPDATE: host pekee anaweza kusasisha
CREATE POLICY "live_sessions_update_host"
  ON live_sessions FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- DELETE: host pekee
CREATE POLICY "live_sessions_delete_host"
  ON live_sessions FOR DELETE
  USING (auth.uid() = host_id);

-- ══════════════════════════════════════════════════════════════
-- statuses (Stories)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE statuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  media_url   TEXT NOT NULL CHECK (media_url ~ '^https?://'),
  media_type  TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  text        TEXT CHECK (char_length(text) <= 500),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_statuses_user ON statuses(user_id, created_at DESC)
  WHERE expires_at > now();
CREATE INDEX idx_statuses_expires ON statuses(expires_at);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses FORCE ROW LEVEL SECURITY;

-- SELECT: followers wanaona statuses (au wote kwa public profiles)
CREATE POLICY "statuses_select_followers"
  ON statuses FOR SELECT
  USING (
    expires_at > now()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = auth.uid() AND followee_id = statuses.user_id
      )
    )
  );

-- INSERT: mtumiaji anaweza kuunda status yake
CREATE POLICY "statuses_insert_own"
  ON statuses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: mtumiaji anaweza kufuta status yake
CREATE POLICY "statuses_delete_own"
  ON statuses FOR DELETE
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- reports
-- ══════════════════════════════════════════════════════════════

CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'profile', 'message')),
  target_id   UUID NOT NULL,
  reason      TEXT NOT NULL CHECK (reason IN (
                'spam', 'harassment', 'hate_speech', 'violence',
                'misinformation', 'inappropriate', 'other')),
  details     TEXT CHECK (char_length(details) <= 1000),
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(user_id)
);

CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_status ON reports(status, created_at DESC)
  WHERE status = 'pending';

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports FORCE ROW LEVEL SECURITY;

-- SELECT: reporter pekee anaona reports zake (au admin)
CREATE POLICY "reports_select_own"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- INSERT: mtumiaji yeyote aliyeingia anaweza kuripoti
CREATE POLICY "reports_insert_auth"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- UPDATE: hakuna (admin pekee, lakini hakuna admin role bado)
-- DELETE: hakuna (reports hazifutwi)
