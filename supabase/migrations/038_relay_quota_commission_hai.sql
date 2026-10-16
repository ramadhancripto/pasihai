-- PROPOSED. Not applied to hosted/production from this environment.
-- Aligns server with client: daily 3|5 MB, default 3, commission 2%, Hai spend RPC.
-- Requires owner permission on staging. Does not replace 028 history.

-- 1) Commission 2%
ALTER TABLE relay_providers
  ALTER COLUMN commission_rate SET DEFAULT 0.02;

UPDATE relay_providers
  SET commission_rate = 0.02
  WHERE commission_rate = 0.10;

-- 2) Quota defaults: 3 MB/day (3145728 bytes), still allow 5 MB
ALTER TABLE relay_quotas
  ALTER COLUMN daily_bytes_limit SET DEFAULT 3145728;

ALTER TABLE mb_balances
  ALTER COLUMN daily_relay_limit_mb SET DEFAULT 3.00;

UPDATE relay_quotas
  SET daily_bytes_limit = 3145728
  WHERE daily_bytes_limit = 5242880;

UPDATE mb_balances
  SET daily_relay_limit_mb = 3.00
  WHERE daily_relay_limit_mb = 5.00
    AND daily_relay_used_mb <= 3.00;

-- 3) Fragment groups: anti split-evasion (not content chunking)
CREATE TABLE IF NOT EXISTS relay_fragment_groups (
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  bytes_acc BIGINT NOT NULL DEFAULT 0 CHECK (bytes_acc >= 0),
  PRIMARY KEY (sender_id, group_id, day)
);

ALTER TABLE relay_fragment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_fragment_groups FORCE ROW LEVEL SECURITY;

-- 4) Hai spend idempotency
CREATE TABLE IF NOT EXISTS hai_spend_keys (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  points NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idempotency_key)
);

-- 5) User may set only 3 or 5 MB daily
CREATE OR REPLACE FUNCTION set_relay_daily_limit(p_mb NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_bytes BIGINT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;
  IF p_mb IS DISTINCT FROM 3 AND p_mb IS DISTINCT FROM 5 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid', 'message', 'Chagua MB 3 au MB 5');
  END IF;
  v_bytes := (p_mb * 1048576)::BIGINT;
  INSERT INTO relay_quotas (user_id, daily_bytes_limit) VALUES (v_uid, v_bytes)
  ON CONFLICT (user_id) DO UPDATE SET daily_bytes_limit = EXCLUDED.daily_bytes_limit, updated_at = now();
  INSERT INTO mb_balances (user_id, daily_relay_limit_mb) VALUES (v_uid, p_mb)
  ON CONFLICT (user_id) DO UPDATE SET daily_relay_limit_mb = EXCLUDED.daily_relay_limit_mb, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'limit_mb', p_mb, 'period', 'daily');
END;
$$;

GRANT EXECUTE ON FUNCTION set_relay_daily_limit(NUMERIC) TO authenticated;

-- 6) Hai points spend with consent flag + idempotency (no double charge)
CREATE OR REPLACE FUNCTION spend_hai_points(
  p_idempotency_key TEXT,
  p_points NUMERIC,
  p_consent BOOLEAN,
  p_extra_bytes BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_bal NUMERIC;
  v_expected NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated', 'charged', false);
  END IF;
  IF p_consent IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_consent', 'charged', false);
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_idempotency', 'charged', false);
  END IF;
  -- 1 point = 5 MB
  v_expected := (GREATEST(p_extra_bytes, 0)::NUMERIC / 1048576) / 5.0;
  IF abs(p_points - v_expected) > 0.0001 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'points_mismatch', 'charged', false);
  END IF;

  INSERT INTO hai_spend_keys (user_id, idempotency_key, points)
  VALUES (v_uid, p_idempotency_key, p_points)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'duplicate', 'charged', false, 'already_charged', true);
  END IF;

  SELECT COALESCE((
    SELECT balance_after FROM hai_points_ledger WHERE user_id = v_uid ORDER BY created_at DESC LIMIT 1
  ), 0) INTO v_bal;

  IF v_bal < p_points THEN
    DELETE FROM hai_spend_keys WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_points', 'charged', false);
  END IF;

  INSERT INTO hai_points_ledger (user_id, amount, balance_after, kind, note)
  VALUES (v_uid, -p_points, v_bal - p_points, 'relay_spend', 'consented extra relay');

  RETURN jsonb_build_object('ok', true, 'charged', true, 'points', p_points, 'balance_after', v_bal - p_points);
