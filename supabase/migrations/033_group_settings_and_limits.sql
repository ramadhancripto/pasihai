-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 033: ChatHai Groups — M1
-- Uundaji wa kikundi (settings) · roles/status za wanachama ·
-- kikomo cha wanachama kwa aina (tiered, config-driven) · bucket ya media.
--
-- LENGO (master spec §5–§8, §37, §54):
--   (1) `chat_group_settings` — chanzo KIMOJA cha taarifa za kikundi
--       (aina · faragha · madhumuni · sheria · kujiunga · lugha · mahali ·
--        slow mode · DP/cover) — si textbox moja kwenye UI wala mock.
--   (2) `chat_participants.role` + `.status` — Owner/Admin/Moderator/Member
--       na hali (active/pending/banned/left) kwa tekelezaji wa membership.
--   (3) Kikomo cha wanachama: jedwali la tier `chat_group_type_limits`
--       (kawaida = 1,024 kama ilivyoidhinishwa) + trigger wa BACKEND
--       unaozuia kuzidi kikomo (kuficha kitufe kwenye UI HAKUTOSHI).
--   (4) Storage bucket `group-media` (DP/cover) — private; wanachama
--       pekee wanaona, owner pekee anaweza kupakia (M1; M2 itaongeza
--       admin mwenye permission maalum).
--
-- KANUNI:
--   * Nyongeza pekee — hakuna table/column/policy ya awali inayofutwa.
--   * Policy za awali za chat (012/023/026/027/030/031) HAZIBADILISHWI.
--     Utekelezaji wa ruhusa za kila aina ya maudhui (announcement mode,
--     slow mode, per-content permissions) ni M2 — unahitaji idhini ya
--     Owner (rejea audit §6, uamuzi #1). Hajatekelezwa hapa.
--   * `chat_group_settings` Haina FORCE RLS — trigger (SECURITY DEFINER)
--     anasoma jedwali hili; ni pattern ileile ya 023/032 (FORCE inavunja
--     definer). `chat_group_type_limits` vivyo hivyo (config ya kusoma).
--   * `role`/`status` zina chaguo-msingi salama: 'member'/'active' —
--     data ya zamani haibadiliki isipokuwa backfill ya owner iliyoelezwa.
--
-- DEPENDENCY: 001 (profiles, set_updated_at), 012 (chat tables),
--             030/031 (is_chat_member SECURITY DEFINER).
-- ROLLBACK (mpango ulioidhinishwa pekee) — mwisho wa faili hii.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Tier ya kikomo kwa aina ya kikundi (config ya DB) ─────
-- Namba hizi LAZIMA zilingane na `src/config/groupLimits.js`
-- (test ya groups-test.mjs inathibitisha kwa SQL).
CREATE TABLE IF NOT EXISTS public.chat_group_type_limits (
  type        text PRIMARY KEY CHECK (type IN ('normal', 'announcement', 'managed')),
  max_members integer NOT NULL CHECK (max_members >= 1 AND max_members <= 100000),
  tier_note   text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.chat_group_type_limits (type, max_members, tier_note) VALUES
  ('normal',       1024, 'Kikundi cha kawaida — kikomo kilichoidhinishwa (1,024).'),
  ('announcement', 1024, 'Matangazo — tier ya sasa 1,024; mabadiliko yanahitaji uamuzi wa Owner.'),
  ('managed',      1024, 'Kinachosimamiwa — tier ya sasa 1,024; mabadiliko yanahitaji uamuzi wa Owner.')
ON CONFLICT (type) DO NOTHING;

ALTER TABLE public.chat_group_type_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_type_limits_select ON public.chat_group_type_limits;
CREATE POLICY group_type_limits_select ON public.chat_group_type_limits
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.chat_group_type_limits IS
  'ChatHai Groups: kikomo cha wanachama kwa aina (tiered). Chanzo cha backend; JS config inalingana nayo.';

-- ── 2. chat_participants: role + status ──────────────────────
-- (Nyongeza pekee; chaguo-msingi = member/active kwa safu zote zilizopo.)
ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
  CHECK (role IN ('owner', 'admin', 'moderator', 'member'));

ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'pending', 'banned', 'left'));

-- Backfill: muundaji wa kikundi cha zamani anakuwa owner.
-- FORCE RLS inazuiwa kwa muda ndani ya transaction hii pekee ili UPDATE
-- ya backfill ifanye kazi hata kwenye hosted Postgres (haiathiri RLS ya kudumu).
ALTER TABLE public.chat_participants NO FORCE ROW LEVEL SECURITY;
UPDATE public.chat_participants cp
SET role = 'owner'
FROM public.chat_conversations c
WHERE c.id = cp.conversation_id
  AND c.type = 'group'
  AND c.created_by IS NOT NULL
  AND cp.user_id = c.created_by
  AND cp.role IS DISTINCT FROM 'owner';
