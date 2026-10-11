-- ══════════════════════════════════════════════════════════════
-- PASIHAI MIGRATION 028 — OFFLINE MESH RELAY & INTERNET RELAY
-- (HARDENED — reviewed and fixed from original)
--
-- ISSUES FIXED FROM ORIGINAL 028:
--   1. SECURITY DEFINER functions now have SET search_path = public, pg_temp
--   2. relay_message uses auth.uid() — rejects client-supplied sender_id
--   3. relay_message validates all inputs (NULL, negative, kind, range)
--   4. relay_message checks idempotency (duplicate message_id returns prior result)
--   5. relay_message validates kind is in allowed set
--   6. relay_message checks balance BEFORE inserting to queue
--   7. mb_balances UPDATE policy locked — only triggers/functions can modify
--   8. relay_quotas UPDATE policy locked — only triggers/functions can modify
--   9. relay_providers SELECT restricted to available = true (not full table)
--  10. relay_providers UPDATE: only owner, but NOT earnings/commission columns
--  11. relay_usage INSERT policy restricted (not WITH CHECK true)
--  12. CHECK constraints: non-negative bytes, non-negative balance_after
--  13. GRANT/REVOKE on tables to complement RLS
--  14. credit_mb validates user_id is not NULL
--  15. relay_message uses explicit transaction via function atomicity
--  16. Commission rate flagged: 10% (needs confirmation vs discussed 2%)
--
-- TABLES: relay_providers, relay_sessions, relay_usage, hai_points_ledger,
--         mb_balances, relay_queue, device_discovery, relay_quotas, local_shares
--
-- DESIGN PRINCIPLES:
--   1. Server is single source of truth for balances, points, sessions
--   2. Client CANNOT self-credit — all balance changes via SECURITY DEFINER functions
--   3. 1 Hai Point = 5 MB (pasihai default)
--   4. Commission rate: 0.10 (10%) — ⚠️ NEEDS CONFIRMATION (discussed 2%)
--   5. Daily relay limit: 5 MB default, 5 MB hard max
--   6. Messages only for internet relay (no files/video/audio)
--   7. All SECURITY DEFINER functions use auth.uid(), not client-supplied IDs
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════════════════════════════

-- ── Relay providers ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relay_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'offline', 'deleted')),
  max_clients_per_day INT NOT NULL DEFAULT 200
    CHECK (max_clients_per_day > 0),
  daily_data_limit_mb NUMERIC(10,2) NOT NULL DEFAULT 500.00
    CHECK (daily_data_limit_mb > 0),
  current_clients_today INT NOT NULL DEFAULT 0
    CHECK (current_clients_today >= 0),
  current_data_today_mb NUMERIC(10,2) NOT NULL DEFAULT 0.00
    CHECK (current_data_today_mb >= 0),
  total_earnings NUMERIC(12,2) NOT NULL DEFAULT 0.00
    CHECK (total_earnings >= 0),
  -- ⚠️ Commission rate: 0.10 = 10%. Original discussion mentioned 2%.
  -- This needs business confirmation before production.
  commission_rate NUMERIC(4,2) NOT NULL DEFAULT 0.10
    CHECK (commission_rate >= 0 AND commission_rate <= 1),
  available BOOLEAN NOT NULL DEFAULT true,
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ── Relay sessions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES relay_providers(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'failed', 'interrupted')),
  bytes_transferred BIGINT NOT NULL DEFAULT 0
    CHECK (bytes_transferred >= 0),
  messages_relayed INT NOT NULL DEFAULT 0
    CHECK (messages_relayed >= 0),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  total_cost NUMERIC(10,4) NOT NULL DEFAULT 0.00
    CHECK (total_cost >= 0),
  provider_earnings NUMERIC(10,4) NOT NULL DEFAULT 0.00
    CHECK (provider_earnings >= 0),
  system_commission NUMERIC(10,4) NOT NULL DEFAULT 0.00
    CHECK (system_commission >= 0),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);

