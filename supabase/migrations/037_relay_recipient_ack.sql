-- PROPOSED. Not applied to hosted/production from this environment.
-- 028 has relay_queue.delivered but no recipient fetch/ack RPCs.
-- Apply only with owner permission on staging.

CREATE OR REPLACE FUNCTION fetch_relay_inbox(p_limit INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated', 'items', '[]'::jsonb);
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'message_id', message_id,
        'sender_id', sender_id,
        'kind', kind,
        'state', state,
        'created_at', created_at
      ) ORDER BY created_at)
      FROM (
        SELECT * FROM relay_queue
        WHERE recipient_id = v_uid
          AND state IN ('queued', 'relaying', 'relayed')
        ORDER BY created_at
        LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 100))
      ) t
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION ack_relay_delivered(p_message_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row relay_queue%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;
  SELECT * INTO v_row FROM relay_queue WHERE message_id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing');
  END IF;
  IF v_row.recipient_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  IF v_row.state = 'delivered' THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'duplicate', 'state', 'delivered');
  END IF;
  IF v_row.state NOT IN ('queued', 'relaying', 'relayed') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'illegal_state', 'state', v_row.state);
  END IF;
  UPDATE relay_queue SET state = 'delivered', updated_at = now() WHERE id = v_row.id;
  RETURN jsonb_build_object('ok', true, 'state', 'delivered', 'message_id', p_message_id);
END;
$$;

GRANT EXECUTE ON FUNCTION fetch_relay_inbox(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION ack_relay_delivered(TEXT) TO authenticated;
