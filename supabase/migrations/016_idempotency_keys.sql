-- Migration: Idempotency Keys for Duplicate Prevention
-- Purpose: Kuzuia duplicate submissions wakati wa network timeouts/retries
-- Tables affected: posts, comments, reactions, bookmarks, hidden_items

-- ============================================================================
-- 1. POSTS - Ongeza idempotency_key column
-- ============================================================================
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- Unda unique index (partial - kwa rows ambazo zina idempotency_key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_idempotency_key 
ON posts(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 2. COMMENTS - Ongeza idempotency_key column
-- ============================================================================
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_idempotency_key 
ON comments(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 3. REACTIONS - Ongeza idempotency_key column
-- ============================================================================
ALTER TABLE reactions 
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_idempotency_key 
ON reactions(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 4. BOOKMARKS - Ongeza idempotency_key column
-- ============================================================================
ALTER TABLE bookmarks 
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_idempotency_key 
ON bookmarks(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 5. HIDDEN_ITEMS - Ongeza idempotency_key column
-- ============================================================================
ALTER TABLE hidden_items 
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hidden_items_idempotency_key 
ON hidden_items(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- NOTES:
-- - idempotency_key ni NULL kwa records za zamani (backward compatible)
-- - Unique index ni partial (WHERE idempotency_key IS NOT NULL) ili kuruhusu NULL
-- - Client itatuma idempotency_key, na ON CONFLICT DO NOTHING itazuia duplicates
-- - Kama idempotency_key haipo, INSERT itafanya kazi kawaida (backward compatible)
-- ============================================================================