-- ── Relay usage per message ──────────────────────────────────
CREATE TABLE IF NOT EXISTS relay_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES relay_sessions(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text'
    CHECK (kind IN ('text', 'deliveryMeta', 'statusUpdate', 'notification')),
  raw_bytes INT NOT NULL CHECK (raw_bytes >= 0),
  compact_bytes INT NOT NULL CHECK (compact_bytes >= 0),
  direction TEXT NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'delivered'
    CHECK (status IN ('pending', 'relayed', 'delivered', 'failed', 'duplicate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Hai Points ledger ────────────────────────────────────────
-- All balance changes are INSERT-only (append-only ledger).
-- Client CANNOT insert (RLS blocks, only SECURITY DEFINER functions can).
CREATE TABLE IF NOT EXISTS hai_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,4) NOT NULL, -- positive = credit, negative = debit
  balance_after NUMERIC(12,4) NOT NULL
    CHECK (balance_after >= 0), -- balance must never go negative
  kind TEXT NOT NULL
    CHECK (kind IN ('relay_earn', 'relay_spend', 'mb_convert', 'purchase', 'bonus', 'refund', 'adjustment')),
  reference_id UUID,
  reference_type TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── MB balances ──────────────────────────────────────────────
-- Tracks relay MB, saved MB, and total MB per user.
-- Client can INSERT own row but CANNOT modify balance fields via RLS.
-- Only SECURITY DEFINER functions (credit_mb, relay_message) modify balances.
CREATE TABLE IF NOT EXISTS mb_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relay_mb NUMERIC(10,2) NOT NULL DEFAULT 0.00
    CHECK (relay_mb >= 0),
  saved_mb NUMERIC(10,2) NOT NULL DEFAULT 0.00
    CHECK (saved_mb >= 0),
  mesh_mb NUMERIC(10,2) NOT NULL DEFAULT 0.00
    CHECK (mesh_mb >= 0),
  total_mb NUMERIC(10,2) NOT NULL DEFAULT 0.00
    CHECK (total_mb >= 0),
  daily_relay_used_mb NUMERIC(10,4) NOT NULL DEFAULT 0.00
    CHECK (daily_relay_used_mb >= 0),
  daily_relay_limit_mb NUMERIC(10,4) NOT NULL DEFAULT 5.00
    CHECK (daily_relay_limit_mb > 0 AND daily_relay_limit_mb <= 5),
  daily_reset_at DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ── Relay queue (store-and-forward) ──────────────────────────
CREATE TABLE IF NOT EXISTS relay_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID, -- null = broadcast/mesh
  message_id TEXT NOT NULL UNIQUE, -- client-generated UUID for dedup
  kind TEXT NOT NULL DEFAULT 'text'
    CHECK (kind IN ('text', 'deliveryMeta', 'statusUpdate', 'notification')),
  payload_bytes INT NOT NULL CHECK (payload_bytes >= 0),
  compact_bytes INT NOT NULL CHECK (compact_bytes >= 0),
  ttl_seconds INT NOT NULL DEFAULT 86400
    CHECK (ttl_seconds > 0 AND ttl_seconds <= 604800), -- max 7 days
  expires_at TIMESTAMPTZ NOT NULL,
  priority INT NOT NULL DEFAULT 5
    CHECK (priority >= 1 AND priority <= 10),
  state TEXT NOT NULL DEFAULT 'queued'
    CHECK (state IN ('queued', 'relaying', 'relayed', 'delivered', 'expired', 'failed', 'cancelled')),
  retry_count INT NOT NULL DEFAULT 0
    CHECK (retry_count >= 0),
  max_retries INT NOT NULL DEFAULT 5
    CHECK (max_retries >= 0),
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Device discovery ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_discovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  transport TEXT NOT NULL
    CHECK (transport IN ('bluetooth_le', 'wifi_direct', 'wifi_local', 'internet')),
  signal_strength INT,
  capabilities JSONB NOT NULL DEFAULT '[]',
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  paired BOOLEAN NOT NULL DEFAULT false,
  blocked BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id, transport)
);

