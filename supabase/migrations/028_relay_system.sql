-- ══════════════════════════════════════════════════════════════
-- PASIHAI MIGRATION 028 — OFFLINE MESH RELAY & INTERNET RELAY
--
-- Tables:
--   relay_providers      — mtu anayetoa relay (internet)
--   relay_sessions       — kikao cha relay (mmoja kwa mmoja)
--   relay_usage          — matumizi ya data kwa kila ujumbe
--   hai_points_ledger    — hesabu ya Hai Points
--   mb_balances          — salio la MB (relay + saved)
--   relay_queue          — foleni ya ujumbe (store-and-forward)
--   device_discovery     — vifaa vilivyogunduliwa (nearby)
--   relay_quotas         — ukomo wa kila mtumiaji/siku
--   local_shares         — maudhui yaliyoshirikiwa karibu
--
-- DESIGN PRINCIPLES:
--   1. Server is single source of truth for balances, points, sessions
--   2. Client CANNOT self-credit — all balance changes are atomic
--   3. 1 Hai Point = 5 MB (pasihai default)
--   4. Relay commission: 10% to system, 90% to provider
--   5. Daily relay limit: 5 MB default, 5 MB hard max
--   6. Messages only for internet relay (no files/video/audio)
-- ══════════════════════════════════════════════════════════════

-- ── Relay providers ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relay_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'offline', 'deleted')),
  max_clients_per_day INT NOT NULL DEFAULT 200,
  daily_data_limit_mb NUMERIC(10,2) NOT NULL DEFAULT 500.00,
  current_clients_today INT NOT NULL DEFAULT 0,
  current_data_today_mb NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_earnings NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  commission_rate NUMERIC(4,2) NOT NULL DEFAULT 0.10,
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
  bytes_transferred BIGINT NOT NULL DEFAULT 0,
  messages_relayed INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  total_cost NUMERIC(10,4) NOT NULL DEFAULT 0.00,
  provider_earnings NUMERIC(10,4) NOT NULL DEFAULT 0.00,
  system_commission NUMERIC(10,4) NOT NULL DEFAULT 0.00,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Relay usage per message ──────────────────────────────────
CREATE TABLE IF NOT EXISTS relay_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES relay_sessions(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text'
    CHECK (kind IN ('text', 'deliveryMeta', 'statusUpdate', 'notification')),
  raw_bytes INT NOT NULL,
  compact_bytes INT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'delivered'
    CHECK (status IN ('pending', 'relayed', 'delivered', 'failed', 'duplicate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Hai Points ledger ────────────────────────────────────────
-- All balance changes are INSERT-only (append-only ledger)
CREATE TABLE IF NOT EXISTS hai_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,4) NOT NULL, -- positive = credit, negative = debit
  balance_after NUMERIC(12,4) NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN ('relay_earn', 'relay_spend', 'mb_convert', 'purchase', 'bonus', 'refund', 'adjustment')),
  reference_id UUID, -- session_id, transaction_id, etc.
  reference_type TEXT, -- 'relay_session', 'mb_balance', etc.
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── MB balances ──────────────────────────────────────────────
-- Tracks relay MB, saved MB, and total MB per user
CREATE TABLE IF NOT EXISTS mb_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relay_mb NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  saved_mb NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  mesh_mb NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_mb NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  daily_relay_used_mb NUMERIC(10,4) NOT NULL DEFAULT 0.00,
  daily_relay_limit_mb NUMERIC(10,4) NOT NULL DEFAULT 5.00,
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
  payload_bytes INT NOT NULL,
  compact_bytes INT NOT NULL,
  ttl_seconds INT NOT NULL DEFAULT 86400, -- 24 hours default
  expires_at TIMESTAMPTZ NOT NULL,
  priority INT NOT NULL DEFAULT 5,
  state TEXT NOT NULL DEFAULT 'queued'
    CHECK (state IN ('queued', 'relaying', 'relayed', 'delivered', 'expired', 'failed', 'cancelled')),
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  signature TEXT, -- HMAC signature for integrity
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
  signal_strength INT, -- RSSI for BLE, percentage for WiFi
  capabilities JSONB NOT NULL DEFAULT '[]',
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  paired BOOLEAN NOT NULL DEFAULT false,
  blocked BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id, transport)
);

