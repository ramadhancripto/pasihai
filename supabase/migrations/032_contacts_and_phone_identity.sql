-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 032: contacts & phone identity (ChatHai)
--
-- LENGO:
--   (1) Hifadhi contacts za mtumiaji (saved contacts) kwa faragha kamili.
--   (2) Namba ya simu iwe siri inayotokana na uthibitisho wa Supabase Auth —
--       SI column kwenye `profiles`, na SI primary key ya akaunti.
--   (3) Utafutaji wa namba (phone lookup) uwe wa server-side, unaolinda faragha,
--       unaoruhusu kikomo cha majaribio (rate limit), na usiofichua akaunti.
--
-- KANUNI ZILIZOFUATWA:
--   * Nyongeza pekee — hakuna table/column/policy ya awali inayofutwa au kubadilishwa.
--   * Namba haziingii `profiles` (profiles SELECT ni wazi kwa watumiaji wote walioingia).
--   * Matching inatumia HMAC-SHA256 yenye ufunguo wa SERVER (private.app_secrets),
--     si hash ya kawaida ya SHA (inashindwa dhidi ya guessing).
--   * RLS: kaynak-owner only; API roles haziwezi kuandika profile_phones kwa moja kwa moja.
--   * `user_contacts` ina FORCE RLS (kali zaidi). Tables zinazosomwa/kuandikwa na
--     SECURITY DEFINER helpers hazina FORCE — hii ndiyo pattern iliyoandikwa kwenye
--     migration 023 (`chat_participants NO FORCE`) kwa sababu hiyo hiyo: role ya
--     migration (owner wa jedwali) inabypass RLS; anon/authenticated HAWABYPASS.
--   * Hakuna OTP, token au secret ya Auth inayohifadhiwa kwenye contacts.
--
-- DEPENDENCY: profiles (001), friendships (007), blocks (008), auth.users.
-- ROLLBACK (kwa mpango ulioidhinishwa tu):
--   DROP TABLE IF EXISTS public.user_contacts CASCADE;
--   DROP TABLE IF EXISTS public.phone_lookup_attempts CASCADE;
--   DROP TABLE IF EXISTS public.profile_phones CASCADE;
--   DROP FUNCTION IF EXISTS public.lookup_contact_phone(text);
--   DROP FUNCTION IF EXISTS public.set_my_phone(text);
--   DROP FUNCTION IF EXISTS public.clear_my_phone();
--   DROP FUNCTION IF EXISTS public.contact_friend_state(uuid);
--   DROP FUNCTION IF EXISTS public.contact_message_gate(uuid);
--   DROP FUNCTION IF EXISTS public.phone_hmac(text);
--   DROP SCHEMA IF EXISTS private CASCADE;   -- ⚠️ huondoa funguo za HMAC
-- ══════════════════════════════════════════════════════════════

-- ── 1. pgcrypto (hmac) ────────────────────────────────────────
-- Supabase ina pgcrypto kwenye schema `extensions`; local Postgres inaweka
-- kwenye `public`. Tunaitafta mahali ilipo na kui-qualify kwa uthabiti.
DO $$
DECLARE v_ns text;
BEGIN
  SELECT n.nspname INTO v_ns
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'hmac' AND p.pronargs = 3
  LIMIT 1;

  IF v_ns IS NULL THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pgcrypto';
    SELECT n.nspname INTO v_ns
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'hmac' AND p.pronargs = 3
    LIMIT 1;
  END IF;

  IF v_ns IS NULL THEN
    RAISE EXCEPTION '032: pgcrypto/hmac haipatikani kwenye server hii';
  END IF;

  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION public._hmac_sha256(p_data text, p_key text)
    RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path = ''
    AS $b$ SELECT encode(%I.hmac(p_data, p_key, 'sha256'), 'hex') $b$;
  $f$, v_ns);

  EXECUTE 'REVOKE ALL ON FUNCTION public._hmac_sha256(text, text) FROM PUBLIC, anon, authenticated';
END $$;

-- ── 2. Schema `private` + ufunguo wa HMAC ─────────────────────
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
DO $$ BEGIN
  BEGIN EXECUTE 'REVOKE ALL ON SCHEMA private FROM anon'; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN EXECUTE 'REVOKE ALL ON SCHEMA private FROM authenticated'; EXCEPTION WHEN undefined_object THEN NULL; END;