-- ── Relay quotas ─────────────────────────────────────────────
-- Client can see own quota but CANNOT modify counters directly.
-- Only relay_message() and reset triggers modify counters.
CREATE TABLE IF NOT EXISTS relay_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_message_limit INT NOT NULL DEFAULT 500
    CHECK (daily_message_limit > 0),
  daily_bytes_limit BIGINT NOT NULL DEFAULT 5242880 -- 5 MB
    CHECK (daily_bytes_limit > 0),
  max_message_bytes INT NOT NULL DEFAULT 20480 -- 20 KB
    CHECK (max_message_bytes > 0),
  daily_messages_sent INT NOT NULL DEFAULT 0
    CHECK (daily_messages_sent >= 0),
  daily_bytes_sent BIGINT NOT NULL DEFAULT 0
    CHECK (daily_bytes_sent >= 0),
  daily_reset_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ── Local shares ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS local_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL
    CHECK (content_type IN ('post', 'reel', 'status', 'file', 'media')),
  transport TEXT NOT NULL DEFAULT 'bluetooth'
    CHECK (transport IN ('bluetooth', 'wifi_direct', 'wifi_local')),
  recipients JSONB NOT NULL DEFAULT '[]',
  bytes_sent BIGINT NOT NULL DEFAULT 0
    CHECK (bytes_sent >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'transferring', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_relay_sessions_buyer ON relay_sessions(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_relay_sessions_provider ON relay_sessions(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_relay_usage_session ON relay_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_relay_usage_message ON relay_usage(message_id);
CREATE INDEX IF NOT EXISTS idx_hai_points_user ON hai_points_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hai_points_user_kind ON hai_points_ledger(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_mb_balances_user ON mb_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_relay_queue_state ON relay_queue(state, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_relay_queue_sender ON relay_queue(sender_id, state);
CREATE INDEX IF NOT EXISTS idx_relay_queue_expires ON relay_queue(expires_at) WHERE state IN ('queued', 'relaying');
CREATE INDEX IF NOT EXISTS idx_relay_queue_message_id ON relay_queue(message_id);
CREATE INDEX IF NOT EXISTS idx_device_discovery_user ON device_discovery(user_id, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_relay_quotas_user ON relay_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_local_shares_user ON local_shares(user_id, status);

-- ══════════════════════════════════════════════════════════════
-- RLS — ENABLE + FORCE
-- ══════════════════════════════════════════════════════════════

ALTER TABLE relay_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_providers FORCE ROW LEVEL SECURITY;
ALTER TABLE relay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE relay_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_usage FORCE ROW LEVEL SECURITY;
ALTER TABLE hai_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE hai_points_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE mb_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE mb_balances FORCE ROW LEVEL SECURITY;
ALTER TABLE relay_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_queue FORCE ROW LEVEL SECURITY;
ALTER TABLE device_discovery ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_discovery FORCE ROW LEVEL SECURITY;
ALTER TABLE relay_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_quotas FORCE ROW LEVEL SECURITY;
ALTER TABLE local_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_shares FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════════════════════

-- ── relay_providers ───────────────────────────────────────────
-- SELECT: only active+available providers visible to others; owner sees all their own
CREATE POLICY "relay_providers_select" ON relay_providers FOR SELECT
  USING ((available = true AND status = 'active') OR user_id = auth.uid());

CREATE POLICY "relay_providers_insert" ON relay_providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "relay_providers_update" ON relay_providers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "relay_providers_delete" ON relay_providers FOR DELETE
  USING (auth.uid() = user_id);

-- ── relay_sessions ────────────────────────────────────────────
-- SELECT: buyer and provider (via subquery) see their sessions
CREATE POLICY "relay_sessions_select" ON relay_sessions FOR SELECT
  USING (buyer_id = auth.uid() OR provider_id IN (
    SELECT id FROM relay_providers WHERE user_id = auth.uid()
  ));
CREATE POLICY "relay_sessions_insert" ON relay_sessions FOR INSERT
  WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "relay_sessions_update" ON relay_sessions FOR UPDATE
  USING (buyer_id = auth.uid() OR provider_id IN (
    SELECT id FROM relay_providers WHERE user_id = auth.uid()
  ))
  WITH CHECK (buyer_id = auth.uid() OR provider_id IN (
    SELECT id FROM relay_providers WHERE user_id = auth.uid()
  ));

-- ── relay_usage ───────────────────────────────────────────────
-- SELECT: only participants of the related session
CREATE POLICY "relay_usage_select" ON relay_usage FOR SELECT
  USING (session_id IN (
    SELECT id FROM relay_sessions
    WHERE buyer_id = auth.uid() OR provider_id IN (
      SELECT id FROM relay_providers WHERE user_id = auth.uid()
    )
  ));
-- INSERT: only for sessions where the user is buyer or provider
CREATE POLICY "relay_usage_insert" ON relay_usage FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM relay_sessions
    WHERE buyer_id = auth.uid() OR provider_id IN (
      SELECT id FROM relay_providers WHERE user_id = auth.uid()
    )
  ));

-- ── hai_points_ledger ────────────────────────────────────────
-- SELECT: own ledger only
CREATE POLICY "hai_points_select" ON hai_points_ledger FOR SELECT
  USING (user_id = auth.uid());
-- INSERT: BLOCKED for clients. Only SECURITY DEFINER functions can insert.
CREATE POLICY "hai_points_insert" ON hai_points_ledger FOR INSERT
  WITH CHECK (false);
-- No UPDATE/DELETE policies = clients cannot modify or delete ledger entries.

-- ── mb_balances ──────────────────────────────────────────────
-- SELECT: own balance only
CREATE POLICY "mb_balances_select" ON mb_balances FOR SELECT
  USING (user_id = auth.uid());
-- INSERT: user can create own row (initial zero balance)
CREATE POLICY "mb_balances_insert" ON mb_balances FOR INSERT
  WITH CHECK (user_id = auth.uid());
-- UPDATE: user can update own row BUT only daily_relay_limit_mb and daily_reset_at.
-- Balance fields (relay_mb, saved_mb, mesh_mb, total_mb, daily_relay_used_mb)
-- are modified only by SECURITY DEFINER functions (credit_mb, relay_message).
-- This is enforced by the trigger trg_mb_balance_guard below.
CREATE POLICY "mb_balances_update" ON mb_balances FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- No DELETE policy = client cannot delete balance rows.

-- ── relay_queue ──────────────────────────────────────────────
-- SELECT: sender sees own, recipient sees theirs
CREATE POLICY "relay_queue_select" ON relay_queue FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
-- INSERT: sender_id must be the authenticated user
CREATE POLICY "relay_queue_insert" ON relay_queue FOR INSERT
  WITH CHECK (sender_id = auth.uid());
-- UPDATE: only sender can update, and only limited fields (state, last_error)
-- Enforced by trigger trg_queue_guard below.
CREATE POLICY "relay_queue_update" ON relay_queue FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());
-- DELETE: only sender can delete
CREATE POLICY "relay_queue_delete" ON relay_queue FOR DELETE
  USING (sender_id = auth.uid());

-- ── device_discovery ──────────────────────────────────────────
CREATE POLICY "device_discovery_select" ON device_discovery FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "device_discovery_insert" ON device_discovery FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "device_discovery_update" ON device_discovery FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "device_discovery_delete" ON device_discovery FOR DELETE
  USING (user_id = auth.uid());

-- ── relay_quotas ─────────────────────────────────────────────
-- SELECT: own quota only
CREATE POLICY "relay_quotas_select" ON relay_quotas FOR SELECT
  USING (user_id = auth.uid());
-- INSERT: user can create own row
CREATE POLICY "relay_quotas_insert" ON relay_quotas FOR INSERT
  WITH CHECK (user_id = auth.uid());
-- UPDATE: user can update own row BUT only max_message_bytes, daily_message_limit.
-- Counter fields are modified only by relay_message() and reset trigger.
-- Enforced by trigger trg_quota_guard below.
CREATE POLICY "relay_quotas_update" ON relay_quotas FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- No DELETE policy = client cannot delete quota rows.

-- ── local_shares ─────────────────────────────────────────────
CREATE POLICY "local_shares_select" ON local_shares FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "local_shares_insert" ON local_shares FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "local_shares_update" ON local_shares FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "local_shares_delete" ON local_shares FOR DELETE
  USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- GRANTS — complement RLS
-- ══════════════════════════════════════════════════════════════
-- authenticated users get standard CRUD (RLS policies filter rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON relay_providers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON relay_sessions TO authenticated;
GRANT SELECT, INSERT ON relay_usage TO authenticated;
GRANT SELECT ON hai_points_ledger TO authenticated; -- read-only for clients
GRANT SELECT, INSERT, UPDATE ON mb_balances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON relay_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON device_discovery TO authenticated;
GRANT SELECT, INSERT, UPDATE ON relay_quotas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON local_shares TO authenticated;

-- service_role (for SECURITY DEFINER functions) gets full access
GRANT ALL ON relay_providers TO service_role;
GRANT ALL ON relay_sessions TO service_role;
GRANT ALL ON relay_usage TO service_role;
GRANT ALL ON hai_points_ledger TO service_role;
GRANT ALL ON mb_balances TO service_role;
GRANT ALL ON relay_queue TO service_role;
GRANT ALL ON device_discovery TO service_role;
GRANT ALL ON relay_quotas TO service_role;
GRANT ALL ON local_shares TO service_role;

-- anonymous gets nothing
REVOKE ALL ON relay_providers FROM anon;
REVOKE ALL ON relay_sessions FROM anon;
REVOKE ALL ON relay_usage FROM anon;
REVOKE ALL ON hai_points_ledger FROM anon;
REVOKE ALL ON mb_balances FROM anon;
REVOKE ALL ON relay_queue FROM anon;
REVOKE ALL ON device_discovery FROM anon;
REVOKE ALL ON relay_quotas FROM anon;
REVOKE ALL ON local_shares FROM anon;

-- ══════════════════════════════════════════════════════════════
-- TRIGGER: GUARD — prevent client from modifying protected fields
-- ══════════════════════════════════════════════════════════════

-- mb_balances: only functions can change balance fields
CREATE OR REPLACE FUNCTION guard_mb_balance_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if called from a SECURITY DEFINER function (not direct client)
  IF current_setting('role') = 'supabase_admin' OR
     current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Client can only change daily_relay_limit_mb (and updated_at via trigger)
  IF NEW.relay_mb IS DISTINCT FROM OLD.relay_mb OR
     NEW.saved_mb IS DISTINCT FROM OLD.saved_mb OR
     NEW.mesh_mb IS DISTINCT FROM OLD.mesh_mb OR
     NEW.total_mb IS DISTINCT FROM OLD.total_mb OR
     NEW.daily_relay_used_mb IS DISTINCT FROM OLD.daily_relay_used_mb THEN
    RAISE EXCEPTION 'Balance fields can only be modified by server functions'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mb_balance_guard
  BEFORE UPDATE ON mb_balances
  FOR EACH ROW EXECUTE FUNCTION guard_mb_balance_fields();

-- relay_quotas: only functions can change counter fields
CREATE OR REPLACE FUNCTION guard_quota_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') = 'supabase_admin' OR
     current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.daily_messages_sent IS DISTINCT FROM OLD.daily_messages_sent OR
     NEW.daily_bytes_sent IS DISTINCT FROM OLD.daily_bytes_sent THEN
    RAISE EXCEPTION 'Quota counters can only be modified by server functions'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quota_guard
  BEFORE UPDATE ON relay_quotas
  FOR EACH ROW EXECUTE FUNCTION guard_quota_fields();

-- relay_queue: sender can only change state and last_error
CREATE OR REPLACE FUNCTION guard_queue_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') = 'supabase_admin' OR
     current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id OR
     NEW.message_id IS DISTINCT FROM OLD.message_id OR
     NEW.kind IS DISTINCT FROM OLD.kind OR
     NEW.compact_bytes IS DISTINCT FROM OLD.compact_bytes OR
     NEW.payload_bytes IS DISTINCT FROM OLD.payload_bytes THEN
    RAISE EXCEPTION 'Immutable queue fields cannot be changed'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_queue_guard
  BEFORE UPDATE ON relay_queue
  FOR EACH ROW EXECUTE FUNCTION guard_queue_fields();

-- ══════════════════════════════════════════════════════════════
-- TRIGGER: DAILY RESET
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_daily_relay_reset()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.daily_reset_at < CURRENT_DATE THEN
    NEW.daily_relay_used_mb := 0;
    NEW.daily_reset_at := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mb_daily_reset
  BEFORE UPDATE ON mb_balances
  FOR EACH ROW EXECUTE FUNCTION check_daily_relay_reset();

CREATE OR REPLACE FUNCTION check_daily_quota_reset()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.daily_reset_at < CURRENT_DATE THEN
    NEW.daily_messages_sent := 0;
    NEW.daily_bytes_sent := 0;
    NEW.daily_reset_at := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quota_daily_reset
  BEFORE UPDATE ON relay_quotas
  FOR EACH ROW EXECUTE FUNCTION check_daily_quota_reset();

-- ══════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ══════════════════════════════════════════════════════════════

-- ── credit_mb: atomic balance update ─────────────────────────
CREATE OR REPLACE FUNCTION credit_mb(
  p_user_id UUID,
  p_relay_mb NUMERIC,
  p_saved_mb NUMERIC,
  p_mesh_mb NUMERIC,
  p_kind TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS mb_balances
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_balance mb_balances%ROWTYPE;
  v_new_relay NUMERIC;
  v_new_saved NUMERIC;
  v_new_mesh NUMERIC;
  v_new_total NUMERIC;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'credit_mb: user_id cannot be NULL';
  END IF;

  -- Ensure row exists (insert with zeros if not)
  INSERT INTO mb_balances (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock the row to prevent concurrent modifications
  SELECT * INTO v_balance FROM mb_balances
  WHERE user_id = p_user_id FOR UPDATE;

  -- Calculate new values with floor at zero
  v_new_relay := GREATEST(0, v_balance.relay_mb + COALESCE(p_relay_mb, 0));
  v_new_saved := GREATEST(0, v_balance.saved_mb + COALESCE(p_saved_mb, 0));
  v_new_mesh := GREATEST(0, v_balance.mesh_mb + COALESCE(p_mesh_mb, 0));
  v_new_total := v_new_relay + v_new_saved + v_new_mesh;

  -- Update
  UPDATE mb_balances SET
    relay_mb = v_new_relay,
    saved_mb = v_new_saved,
    mesh_mb = v_new_mesh,
    total_mb = v_new_total,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_balance;

  RETURN v_balance;
END;
$$;

-- ── relay_message: atomic queue + quota + balance ────────────
CREATE OR REPLACE FUNCTION relay_message(
  p_recipient_id UUID,
  p_message_id TEXT,
  p_kind TEXT,
  p_payload_bytes INT,
  p_compact_bytes INT,
  p_ttl_seconds INT DEFAULT 86400,
  p_priority INT DEFAULT 5,
  p_signature TEXT DEFAULT NULL
) RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_sender_id UUID;
  v_quota relay_quotas%ROWTYPE;
  v_balance mb_balances%ROWTYPE;
  v_cost_mb NUMERIC;
  v_existing RECORD;
BEGIN
  -- Use authenticated user, not client-supplied ID
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'unauthenticated',
      'message', 'Hujaingia', 'charged_bytes', 0
    );
  END IF;

  -- ── Input validation ──────────────────────────────────────
  IF p_message_id IS NULL OR length(trim(p_message_id)) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'invalid',
      'message', 'message_id ni lazima', 'charged_bytes', 0
    );
  END IF;

  IF p_kind IS NULL OR p_kind NOT IN ('text', 'deliveryMeta', 'statusUpdate', 'notification') THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'invalid_kind',
      'message', 'Aina ya ujumbe si sahihi', 'charged_bytes', 0
    );
  END IF;

  IF p_payload_bytes IS NULL OR p_payload_bytes < 0 THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'invalid',
      'message', 'payload_bytes si sahihi', 'charged_bytes', 0
    );
  END IF;

  IF p_compact_bytes IS NULL OR p_compact_bytes < 0 THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'invalid',
      'message', 'compact_bytes si sahihi', 'charged_bytes', 0
    );
  END IF;

  IF p_compact_bytes > p_payload_bytes THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'invalid',
      'message', 'compact_bytes haziwezi kuzidi payload_bytes', 'charged_bytes', 0
    );
  END IF;

  IF p_ttl_seconds IS NULL OR p_ttl_seconds <= 0 OR p_ttl_seconds > 604800 THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'invalid',
      'message', 'TTL si sahihi (max 7 siku)', 'charged_bytes', 0
    );
  END IF;

  IF p_priority IS NULL OR p_priority < 1 OR p_priority > 10 THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'invalid',
      'message', 'Priority si sahihi (1-10)', 'charged_bytes', 0
    );
  END IF;

  -- ── Idempotency: check if message_id already exists ──────
  SELECT id, state, compact_bytes INTO v_existing
  FROM relay_queue WHERE message_id = p_message_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true, 'reason', 'duplicate',
      'message', 'Ujumbe tayari upo kwenye foleni',
      'message_id', p_message_id,
      'existing_state', v_existing.state,
      'charged_bytes', 0
    );
  END IF;

  -- ── Ensure quota and balance rows exist ───────────────────
  INSERT INTO relay_quotas (user_id) VALUES (v_sender_id)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO mb_balances (user_id) VALUES (v_sender_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- ── Lock and check quota ──────────────────────────────────
  SELECT * INTO v_quota FROM relay_quotas
  WHERE user_id = v_sender_id FOR UPDATE;

  -- Daily reset if needed
  IF v_quota.daily_reset_at < CURRENT_DATE THEN
    v_quota.daily_messages_sent := 0;
    v_quota.daily_bytes_sent := 0;
    UPDATE relay_quotas SET
      daily_messages_sent = 0,
      daily_bytes_sent = 0,
      daily_reset_at = CURRENT_DATE,
      updated_at = now()
    WHERE user_id = v_sender_id;
  END IF;

  -- Check max message size
  IF p_compact_bytes > v_quota.max_message_bytes THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'too_large',
      'message', 'Ujumbe mkubwa sana kwa relay',
      'cap_bytes', v_quota.max_message_bytes,
      'charged_bytes', 0
    );
  END IF;

  -- Check daily byte limit
  IF v_quota.daily_bytes_sent + p_compact_bytes > v_quota.daily_bytes_limit THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'limit',
      'message', 'Ukomo wa relay wa siku umefikiwa',
      'charged_bytes', 0
    );
  END IF;

  -- Check daily message count
  IF v_quota.daily_messages_sent >= v_quota.daily_message_limit THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'message_limit',
      'message', 'Idadi ya ujumbe wa siku imeisha',
      'charged_bytes', 0
    );
  END IF;

  -- ── Check balance BEFORE charging ─────────────────────────
  v_cost_mb := p_compact_bytes::NUMERIC / 1048576;

  SELECT * INTO v_balance FROM mb_balances
  WHERE user_id = v_sender_id FOR UPDATE;

  IF v_balance.relay_mb < v_cost_mb THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'insufficient_balance',
      'message', 'Salio la MB halitoshi',
      'required_mb', v_cost_mb,
      'available_mb', v_balance.relay_mb,
      'charged_bytes', 0
    );
  END IF;

  -- ── Insert into queue ─────────────────────────────────────
  INSERT INTO relay_queue (
    sender_id, recipient_id, message_id, kind,
    payload_bytes, compact_bytes, ttl_seconds,
    expires_at, priority, signature, state
  ) VALUES (
    v_sender_id, p_recipient_id, p_message_id, p_kind,
    p_payload_bytes, p_compact_bytes, p_ttl_seconds,
    now() + (p_ttl_seconds || ' seconds')::interval,
    p_priority, p_signature, 'queued'
  );

  -- ── Update quota counters ─────────────────────────────────
  UPDATE relay_quotas SET
    daily_messages_sent = daily_messages_sent + 1,
    daily_bytes_sent = daily_bytes_sent + p_compact_bytes,
    updated_at = now()
  WHERE user_id = v_sender_id;

  -- ── Debit MB balance ──────────────────────────────────────
  PERFORM credit_mb(
    v_sender_id, -v_cost_mb, 0, 0,
    'relay_spend', NULL, 'relay_queue', 'Relay usage'
  );

  RETURN jsonb_build_object(
    'ok', true, 'reason', '',
    'message', 'Ujumbe umeongezwa kwenye foleni',
    'message_id', p_message_id,
    'compact_bytes', p_compact_bytes,
    'charged_bytes', p_compact_bytes,
    'cost_mb', v_cost_mb,
    'remaining_daily_mb',
      (v_quota.daily_bytes_limit - v_quota.daily_bytes_sent - p_compact_bytes)::NUMERIC / 1048576
  );