-- ── Relay quotas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relay_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_message_limit INT NOT NULL DEFAULT 500,
  daily_bytes_limit BIGINT NOT NULL DEFAULT 5242880, -- 5 MB
  max_message_bytes INT NOT NULL DEFAULT 20480, -- 20 KB
  daily_messages_sent INT NOT NULL DEFAULT 0,
  daily_bytes_sent BIGINT NOT NULL DEFAULT 0,
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
  recipients JSONB NOT NULL DEFAULT '[]', -- array of device_ids
  bytes_sent BIGINT NOT NULL DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_hai_points_user ON hai_points_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mb_balances_user ON mb_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_relay_queue_state ON relay_queue(state, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_relay_queue_sender ON relay_queue(sender_id, state);
CREATE INDEX IF NOT EXISTS idx_relay_queue_expires ON relay_queue(expires_at) WHERE state IN ('queued', 'relaying');
CREATE INDEX IF NOT EXISTS idx_device_discovery_user ON device_discovery(user_id, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_relay_quotas_user ON relay_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_local_shares_user ON local_shares(user_id, status);

-- ══════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════

ALTER TABLE relay_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE hai_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE mb_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_discovery ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_shares ENABLE ROW LEVEL SECURITY;

-- Providers: own profile public, own data full access
CREATE POLICY "relay_providers_select" ON relay_providers FOR SELECT
  USING (true); -- anyone can see active providers
CREATE POLICY "relay_providers_insert" ON relay_providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "relay_providers_update" ON relay_providers FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "relay_providers_delete" ON relay_providers FOR DELETE
  USING (auth.uid() = user_id);

-- Sessions: buyer and provider can see their own
CREATE POLICY "relay_sessions_select" ON relay_sessions FOR SELECT
  USING (buyer_id = auth.uid() OR provider_id IN (
    SELECT id FROM relay_providers WHERE user_id = auth.uid()
  ));
CREATE POLICY "relay_sessions_insert" ON relay_sessions FOR INSERT
  WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "relay_sessions_update" ON relay_sessions FOR UPDATE
  USING (buyer_id = auth.uid() OR provider_id IN (
    SELECT id FROM relay_providers WHERE user_id = auth.uid()
  ));

-- Usage: linked to sessions
CREATE POLICY "relay_usage_select" ON relay_usage FOR SELECT
  USING (session_id IN (
    SELECT id FROM relay_sessions
    WHERE buyer_id = auth.uid() OR provider_id IN (
      SELECT id FROM relay_providers WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "relay_usage_insert" ON relay_usage FOR INSERT
  WITH CHECK (true); -- server-side inserts

-- Hai Points: own ledger only
CREATE POLICY "hai_points_select" ON hai_points_ledger FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "hai_points_insert" ON hai_points_ledger FOR INSERT
  WITH CHECK (false); -- only server functions can insert

-- MB Balances: own balance only
CREATE POLICY "mb_balances_select" ON mb_balances FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "mb_balances_insert" ON mb_balances FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "mb_balances_update" ON mb_balances FOR UPDATE
  USING (user_id = auth.uid());

-- Queue: own messages
CREATE POLICY "relay_queue_select" ON relay_queue FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "relay_queue_insert" ON relay_queue FOR INSERT
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "relay_queue_update" ON relay_queue FOR UPDATE
  USING (sender_id = auth.uid());
CREATE POLICY "relay_queue_delete" ON relay_queue FOR DELETE
  USING (sender_id = auth.uid());

-- Device discovery: own devices
CREATE POLICY "device_discovery_select" ON device_discovery FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "device_discovery_insert" ON device_discovery FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "device_discovery_update" ON device_discovery FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "device_discovery_delete" ON device_discovery FOR DELETE
  USING (user_id = auth.uid());

-- Quotas: own quotas
CREATE POLICY "relay_quotas_select" ON relay_quotas FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "relay_quotas_insert" ON relay_quotas FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "relay_quotas_update" ON relay_quotas FOR UPDATE
  USING (user_id = auth.uid());

-- Local shares: own shares
CREATE POLICY "local_shares_select" ON local_shares FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "local_shares_insert" ON local_shares FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "local_shares_update" ON local_shares FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "local_shares_delete" ON local_shares FOR DELETE
  USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ══════════════════════════════════════════════════════════════

-- Atomic MB credit with balance integrity
CREATE OR REPLACE FUNCTION credit_mb(
  p_user_id UUID,
  p_relay_mb NUMERIC,
  p_saved_mb NUMERIC,
  p_mesh_mb NUMERIC,
  p_kind TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS mb_balances AS $$
DECLARE
  v_balance mb_balances%ROWTYPE;
BEGIN
  INSERT INTO mb_balances (user_id, relay_mb, saved_mb, mesh_mb, total_mb)
  VALUES (p_user_id,
          GREATEST(0, p_relay_mb),
          GREATEST(0, p_saved_mb),
          GREATEST(0, p_mesh_mb),
          GREATEST(0, p_relay_mb + p_saved_mb + p_mesh_mb))
  ON CONFLICT (user_id) DO UPDATE SET
    relay_mb = GREATEST(0, mb_balances.relay_mb + p_relay_mb),
    saved_mb = GREATEST(0, mb_balances.saved_mb + p_saved_mb),
    mesh_mb = GREATEST(0, mb_balances.mesh_mb + p_mesh_mb),
    total_mb = GREATEST(0, mb_balances.relay_mb + p_relay_mb
                         + mb_balances.saved_mb + p_saved_mb
                         + mb_balances.mesh_mb + p_mesh_mb),
    updated_at = now()
  RETURNING * INTO v_balance;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset daily relay counters if needed
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

-- Similar for quotas
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

-- Relay message with atomic quota enforcement
CREATE OR REPLACE FUNCTION relay_message(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_message_id TEXT,
  p_kind TEXT,
  p_payload_bytes INT,
  p_compact_bytes INT,
  p_ttl_seconds INT DEFAULT 86400,
  p_priority INT DEFAULT 5,
  p_signature TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_quota relay_quotas%ROWTYPE;
  v_balance mb_balances%ROWTYPE;
  v_cost_mb NUMERIC;
  v_result JSONB;
BEGIN
  -- Ensure quota exists
  INSERT INTO relay_quotas (user_id)
  VALUES (p_sender_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Ensure balance exists
  INSERT INTO mb_balances (user_id)
  VALUES (p_sender_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock and read quota
  SELECT * INTO v_quota FROM relay_quotas
  WHERE user_id = p_sender_id FOR UPDATE;

  -- Check daily reset
  IF v_quota.daily_reset_at < CURRENT_DATE THEN
    UPDATE relay_quotas SET
      daily_messages_sent = 0,
      daily_bytes_sent = 0,
      daily_reset_at = CURRENT_DATE
    WHERE user_id = p_sender_id;
    v_quota.daily_messages_sent := 0;
    v_quota.daily_bytes_sent := 0;
  END IF;

  -- Check message size
  IF p_compact_bytes > v_quota.max_message_bytes THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'too_large',
      'message', 'Ujumbe mkubwa sana kwa relay',
      'cap_bytes', v_quota.max_message_bytes,
      'charged_bytes', 0
    );
  END IF;

  -- Check daily byte limit
  IF v_quota.daily_bytes_sent + p_compact_bytes > v_quota.daily_bytes_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'limit',
      'message', 'Ukomo wa relay wa siku umefikiwa',
      'charged_bytes', 0
    );
  END IF;

  -- Check message count
  IF v_quota.daily_messages_sent >= v_quota.daily_message_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'message_limit',
      'message', 'Idadi ya ujumbe wa siku imeisha',
      'charged_bytes', 0
    );
  END IF;

  -- Insert into queue
  INSERT INTO relay_queue (
    sender_id, recipient_id, message_id, kind,
    payload_bytes, compact_bytes, ttl_seconds,
    expires_at, priority, signature, state
  ) VALUES (
    p_sender_id, p_recipient_id, p_message_id, p_kind,
    p_payload_bytes, p_compact_bytes, p_ttl_seconds,
    now() + (p_ttl_seconds || ' seconds')::interval,
    p_priority, p_signature, 'queued'
  );

  -- Update quotas
  UPDATE relay_quotas SET
    daily_messages_sent = daily_messages_sent + 1,
    daily_bytes_sent = daily_bytes_sent + p_compact_bytes,
    updated_at = now()
  WHERE user_id = p_sender_id;

  -- Update MB balance (relay usage)
  v_cost_mb := p_compact_bytes::NUMERIC / 1048576; -- bytes to MB
  SELECT * INTO v_balance FROM credit_mb(
    p_sender_id, -v_cost_mb, 0, 0, 'relay_spend', NULL, 'relay_queue', 'Relay usage'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'reason', '',
    'message', 'Ujumbe umeongezwa kwenye foleni',
    'message_id', p_message_id,
    'compact_bytes', p_compact_bytes,
    'charged_bytes', p_compact_bytes,
    'cost_mb', v_cost_mb,
    'remaining_daily_mb',
      (v_quota.daily_bytes_limit - v_quota.daily_bytes_sent - p_compact_bytes)::NUMERIC / 1048576
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Provider registration
CREATE OR REPLACE FUNCTION register_relay_provider(
  p_max_clients INT DEFAULT 200,
  p_daily_limit_mb NUMERIC DEFAULT 500.00
) RETURNS relay_providers AS $$
DECLARE
  v_provider relay_providers%ROWTYPE;
BEGIN
  INSERT INTO relay_providers (
    user_id, max_clients_per_day, daily_data_limit_mb
  ) VALUES (
    auth.uid(), p_max_clients, p_daily_limit_mb
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    max_clients_per_day = EXCLUDED.max_clients_per_day,
    daily_data_limit_mb = EXCLUDED.daily_data_limit_mb,
    updated_at = now()
  RETURNING * INTO v_provider;

  RETURN v_provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Provider heartbeat
CREATE OR REPLACE FUNCTION provider_heartbeat()
RETURNS VOID AS $$
BEGIN
  UPDATE relay_providers
  SET last_heartbeat = now(), updated_at = now()
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired queue items
CREATE OR REPLACE FUNCTION cleanup_expired_relay_queue()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE relay_queue SET state = 'expired', updated_at = now()
  WHERE state IN ('queued', 'relaying') AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;