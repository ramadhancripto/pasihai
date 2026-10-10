-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 007: friendships
--
-- Inalingana na: entityActions.friend + ring: 'friend'
--                + friends view kwa feedService visibility
-- Dependency: profiles (001)
-- Rollback: DROP TABLE IF EXISTS friendships CASCADE;
--           DROP VIEW IF EXISTS friends CASCADE;
--           DROP FUNCTION IF EXISTS update_friends_count() CASCADE;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, status);

-- ── View: urafiki uliokubalika (pande mbili) ─────────────────
CREATE OR REPLACE VIEW friends AS
SELECT requester_id AS user_a, addressee_id AS user_b,
       updated_at AS friends_since
FROM friendships WHERE status = 'accepted'
UNION
SELECT addressee_id AS user_a, requester_id AS user_b,
       updated_at AS friends_since
FROM friendships WHERE status = 'accepted';

-- ── Trigger: count updates ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_friends_count()
RETURNS TRIGGER AS $$
BEGIN
  -- SECURITY DEFINER: runs as supabase_admin (table owner)
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE profiles SET friends_count = friends_count + 1
      WHERE user_id = NEW.requester_id;
    UPDATE profiles SET friends_count = friends_count + 1
      WHERE user_id = NEW.addressee_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status != 'accepted' AND OLD.status = 'accepted' THEN
    UPDATE profiles SET friends_count = GREATEST(0, friends_count - 1)
      WHERE user_id = NEW.requester_id;
    UPDATE profiles SET friends_count = GREATEST(0, friends_count - 1)
      WHERE user_id = NEW.addressee_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_friends_count
  AFTER UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_friends_count();

-- ── updated_at trigger ────────────────────────────────────────
CREATE TRIGGER trg_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships FORCE ROW LEVEL SECURITY;

-- SELECT: Mtumiaji anaona maombi yake (aliyotuma + aliyopokea)
CREATE POLICY "friendships_select_own"
  ON friendships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- INSERT: Mtumiaji anaweza kutuma ombi la urafiki (yeye ni requester)
-- Kuzuia: self-friendship na user spoofing
CREATE POLICY "friendships_insert_own"
  ON friendships FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND requester_id != addressee_id
  );

-- UPDATE: Mpokeaji anaweza kukubali/kukataa; mwombaji anaweza kufuta
CREATE POLICY "friendships_update_own"
  ON friendships FOR UPDATE TO authenticated
  USING (
    -- Mpokeaji: kubali (accepted) au kataa (declined/block)
    (addressee_id = auth.uid())
    OR
    -- Mwombaji: futa ombi (kwa kubadilisha status)
    (requester_id = auth.uid() AND status = 'pending')
  )
  WITH CHECK (
    -- Hakuna kubadilisha requester_id au addressee_id
    -- Ndani ya WITH CHECK: column names = NEW values; subquery = EXISTING values
    requester_id = (SELECT f.requester_id FROM friendships f WHERE f.id = friendships.id)
    AND addressee_id = (SELECT f.addressee_id FROM friendships f WHERE f.id = friendships.id)
    AND (
      -- Mpokeaji anaweza kubadilisha status yoyote
      (SELECT f.addressee_id FROM friendships f WHERE f.id = friendships.id) = auth.uid()
      OR
      -- Mwombaji anaweza tu kubadilisha kwenda 'declined' (kufuta ombi)
      status = 'declined'
    )
  );

-- Hakuna DELETE — kubadilisha status ndio njia ya kufuta ombi.