END $$;

CREATE TABLE IF NOT EXISTS private.app_secrets (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.app_secrets ENABLE ROW LEVEL SECURITY;
-- Hakuna policy kabisa: API roles haziwezi kusoma wala kuandika.
DO $$ BEGIN
  BEGIN EXECUTE 'REVOKE ALL ON TABLE private.app_secrets FROM anon'; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN EXECUTE 'REVOKE ALL ON TABLE private.app_secrets FROM authenticated'; EXCEPTION WHEN undefined_object THEN NULL; END;
END $$;

-- Ufunguo wa HMAC: 256-bit, hutengenezwa mara moja, hauwekwi kwenye git/UI.
INSERT INTO private.app_secrets (key, value)
SELECT 'phone_hmac_key',
       replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE NOT EXISTS (SELECT 1 FROM private.app_secrets WHERE key = 'phone_hmac_key');

-- ── 3. Kanuni ya E.164 (canonical) ────────────────────────────
-- Ubadilishaji kamili wa nchi (country code, trunk prefix, urefu) hufanyika
-- kwenye parser ya client; hapa tunahakikisha muundo wa kimataifa tu na
-- kukataa vipengele visivyo halali. Uthibitisho wa kweli ni auth.users.phone.
CREATE OR REPLACE FUNCTION private.normalize_e164(p_phone text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_phone IS NULL OR btrim(p_phone) = '' THEN NULL
    WHEN regexp_replace(p_phone, '[^0-9+]', '', 'g') !~ '^\+[1-9][0-9]{6,14}$' THEN NULL
    ELSE regexp_replace(p_phone, '[^0-9+]', '', 'g')
  END
$$;
REVOKE ALL ON FUNCTION private.normalize_e164(text) FROM PUBLIC, anon, authenticated;

-- ── 4. phone_hmac: hash inayolinda faragha ────────────────────
CREATE OR REPLACE FUNCTION public.phone_hmac(p_phone text)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_digits text;
  v_key    text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;

  v_digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  IF v_digits = '' THEN RETURN NULL; END IF;

  SELECT value INTO v_key FROM private.app_secrets WHERE key = 'phone_hmac_key';
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'phone_hmac_key_missing' USING ERRCODE = 'P0001';
  END IF;

  RETURN public._hmac_sha256(v_digits, v_key);
END $$;

REVOKE ALL ON FUNCTION public.phone_hmac(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phone_hmac(text) TO authenticated;

-- ── 5. profile_phones (siri ya mmiliki; chanzo = Auth) ────────
CREATE TABLE IF NOT EXISTS public.profile_phones (
  user_id           uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  phone_e164        text NOT NULL
                      CHECK (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  phone_lookup_hash text NOT NULL,
  verified_at       timestamptz,
  discoverable      boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  changed_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_phones_hash_key UNIQUE (phone_lookup_hash)
);

CREATE INDEX IF NOT EXISTS idx_profile_phones_hash
  ON public.profile_phones (phone_lookup_hash);

ALTER TABLE public.profile_phones ENABLE ROW LEVEL SECURITY;
-- BILA FORCE: SECURITY DEFINER (lookup/set) inasoma/inaandika kama owner;
-- anon/authenticated wanakabiliwa na RLS kikamilifu (pattern ya 023).
ALTER TABLE public.profile_phones NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_phones_select_own" ON public.profile_phones;
CREATE POLICY "profile_phones_select_own"
  ON public.profile_phones FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Hakuna INSERT/UPDATE/DELETE policy: kuandika ni kwa RPC pekee
-- (`set_my_phone` inahitaji uthibitisho wa Auth). Hii inazuia
-- mtumiaji kubadilisha `verified_at`/namba kwa ku-edit profile.

DO $$ BEGIN
  BEGIN EXECUTE 'REVOKE ALL ON TABLE public.profile_phones FROM anon'; EXCEPTION WHEN undefined_object THEN NULL; END;
END $$;

-- ── 6. user_contacts (contacts zilizohifadhiwa) ───────────────
CREATE TABLE IF NOT EXISTS public.user_contacts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id       uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  contact_user_id     uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  phone_e164          text CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  phone_lookup_hash   text,
  display_name        text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60),
  avatar_snapshot_url text,
  notes               text CHECK (notes IS NULL OR char_length(notes) <= 500),
  source              text NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual','device_import','discovered')),
  is_favorite         boolean NOT NULL DEFAULT false,
  idempotency_key     uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- Kuzuia kujihifadhi mwenyewe kama contact.
  CONSTRAINT user_contacts_not_self CHECK (owner_user_id <> contact_user_id),
  -- Contact lazima iwe na akaunti AU namba (mojawapo).
  CONSTRAINT user_contacts_target_present
    CHECK (contact_user_id IS NOT NULL OR phone_e164 IS NOT NULL)
);

-- Kuzuia duplicates: (a) kwa akaunti, (b) kwa namba ambazo hazijaunganishwa na akaunti.
-- Muundo huu unaruhusu contact ya namba isiyo na akaunti BILA kuunda duplicate ya akaunti.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_contacts_account
  ON public.user_contacts (owner_user_id, contact_user_id)
  WHERE contact_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_contacts_phone
  ON public.user_contacts (owner_user_id, phone_lookup_hash)
  WHERE contact_user_id IS NULL AND phone_lookup_hash IS NOT NULL;

-- Import inayorudiwa salama (mtindo wa migration 016).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_contacts_idempotency
  ON public.user_contacts (owner_user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_contacts_owner_created
  ON public.user_contacts (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_contacts_owner_account
  ON public.user_contacts (owner_user_id, contact_user_id);

CREATE INDEX IF NOT EXISTS idx_user_contacts_owner_fav
  ON public.user_contacts (owner_user_id, is_favorite)
  WHERE is_favorite;

-- updated_at: tunatumia trigger iliyopo (001).
DROP TRIGGER IF EXISTS trg_user_contacts_updated_at ON public.user_contacts;
CREATE TRIGGER trg_user_contacts_updated_at
  BEFORE UPDATE ON public.user_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: kali (FORCE) — hakuna SECURITY DEFINER inayoandika jedwali hili.
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_contacts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_contacts_select_own" ON public.user_contacts;
CREATE POLICY "user_contacts_select_own"
  ON public.user_contacts FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "user_contacts_insert_own" ON public.user_contacts;
CREATE POLICY "user_contacts_insert_own"
  ON public.user_contacts FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND auth.uid() IS NOT NULL
    AND contact_user_id IS DISTINCT FROM auth.uid()
  );

DROP POLICY IF EXISTS "user_contacts_update_own" ON public.user_contacts;
CREATE POLICY "user_contacts_update_own"
  ON public.user_contacts FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()          -- umiliki haubadiliki
    AND contact_user_id IS DISTINCT FROM auth.uid()
  );

DROP POLICY IF EXISTS "user_contacts_delete_own" ON public.user_contacts;
CREATE POLICY "user_contacts_delete_own"
  ON public.user_contacts FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

-- API roles: anon HAIPATI contacts hata kidogo. Authenticated: RLS inachuja.
DO $$ BEGIN
  BEGIN EXECUTE 'REVOKE ALL ON TABLE public.user_contacts FROM anon'; EXCEPTION WHEN undefined_object THEN NULL; END;
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_contacts TO authenticated';
END $$;

-- ── 7. phone_lookup_attempts (rate limit ya utafutaji) ────────
CREATE TABLE IF NOT EXISTS public.phone_lookup_attempts (
  user_id      uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  bucket_start timestamptz NOT NULL,
  attempts     int NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  PRIMARY KEY (user_id, bucket_start)
);

ALTER TABLE public.phone_lookup_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_lookup_attempts NO FORCE ROW LEVEL SECURITY;
-- Hakuna policy: RPC pekee inaandika/inasoma (deny-all kwa API roles).

DO $$ BEGIN
  BEGIN EXECUTE 'REVOKE ALL ON TABLE public.phone_lookup_attempts FROM anon'; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN EXECUTE 'REVOKE ALL ON TABLE public.phone_lookup_attempts FROM authenticated'; EXCEPTION WHEN undefined_object THEN NULL; END;
END $$;

-- ── 8. Mtazamo wa uhusiano (RLS ya mtumiaji — INVOKER) ────────
-- Hali ya urafiki/block kati yangu na mtu mwingine. SECURITY INVOKER:
-- inasoma kwa ruhusa ZANGU (friendships_select_own / blocks_select_own),
-- kwa hiyo hairuhusu kuona mahusiano ya watu wengine.
CREATE OR REPLACE FUNCTION public.contact_friend_state(p_other uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;
  IF p_other IS NULL THEN RETURN 'unknown'; END IF;
  IF p_other = v_me THEN RETURN 'self'; END IF;

  IF EXISTS (SELECT 1 FROM public.blocks b
              WHERE b.blocker_id = v_me AND b.blocked_id = p_other) THEN
    RETURN 'blocked';
  END IF;

  IF EXISTS (SELECT 1 FROM public.friendships f
              WHERE f.status = 'accepted'
                AND ((f.requester_id = v_me AND f.addressee_id = p_other)
                  OR (f.requester_id = p_other AND f.addressee_id = v_me))) THEN
    RETURN 'friend';
  END IF;

  IF EXISTS (SELECT 1 FROM public.friendships f
              WHERE f.status = 'pending'
                AND f.requester_id = v_me AND f.addressee_id = p_other) THEN
    RETURN 'sent';
  END IF;

  IF EXISTS (SELECT 1 FROM public.friendships f
              WHERE f.status = 'pending'
                AND f.addressee_id = v_me AND f.requester_id = p_other) THEN
    RETURN 'received';
  END IF;

  RETURN 'not_friend';
END $$;

REVOKE ALL ON FUNCTION public.contact_friend_state(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contact_friend_state(uuid) TO authenticated;

-- Lango la mawasiliano: je, ninaweza kuanzisha/kuendelea mazungumzo?
-- Hali inayojulikana: self · nimezuia · (blocked-me haionyeshwi — faragha).
CREATE OR REPLACE FUNCTION public.contact_message_gate(p_other uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_state text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;
  IF p_other IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_target');
  END IF;
  IF p_other = v_me THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'self');
  END IF;

  v_state := public.contact_friend_state(p_other);
  IF v_state = 'blocked' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'blocked_by_me');
  END IF;

  -- Friend STATE haizuii mazungumzo (friendship ≠ chat permission, na
  -- ChatHai inaruhusu maombi ya mazungumzo). Hii inarudisha tu uhalali wa msingi;
  -- uanachama na block-upande-wa-pili zinathibitishwa kwenye chat RLS wakati wa kutuma.
  RETURN jsonb_build_object('allowed', true, 'reason', 'ok', 'friend_state', v_state);
END $$;

REVOKE ALL ON FUNCTION public.contact_message_gate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contact_message_gate(uuid) TO authenticated;

-- ── 9. lookup_contact_phone (utafutaji salama wa namba) ───────
-- Inarudisha { account_id } PEKEE (au NULL). Taarifa za wasifu (jina, username,
-- alama ya verified) zinasomwa na client kupitia `profiles` (policy iliyopo ya
-- SELECT kwa watumiaji walioingia) — function hii haipanui ufikiaji wa wasifu.
-- Namba ya mtu mwingine HAIRUDISHWI KAMWE.
CREATE OR REPLACE FUNCTION public.lookup_contact_phone(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me      uuid := auth.uid();
  v_e164    text;
  v_hash    text;
  v_attempt int;
  v_match   uuid;
  v_limit   constant int := 20;   -- kila kikomo: 20/h kwa kila mtumiaji
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;

  v_e164 := private.normalize_e164(p_phone);
  IF v_e164 IS NULL THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = '22023';
  END IF;

  -- Kikomo cha majaribio (enumeration guard): 20 kwa saa kwa mtumiaji.
  INSERT INTO public.phone_lookup_attempts (user_id, bucket_start, attempts)
  VALUES (v_me, date_trunc('hour', now()), 1)
  ON CONFLICT (user_id, bucket_start)
  DO UPDATE SET attempts = public.phone_lookup_attempts.attempts + 1
  RETURNING attempts INTO v_attempt;

  IF v_attempt > v_limit THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  SELECT value INTO v_hash FROM private.app_secrets WHERE key = 'phone_hmac_key';
  IF v_hash IS NULL THEN
    RAISE EXCEPTION 'phone_hmac_key_missing' USING ERRCODE = 'P0001';
  END IF;

  SELECT pp.user_id INTO v_match
  FROM public.profile_phones pp
  JOIN public.profiles p ON p.user_id = pp.user_id
  WHERE pp.phone_lookup_hash = public._hmac_sha256(regexp_replace(v_e164, '[^0-9]', '', 'g'), v_hash)
    AND pp.discoverable = true
    AND p.deleted_at IS NULL
    AND pp.user_id <> v_me
  LIMIT 1;

  IF v_match IS NULL THEN
    RETURN NULL;   -- hakuna akaunti: mwalike (hakuna kufichua chochote)
  END IF;

  RETURN jsonb_build_object('account_id', v_match);
END $$;

REVOKE ALL ON FUNCTION public.lookup_contact_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_contact_phone(text) TO authenticated;

-- ── 9b. lookup_contact_phones (import ya contacts kwa kundi) ──
-- Import ya orodha yote kwa wito mmoja: hurudisha kwa kila ingizo
--   { i (index), hash (HMAC ya namba), account_id (au null) }
-- Hii inaepusha wito 200 wa `lookup_contact_phone` (rate limit 20/h) — kundi
-- MOJA linatumia kikomo kimoja (≤5 makundi/saa, ≤200 namba kwa kundi).
-- Hurudisha hash ya namba ULIZOTOa mwenyewe (si ya mtu mwingine).
CREATE OR REPLACE FUNCTION public.lookup_contact_phones(p_phones text[])
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me      uuid := auth.uid();
  v_key     text;
  v_attempt int;
  v_out     jsonb := '[]'::jsonb;
  v_i       int;
  v_digits  text;
  v_hash    text;
  v_match   uuid;
  v_n       int := coalesce(array_length(p_phones, 1), 0);
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;
  IF v_n = 0 THEN RETURN '[]'::jsonb; END IF;
  IF v_n > 200 THEN
    RAISE EXCEPTION 'too_many_numbers' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.phone_lookup_attempts (user_id, bucket_start, attempts)
  VALUES (v_me, date_trunc('hour', now()), 1)
  ON CONFLICT (user_id, bucket_start)
  DO UPDATE SET attempts = public.phone_lookup_attempts.attempts + 1
  RETURNING attempts INTO v_attempt;

  IF v_attempt > 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  SELECT value INTO v_key FROM private.app_secrets WHERE key = 'phone_hmac_key';
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'phone_hmac_key_missing' USING ERRCODE = 'P0001';
  END IF;

  FOR v_i IN 1..v_n LOOP
    v_digits := regexp_replace(coalesce(p_phones[v_i], ''), '[^0-9]', '', 'g');
    IF v_digits = '' THEN
      v_out := v_out || jsonb_build_array(jsonb_build_object('i', v_i - 1, 'hash', NULL, 'account_id', NULL));
      CONTINUE;
    END IF;

    v_hash := public._hmac_sha256(v_digits, v_key);
    v_match := NULL;

    SELECT pp.user_id INTO v_match
    FROM public.profile_phones pp
    JOIN public.profiles p ON p.user_id = pp.user_id
    WHERE pp.phone_lookup_hash = v_hash
      AND pp.discoverable = true
      AND p.deleted_at IS NULL
      AND pp.user_id <> v_me
    LIMIT 1;

    v_out := v_out || jsonb_build_array(
      jsonb_build_object('i', v_i - 1, 'hash', v_hash, 'account_id', v_match));
  END LOOP;

  RETURN v_out;
END $$;

REVOKE ALL ON FUNCTION public.lookup_contact_phones(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_contact_phones(text[]) TO authenticated;

-- ── 10. set_my_phone / clear_my_phone (mzunguko wa namba) ─────
-- Namba YA MTUMIAJI MWENYEWE huwekwa hapa — na HAIWEZI kuwekwa bila
-- uthibitisho wa Supabase Auth (auth.users.phone + phone_confirmed_at).
-- Hii inatimiza: "usiruhusu mtumiaji kubadilisha phone_verified kwa ku-edit profile".
CREATE OR REPLACE FUNCTION public.set_my_phone(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me        uuid := auth.uid();
  v_e164      text;
  v_auth_ok   boolean := false;
  v_occupied  uuid;
  v_existing  text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;

  v_e164 := private.normalize_e164(p_phone);
  IF v_e164 IS NULL THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = '22023';
  END IF;

  -- Chanzo rasmi cha uthibitisho: auth.users (phone_confirmed_at).
  BEGIN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM auth.users u
              WHERE u.id = $1 AND u.phone_confirmed_at IS NOT NULL
                AND regexp_replace(coalesce(u.phone, ''''), ''[^0-9]'', '''', ''g'')
                    = regexp_replace($2, ''[^0-9]'', '''', ''g''))'
      INTO v_auth_ok USING v_me, v_e164;
  EXCEPTION WHEN undefined_table OR insufficient_privilege OR undefined_column THEN
    RAISE EXCEPTION 'phone_verification_source_unavailable' USING ERRCODE = 'P0001';
  END;

  IF NOT v_auth_ok THEN
    RAISE EXCEPTION 'phone_not_verified' USING ERRCODE = '28000';
  END IF;

  -- Namba ilikuwa ikihifadhiwa na akaunti nyingine?
  -- Auth ndio chanzo rasmi: uthibitisho mpya (OTP) unathibitisha umiliki wa SASA.
  -- Kwa hiyo tunatoa/kufuta safu ya zamani (mf. namba iliyorejeshwa kwa carrier) —
  -- HATUFUTI akaunti yoyote, HATUBADILISHI umiliki wa contacts yoyote.
  SELECT user_id INTO v_occupied
  FROM public.profile_phones
  WHERE phone_lookup_hash = public.phone_hmac(v_e164)
    AND user_id <> v_me
  LIMIT 1;

  IF v_occupied IS NOT NULL THEN
    DELETE FROM public.profile_phones WHERE user_id = v_occupied;
    RAISE NOTICE '032: namba iliachiwa na akaunti ya awali (%); safu ilifutwa, akaunti haikuguswa.', v_occupied;
  END IF;

  SELECT phone_e164 INTO v_existing FROM public.profile_phones WHERE user_id = v_me;

  INSERT INTO public.profile_phones (user_id, phone_e164, phone_lookup_hash, verified_at, changed_at)
  VALUES (v_me, v_e164, public.phone_hmac(v_e164), now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET phone_e164        = EXCLUDED.phone_e164,
        phone_lookup_hash = EXCLUDED.phone_lookup_hash,
        verified_at       = now(),
        changed_at        = now();

  RETURN jsonb_build_object(
    'phone_e164',     v_e164,
    'previous_e164',  v_existing,
    'changed',        v_existing IS DISTINCT FROM v_e164,
    'changed_at',     now()
  );
END $$;

REVOKE ALL ON FUNCTION public.set_my_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_phone(text) TO authenticated;

-- Kuondoa namba yangu (mf. namba imeachwa/kurejeshwa kwa carrier).
-- Hafuti akaunti, hufuti mahusiano, hufuti contacts za watu wengine.
CREATE OR REPLACE FUNCTION public.clear_my_phone()
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;
  DELETE FROM public.profile_phones WHERE user_id = v_me;
  RETURN jsonb_build_object('cleared', true);
END $$;

REVOKE ALL ON FUNCTION public.clear_my_phone() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_my_phone() TO authenticated;

-- ── 11. Maelezo ya columns (kwa wakaguzi wa baadaye) ──────────
COMMENT ON TABLE public.user_contacts IS
  'Contacts zilizohifadhiwa na mmiliki. Save Contact ≠ friendship ≠ chat. RLS: mmiliki pekee (FORCE).';
COMMENT ON COLUMN public.user_contacts.phone_lookup_hash IS
  'HMAC-SHA256 (server key) ya namba — hutumika kwa dedupe na ulinganishaji bila kufichua namba.';
COMMENT ON TABLE public.profile_phones IS
  'Namba ya simu ya akaunti, iliyothibitishwa kupitia Supabase Auth. Siri: mmiliki pekee anaweza kuisoma; kuandika ni kwa RPC pekee.';
COMMENT ON TABLE public.phone_lookup_attempts IS
  'Kikomo cha majaribio ya utafutaji wa namba (20/saa kwa mtumiaji) — kinga dhidi ya enumeration.';
COMMENT ON FUNCTION public.lookup_contact_phone(text) IS
  'Utafutaji wa namba: exact-match kwa HMAC, husimamia `discoverable`, husimamia rate limit, hurudisha account_id PEKEE (au NULL).';
COMMENT ON FUNCTION public.set_my_phone(text) IS
  'Huweka/kubadilisha namba ya MTUMIAJI MWENYEWE baada ya uthibitisho wa Auth (auth.users.phone_confirmed_at).';
