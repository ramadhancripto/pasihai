-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 008b: sasisha is_blocked_by()
--
-- Sasa inatumia blocks table (iliyoundwa na migration 008)
-- Dependency: blocks (008)
-- Rollback: Hakuna (migration 003 itakuwa na function ya awali)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_blocked_by(blocked_user UUID, blocker UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocks
    WHERE blocker_id = blocker AND blocked_id = blocked_user
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