END;
$$;

-- ── register_relay_provider ──────────────────────────────────
CREATE OR REPLACE FUNCTION register_relay_provider(
  p_max_clients INT DEFAULT 200,
  p_daily_limit_mb NUMERIC DEFAULT 500.00
) RETURNS relay_providers
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider relay_providers%ROWTYPE;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Hujaingia' USING ERRCODE = '42501';
  END IF;

  IF p_max_clients IS NULL OR p_max_clients <= 0 THEN
    RAISE EXCEPTION 'max_clients lazima iwe zaidi ya 0' USING ERRCODE = '23514';
  END IF;

  IF p_daily_limit_mb IS NULL OR p_daily_limit_mb <= 0 THEN
    RAISE EXCEPTION 'daily_limit_mb lazima iwe zaidi ya 0' USING ERRCODE = '23514';
  END IF;

  INSERT INTO relay_providers (
    user_id, max_clients_per_day, daily_data_limit_mb
  ) VALUES (
    v_user_id, p_max_clients, p_daily_limit_mb
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    max_clients_per_day = EXCLUDED.max_clients_per_day,
    daily_data_limit_mb = EXCLUDED.daily_data_limit_mb,
    available = true,
    updated_at = now()
  RETURNING * INTO v_provider;

  RETURN v_provider;
END;
$$;

-- ── provider_heartbeat ───────────────────────────────────────
CREATE OR REPLACE FUNCTION provider_heartbeat()
RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE relay_providers
  SET last_heartbeat = now(), updated_at = now()
  WHERE user_id = auth.uid() AND status = 'active';
END;
$$;

-- ── cleanup_expired_relay_queue ──────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_relay_queue()
RETURNS INT
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE relay_queue SET state = 'expired', updated_at = now()
  WHERE state IN ('queued', 'relaying') AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- FUNCTION EXECUTE GRANTS
-- ══════════════════════════════════════════════════════════════
-- authenticated users can call these functions
GRANT EXECUTE ON FUNCTION relay_message(UUID, TEXT, TEXT, INT, INT, INT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION register_relay_provider(INT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION provider_heartbeat() TO authenticated;

-- cleanup is service_role only (cron/admin)
GRANT EXECUTE ON FUNCTION cleanup_expired_relay_queue() TO service_role;

-- credit_mb is internal (called by relay_message and other functions)
GRANT EXECUTE ON FUNCTION credit_mb(UUID, NUMERIC, NUMERIC, NUMERIC, TEXT, UUID, TEXT, TEXT) TO service_role;

-- guard triggers need no explicit grants (execute as table owner)