ALTER TABLE public.chat_participants FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chat_participants_role
  ON public.chat_participants (conversation_id, role);

COMMENT ON COLUMN public.chat_participants.role IS
  'ChatHai Groups: owner/admin/moderator/member. Owner = mamlaka ya mwisho ya kikundi.';
COMMENT ON COLUMN public.chat_participants.status IS
  'ChatHai Groups: active/pending/banned/left. Ban hairuhusu kujiunga tena hadi iondolewe.';

-- ── 3. Helpers za role (SECURITY DEFINER — zinasoma FORCE RLS table) ──
CREATE OR REPLACE FUNCTION public.is_chat_group_owner(
  p_conversation_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = p_user_id
      AND cp.role = 'owner'
      AND cp.status = 'active'
  );
$$;

-- UUID salama kwa path za storage (foldername inaweza kuwa si uuid —
-- casting ya kawaida ingeleta ERROR badala ya false).
CREATE OR REPLACE FUNCTION public.chat_safe_uuid(p_text text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  RETURN p_text::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END $$;

-- ── 4. chat_group_settings ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_group_settings (
  conversation_id      uuid PRIMARY KEY REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  group_type           text NOT NULL DEFAULT 'normal'
                       CHECK (group_type IN ('normal', 'announcement', 'managed')),
  privacy              text NOT NULL DEFAULT 'private'
                       CHECK (privacy IN ('public', 'private')),
  description          text CHECK (description IS NULL OR char_length(description) <= 300),
  purpose              text CHECK (purpose IS NULL OR char_length(purpose) <= 2000),
  goals                text CHECK (goals IS NULL OR char_length(goals) <= 2000),
  procedures           text CHECK (procedures IS NULL OR char_length(procedures) <= 2000),
  rules                text CHECK (rules IS NULL OR char_length(rules) <= 4000),
  warnings             text CHECK (warnings IS NULL OR char_length(warnings) <= 2000),
  consequences         text CHECK (consequences IS NULL OR char_length(consequences) <= 2000),
  language             text,
  founding_location    text,
  location_visibility  text NOT NULL DEFAULT 'hidden'
                       CHECK (location_visibility IN ('hidden', 'country', 'region', 'district', 'city')),
  join_method          text NOT NULL DEFAULT 'request'
                       CHECK (join_method IN ('direct', 'invite', 'invite_link', 'request')),
  who_can_add          text NOT NULL DEFAULT 'owner_admins'
                       CHECK (who_can_add IN ('owner', 'owner_admins', 'members')),
  who_can_reply        text NOT NULL DEFAULT 'all'
                       CHECK (who_can_reply IN ('all', 'admins')),
  who_can_react        text NOT NULL DEFAULT 'all'
                       CHECK (who_can_react IN ('all', 'admins')),
  announcement_senders text NOT NULL DEFAULT 'owner_admins'
                       CHECK (announcement_senders IN ('owner', 'owner_admins')),
  slow_mode_seconds    integer NOT NULL DEFAULT 0
                       CHECK (slow_mode_seconds >= 0 AND slow_mode_seconds <= 3600),
  member_limit         integer NOT NULL DEFAULT 1024
                       CHECK (member_limit >= 1 AND member_limit <= 100000),
  tone                 text NOT NULL DEFAULT 'green',
  dp_path              text,
  cover_path           text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS chat_group_settings_updated ON public.chat_group_settings;
CREATE TRIGGER chat_group_settings_updated
  BEFORE UPDATE ON public.chat_group_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.chat_group_settings ENABLE ROW LEVEL SECURITY;
-- Sifa: HAKUNA FORCE — trigger wa kikomo (SECURITY DEFINER) anasoma jedwali hili.

DROP POLICY IF EXISTS group_settings_select ON public.chat_group_settings;
CREATE POLICY group_settings_select ON public.chat_group_settings
  FOR SELECT TO authenticated
  USING (
    public.is_chat_member(conversation_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS group_settings_insert ON public.chat_group_settings;
CREATE POLICY group_settings_insert ON public.chat_group_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS group_settings_update ON public.chat_group_settings;
CREATE POLICY group_settings_update ON public.chat_group_settings
  FOR UPDATE TO authenticated
  USING (public.is_chat_group_owner(conversation_id, auth.uid()))
  WITH CHECK (public.is_chat_group_owner(conversation_id, auth.uid()));

COMMENT ON TABLE public.chat_group_settings IS
  'ChatHai Groups: chanzo kimoja cha taarifa za kikundi (aina, faragha, sheria, kujiunga, DP/cover).';

-- ── 5. Kikomo cha wanachama — tekelezaji wa BACKEND ──────────
CREATE OR REPLACE FUNCTION public.enforce_chat_group_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_conv_type      text;
  v_setting_limit  integer;
  v_type_limit     integer;
  v_limit          integer;
  v_count          integer;
BEGIN
  -- Wanahesabika tu walio 'active'. pending/banned/left hawahesabiki.
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW; -- tayari alikuwa active; hakuna hesabu upya
  END IF;

  SELECT c.type INTO v_conv_type
  FROM public.chat_conversations c
  WHERE c.id = NEW.conversation_id;

  IF v_conv_type IS DISTINCT FROM 'group' THEN
    RETURN NEW; -- Direct conversations hazina kikomo cha kikundi
  END IF;

  SELECT s.member_limit, tl.max_members
    INTO v_setting_limit, v_type_limit
  FROM public.chat_group_settings s
  LEFT JOIN public.chat_group_type_limits tl ON tl.type = s.group_type
  WHERE s.conversation_id = NEW.conversation_id;

  v_limit := LEAST(COALESCE(v_setting_limit, 1024), COALESCE(v_type_limit, 1024));

  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO v_count
    FROM public.chat_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.status = 'active';
  ELSE
    SELECT count(*) INTO v_count
    FROM public.chat_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.status = 'active'
      AND cp.user_id <> NEW.user_id;
  END IF;

  IF v_count + 1 > v_limit THEN
    RAISE EXCEPTION 'chat_group_member_limit: kikundi kimefika kikomo cha wanachama %', v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_chat_group_member_limit ON public.chat_participants;
CREATE TRIGGER trg_chat_group_member_limit
  BEFORE INSERT OR UPDATE OF status ON public.chat_participants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_group_member_limit();

COMMENT ON FUNCTION public.enforce_chat_group_member_limit() IS
  'ChatHai Groups: huzuia kuzidi member_limit (min wa settings na tier ya aina). Backend enforcement.';

-- ── 6. Storage: bucket ya media ya kikundi (DP/cover) ────────
-- Private bucket: wanachama pekee wanaona; owner pekee anapakia (M1).
-- Path: {conversation_id}/dp-<timestamp>.<ext>
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-media',
  'group-media',
  false,
  5242880, -- 5MB kwa DP/cover
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS group_media_select ON storage.objects;
CREATE POLICY group_media_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'group-media'
    AND public.is_chat_member(
      public.chat_safe_uuid((storage.foldername(name))[1]),
      auth.uid()
    )
  );

DROP POLICY IF EXISTS group_media_insert ON storage.objects;
CREATE POLICY group_media_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'group-media'
    AND public.is_chat_group_owner(
      public.chat_safe_uuid((storage.foldername(name))[1]),
      auth.uid()
    )
  );

DROP POLICY IF EXISTS group_media_update ON storage.objects;
CREATE POLICY group_media_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'group-media'
    AND public.is_chat_group_owner(
      public.chat_safe_uuid((storage.foldername(name))[1]),
      auth.uid()
    )
  );

DROP POLICY IF EXISTS group_media_delete ON storage.objects;
CREATE POLICY group_media_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'group-media'
    AND public.is_chat_group_owner(
      public.chat_safe_uuid((storage.foldername(name))[1]),
      auth.uid()
    )
  );

-- ── ROLLBACK (mpango ulioidhinishwa pekee — si sehemu ya migration) ──
-- DROP TRIGGER IF EXISTS trg_chat_group_member_limit ON public.chat_participants;
-- DROP FUNCTION IF EXISTS public.enforce_chat_group_member_limit();
-- DROP FUNCTION IF EXISTS public.is_chat_group_owner(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.chat_safe_uuid(text);
-- DROP POLICY IF EXISTS group_media_select ON storage.objects;
-- DROP POLICY IF EXISTS group_media_insert ON storage.objects;
-- DROP POLICY IF EXISTS group_media_update ON storage.objects;
-- DROP POLICY IF EXISTS group_media_delete ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'group-media';
-- DROP TABLE IF EXISTS public.chat_group_settings CASCADE;
-- DROP TABLE IF EXISTS public.chat_group_type_limits CASCADE;
-- ALTER TABLE public.chat_participants DROP COLUMN IF EXISTS role;
-- ALTER TABLE public.chat_participants DROP COLUMN IF EXISTS status;
-- DROP INDEX IF EXISTS public.idx_chat_participants_role;
-- ══════════════════════════════════════════════════════════════