END;
$$;

GRANT EXECUTE ON FUNCTION spend_hai_points(TEXT, NUMERIC, BOOLEAN, BIGINT) TO authenticated;

-- 7) Commission helper used at settlement (after verified usage, not queue insert)
CREATE OR REPLACE FUNCTION relay_commission_rate()
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT 0.02::NUMERIC;
$$;

-- No remaining 10% default path on this table after 038
ALTER TABLE relay_providers
  ADD CONSTRAINT relay_providers_commission_2pct CHECK (commission_rate = 0.02);

CREATE TABLE IF NOT EXISTS relay_settlements (
  message_id TEXT PRIMARY KEY,
  provider_id UUID,
  compact_bytes BIGINT NOT NULL,
  commission_rate NUMERIC(4,2) NOT NULL,
  commission_mb NUMERIC(12,6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settlement only after recipient-verified delivered. Not queued/forwarded.
CREATE OR REPLACE FUNCTION settle_relay_usage(p_message_id TEXT, p_provider_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row relay_queue%ROWTYPE;
  v_rate NUMERIC := relay_commission_rate();
  v_comm NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated', 'settled', false);
  END IF;
  SELECT * INTO v_row FROM relay_queue WHERE message_id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing', 'settled', false);
  END IF;
  IF v_row.state IS DISTINCT FROM 'delivered' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_delivered', 'state', v_row.state, 'settled', false);
  END IF;
  IF EXISTS (SELECT 1 FROM relay_settlements WHERE message_id = p_message_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'duplicate_settlement', 'settled', false);
  END IF;
  v_comm := (v_row.compact_bytes::NUMERIC / 1048576) * v_rate;
  INSERT INTO relay_settlements (message_id, provider_id, compact_bytes, commission_rate, commission_mb)
  VALUES (p_message_id, p_provider_id, v_row.compact_bytes, v_rate, v_comm);
  RETURN jsonb_build_object(
    'ok', true, 'settled', true, 'commission_rate', v_rate, 'commission_mb', v_comm, 'message_id', p_message_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION settle_relay_usage(TEXT, UUID) TO authenticated;

-- Server-side fragment + kind + 20KB gate (call inside enqueue path / tests)
CREATE OR REPLACE FUNCTION relay_check_fragment(
  p_fragment_group TEXT,
  p_compact_bytes INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_acc BIGINT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;
  IF p_compact_bytes IS NULL OR p_compact_bytes <= 0 OR p_compact_bytes > 20480 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_large');
  END IF;
  IF p_fragment_group IS NULL OR length(trim(p_fragment_group)) = 0 THEN
    RETURN jsonb_build_object('ok', true);
  END IF;
  INSERT INTO relay_fragment_groups (sender_id, group_id, day, bytes_acc)
  VALUES (v_uid, p_fragment_group, CURRENT_DATE, p_compact_bytes)
  ON CONFLICT (sender_id, group_id, day) DO UPDATE
    SET bytes_acc = relay_fragment_groups.bytes_acc + EXCLUDED.bytes_acc
  RETURNING bytes_acc INTO v_acc;
  IF v_acc > 20480 THEN
    UPDATE relay_fragment_groups SET bytes_acc = bytes_acc - p_compact_bytes
      WHERE sender_id = v_uid AND group_id = p_fragment_group AND day = CURRENT_DATE;
    RETURN jsonb_build_object('ok', false, 'reason', 'split_evasion');
  END IF;
  RETURN jsonb_build_object('ok', true, 'bytes_acc', v_acc);
END;
$$;

GRANT EXECUTE ON FUNCTION relay_check_fragment(TEXT, INT) TO authenticated;
