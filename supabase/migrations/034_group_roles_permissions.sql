-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 034: ChatHai Groups M2 — roles & ruhusa zinazotekelezwa
--
-- TATIZO (lilithibitishwa kwenye docs/verification/groups/m2-security-audit.md):
--   F1 033 ilirudisha FORCE RLS kwenye chat_participants (023 ilikuwa imeiondoa
--      kwa makusudi: helper za SECURITY DEFINER zinahitaji owner-bypass).
--   F2 triggers/helpers zinazosoma chat_conversations / chat_messages (FORCE)
--      zinafeli kimya (fail-open) kwenye hosted Postgres: kikomo cha wanachama
--      hakitekelezwi, slow mode isingetekelezwa.
--   F3 participants_update_own (auth.uid()=user_id pekee) → mwanachama anaweza
--      kujipa role='owner', kujiondoa ban, au kuhamisha row yake kwenye kikundi
--      kingine (kujiingiza bila ruhusa).
--   F4 conversations_update_participant (is_chat_member pekee) → mwanachama
--      yeyote anaweza kubadilisha jina/type na kuiba created_by.
--   F5 messages_insert_participant (membership pekee) → banned anaweza kutuma;
--      matangazo/who_can_reply/slow mode hazitekelezwi; media haitofautishwi.
--   F6 read policies hazichuji status → banned/left bado wanaona.
--   F7 hakuna njia ya moderation kwa Admin/Moderator (DB-side).
--   F9 kikomo cha wanachama hakina lock → race inaweza kuvuka kikomo.
--
-- SULUHISHO: roles (owner>admin>moderator>member) + rank guard triggers +
-- helper ya ruhusa moja (`chat_group_can`) + RPC salama + policies zinazotumia
-- helpers za DEFINER (pattern ya 023/031: search_path='' + grants kwa
-- authenticated pekee). NO FORCE kwenye jedwali tatu za chat: RLS inaendelea
-- kuwalinda anon/authenticated kikamilifu; bypass ni ya server-side owner pekee.
--
-- ATHARI: hakuna jedwali/data inayofutwa. Policies chache zinabadilishwa
-- (sababu + ushahidi: audit §4/§5). Rollback: tazama mwisho wa faili.
-- ══════════════════════════════════════════════════════════════

-- ── 0. FORCE fixes (F1 · F2) ─────────────────────────────────
ALTER TABLE public.chat_participants   NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations  NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages       NO FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE public.chat_participants IS
  'ChatHai Chat: washiriki. NO FORCE RLS kwa makusudi (023/M2): helper za SECURITY DEFINER zinasoma kwa owner-bypass; anon/authenticated zinabaki chini ya RLS.';

-- ── 1. per-member grants (per-Admin/–Moderator ruhusa) ───────
-- NULL = defaults za role; array ya action-keys = kikomo cha ziada (haiwezi
-- kuzidi maxcaps za role). Owner haiathiriwi (hazitumiki kwake).
ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS permissions jsonb;

COMMENT ON COLUMN public.chat_participants.permissions IS
  'ChatHai Groups: ruhusa za ziada za admin/moderator (array ya action keys). NULL = defaults za role. Haiwezi kuzidi role maxcaps.';

-- Index ya slow mode (F5) na utafutaji wa haraka wa ujumbe wa mwanachama.
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_sender_time
  ON public.chat_messages (conversation_id, sender_id, created_at DESC);

-- ── 2. Helpers (SECURITY DEFINER · search_path='' — pattern ya 023/031) ──

CREATE OR REPLACE FUNCTION public.chat_group_role_rank(p_role text)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path TO ''
AS $$
  SELECT CASE p_role
    WHEN 'owner' THEN 4 WHEN 'admin' THEN 3 WHEN 'moderator' THEN 2 WHEN 'member' THEN 1
    ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.chat_group_role(
  p_conversation_id uuid, p_user_id uuid DEFAULT auth.uid()
) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN NULL
    ELSE (
      SELECT cp.role
      FROM public.chat_participants cp
      WHERE cp.conversation_id = p_conversation_id
        AND cp.user_id = p_user_id
        AND cp.status = 'active'
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.chat_group_is_active(
  p_conversation_id uuid, p_user_id uuid DEFAULT auth.uid()
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = p_user_id
      AND cp.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.chat_group_is_banned(
  p_conversation_id uuid, p_user_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = p_user_id
      AND cp.status = 'banned'
  );
$$;

-- Maxcaps za role kwa kila action (owner = kila kitu; haiwezi kudowngrade'wa).
CREATE OR REPLACE FUNCTION public.chat_group_role_max(p_role text, p_action text)
RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path TO ''
AS $$
  SELECT CASE
    WHEN p_role = 'owner' THEN p_action <> ''
    WHEN p_role = 'admin' THEN p_action IN (
      'read_messages','send_message','send_media','react_to_message',
      'add_member','edit_info','edit_settings','manage_photo',
      'moderate_messages','restrict_members','manage_members','manage_roles')
    WHEN p_role = 'moderator' THEN p_action IN (
      'read_messages','send_message','send_media','react_to_message',
      'add_member','moderate_messages','restrict_members')
    WHEN p_role = 'member' THEN p_action IN (
      'read_messages','send_message','send_media','react_to_message','add_member')
    ELSE false
  END;
$$;

-- Uhalali wa `permissions` array kwa role husika (haizidi maxcaps; hakuna
-- transfer/delete; hakuna duplicates).
CREATE OR REPLACE FUNCTION public.chat_group_permissions_valid(
  p_role text, p_permissions jsonb
) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
SET search_path TO ''
AS $$
DECLARE
  v_elems text[];
BEGIN
  IF p_permissions IS NULL THEN RETURN true; END IF;
  IF jsonb_typeof(p_permissions) <> 'array' THEN RETURN false; END IF;
  SELECT array_agg(e.value) INTO v_elems FROM jsonb_array_elements_text(p_permissions) e;
  IF v_elems IS NULL THEN RETURN true; END IF;
  IF array_length(v_elems, 1) <> (SELECT count(DISTINCT x) FROM unnest(v_elems) x) THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM unnest(v_elems) x
    WHERE NOT public.chat_group_role_max(p_role, x)
       OR x IN ('transfer_ownership','delete_group')
  );
END;
$$;

-- Chanzo KIMOJA cha ruhusa (DB). JS ina mirror kwenye src/config/groupPermissions.js
-- (parity test inalinganisha matokeo — pattern ya groupLimits).
CREATE OR REPLACE FUNCTION public.chat_group_can(
  p_conversation_id uuid, p_user_id uuid, p_action text
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_kind text;
  v_group_type text;
  v_role text;
  v_status text;
  v_grants jsonb;
  v_who_add text;
  v_who_reply text;
  v_who_react text;
  v_ann text;
BEGIN
  /* Kuzuia kupeleleza: mtumiaji aliyeingia anaweza kuuliza kuhusu NAFSI yake
     pekee; RPC/triggers za ndani zinatumia auth.uid() (hali ileile). */
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  SELECT c.type INTO v_kind FROM public.chat_conversations c WHERE c.id = p_conversation_id;
  IF v_kind IS NULL THEN RETURN false; END IF;

  SELECT cp.role, cp.status, cp.permissions INTO v_role, v_status, v_grants
  FROM public.chat_participants cp
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = p_user_id;

  IF v_status IS DISTINCT FROM 'active' THEN RETURN false; END IF;

  IF v_kind = 'direct' THEN
    RETURN p_action IN ('read_messages', 'send_message', 'send_media', 'react_to_message');
  END IF;

  SELECT COALESCE(s.group_type, 'normal'),
         COALESCE(s.who_can_add, 'owner_admins'),
         COALESCE(s.who_can_reply, 'all'),
         COALESCE(s.who_can_react, 'all'),
         COALESCE(s.announcement_senders, 'owner_admins')
    INTO v_group_type, v_who_add, v_who_reply, v_who_react, v_ann
  FROM public.chat_group_settings s
  WHERE s.conversation_id = p_conversation_id;

  IF v_role = 'owner' THEN RETURN true; END IF;
  IF NOT public.chat_group_role_max(v_role, p_action) THEN RETURN false; END IF;

  -- Grants: management actions zinahitaji kuwa ndani ya `permissions` (kama ipo).
  IF v_grants IS NOT NULL AND p_action IN (
       'add_member','edit_info','edit_settings','manage_photo',
       'moderate_messages','restrict_members','manage_members','manage_roles') THEN
    IF NOT (v_grants ? p_action) THEN RETURN false; END IF;
  END IF;

  IF p_action IN ('send_message', 'send_media') THEN
    IF v_group_type = 'announcement' THEN
      RETURN CASE v_ann
        WHEN 'owner_admins' THEN v_role = 'admin'
        ELSE false -- 'owner': owner pekee (tayari amerudi true juu)
      END;
    END IF;
    IF v_who_reply = 'admins' THEN RETURN v_role = 'admin'; END IF;
    RETURN true;
  END IF;

  IF p_action = 'react_to_message' THEN
    IF v_who_react = 'admins' THEN RETURN v_role = 'admin'; END IF;
    RETURN true;
  END IF;

  IF p_action = 'add_member' THEN
    RETURN CASE v_who_add
      WHEN 'owner_admins' THEN v_role = 'admin'
      WHEN 'members' THEN true
      ELSE false -- 'owner': owner pekee
    END;
  END IF;

  RETURN true; -- management actions zilizoruhusiwa na maxcaps (+grants) hapo juu
END;
$$;

-- Slow mode (F5): leadership (owner/admin) hawazuiliwi; member/mod moderator
-- anasubiri hadi slow_mode_seconds ipite tokea ujumbe wake wa mwisho.
CREATE OR REPLACE FUNCTION public.chat_group_slow_mode_ok(
  p_conversation_id uuid, p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_type text;
  v_secs integer;
  v_role text;
  v_last timestamptz;
BEGIN
  SELECT c.type INTO v_type FROM public.chat_conversations c WHERE c.id = p_conversation_id;
  IF v_type IS DISTINCT FROM 'group' THEN RETURN true; END IF;
  SELECT s.slow_mode_seconds INTO v_secs
  FROM public.chat_group_settings s WHERE s.conversation_id = p_conversation_id;
  IF COALESCE(v_secs, 0) <= 0 THEN RETURN true; END IF;

  SELECT cp.role INTO v_role
  FROM public.chat_participants cp
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = p_user_id AND cp.status = 'active';
  IF public.chat_group_role_rank(v_role) >= 3 THEN RETURN true; END IF;

  SELECT max(m.created_at) INTO v_last
  FROM public.chat_messages m
  WHERE m.conversation_id = p_conversation_id AND m.sender_id = p_user_id;
  IF v_last IS NULL THEN RETURN true; END IF;
  RETURN v_last <= now() - make_interval(secs => v_secs);
END;
$$;

-- anon hana EXECUTE (shim/hosted inaweza kuwa na default grants — tunaziondoa waziwazi).
REVOKE ALL ON FUNCTION public.chat_group_role_rank(text) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_role(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_is_active(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_is_banned(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_role_max(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_permissions_valid(text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_can(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_slow_mode_ok(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_role_rank(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_group_role(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_group_is_active(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_group_is_banned(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_group_role_max(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_group_permissions_valid(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_group_can(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_group_slow_mode_ok(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chat_group_role_rank(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_group_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_group_is_active(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_group_is_banned(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_group_role_max(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_group_permissions_valid(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_group_can(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_group_slow_mode_ok(uuid, uuid) TO authenticated;

-- ── 3. Guards (F3 · F4 · F5 · F7 · F9) ───────────────────────

-- 3a. INSERT ya participant: role/status/permissions za juu zinahitaji ruhusa.
CREATE OR REPLACE FUNCTION public.chat_group_guard_participant_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_creator uuid;
  v_type text;
BEGIN
  IF jsonb_typeof(NEW.permissions) = 'null' THEN NEW.permissions := NULL; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- maintenance ya server

  SELECT c.created_by, c.type INTO v_creator, v_type
  FROM public.chat_conversations c WHERE c.id = NEW.conversation_id;
  IF v_type IS NULL THEN
    RAISE EXCEPTION 'chat_group_conversation_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Owner wa kwanza: muundaji pekee (njia ya M1 wizard).
  IF NEW.role = 'owner' THEN
    IF v_type = 'group' AND v_creator = auth.uid() THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'chat_group_owner_grant_forbidden' USING ERRCODE = '42501';
  END IF;

  IF NEW.role IN ('admin', 'moderator') OR NEW.status <> 'active' OR NEW.permissions IS NOT NULL THEN
    IF v_creator = auth.uid() THEN RETURN NEW; END IF;
    -- Njia ya kujiunga (RPC ya DEFINER): mtu mwenyewe, member, bila grants.
    IF NEW.user_id = auth.uid()
       AND NEW.role = 'member'
       AND NEW.permissions IS NULL
       AND NEW.status IN ('active', 'pending') THEN
      RETURN NEW;
    END IF;
    IF NOT public.chat_group_can(NEW.conversation_id, auth.uid(), 'manage_roles') THEN
      RAISE EXCEPTION 'chat_group_no_permission_roles' USING ERRCODE = '42501';
    END IF;
    IF NEW.permissions IS NOT NULL
       AND NOT public.chat_group_permissions_valid(NEW.role, NEW.permissions) THEN
      RAISE EXCEPTION 'chat_group_invalid_permissions' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3b. UPDATE ya participant: safu zisizobadilika + rank + owner-immunity.
CREATE OR REPLACE FUNCTION public.chat_group_guard_participant_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_type text;
  v_actor_rank integer;
  v_old_rank integer;
  v_new_rank integer;
  v_manage boolean;
  v_transfer text := current_setting('chat.transfer_conv', true);
  v_join text := current_setting('chat.join_conv', true);
BEGIN
  IF jsonb_typeof(NEW.permissions) = 'null' THEN NEW.permissions := NULL; END IF;

  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'chat_group_participant_keys_immutable' USING ERRCODE = '42501';
  END IF;

  -- Mabadiliko ya kawaida (mfano last_read_at) — policy inatosha.
  IF NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.permissions IS NOT DISTINCT FROM OLD.permissions THEN
    RETURN NEW;
  END IF;

  -- Guards ni za muktadha wa app (JWT); maintenance ya server (bila claim) hairuki.
  IF v_actor IS NULL THEN RETURN NEW; END IF;

  SELECT c.type INTO v_type FROM public.chat_conversations c WHERE c.id = OLD.conversation_id;
  IF v_type IS DISTINCT FROM 'group' THEN
    RAISE EXCEPTION 'chat_group_roles_direct_forbidden' USING ERRCODE = '42501';
  END IF;

  -- Ownership transfer (RPC pekee, marker ya transaction).
  IF v_transfer = OLD.conversation_id::text THEN RETURN NEW; END IF;

  -- Owner: haruhusiwi kubadilishwa na mtu mwingine; role='owner' mpya = transfer pekee.
  IF OLD.role = 'owner' OR NEW.role = 'owner' THEN
    RAISE EXCEPTION 'chat_group_owner_immutable' USING ERRCODE = '42501';
  END IF;

  -- Kujiunga tena (left → active) kwa RPC ya join pekee.
  IF v_actor = OLD.user_id THEN
    -- Kujiunga tena (left→active kwa 'direct'; left→pending kwa 'request') au
    -- kuondoka (active→left) kwa RPC pekee (marker ya transaction).
    IF v_join = OLD.conversation_id::text
       AND NEW.role IS NOT DISTINCT FROM OLD.role
       AND NEW.permissions IS NOT DISTINCT FROM OLD.permissions
       AND ((OLD.status = 'left' AND NEW.status IN ('active', 'pending'))
            OR (OLD.status = 'active' AND NEW.status = 'left')) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'chat_group_self_role_change_forbidden' USING ERRCODE = '42501';
  END IF;

  v_actor_rank := public.chat_group_role_rank(
    public.chat_group_role(OLD.conversation_id, v_actor));
  IF v_actor_rank = 0 THEN
    RAISE EXCEPTION 'chat_group_no_permission' USING ERRCODE = '42501';
  END IF;

  v_old_rank := public.chat_group_role_rank(OLD.role);
  v_new_rank := public.chat_group_role_rank(NEW.role);
  IF v_actor_rank <= v_old_rank THEN
    RAISE EXCEPTION 'chat_group_insufficient_rank' USING ERRCODE = '42501';
  END IF;

  v_manage := public.chat_group_can(OLD.conversation_id, v_actor, 'manage_members');

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF v_actor_rank <= v_new_rank THEN
      RAISE EXCEPTION 'chat_group_cannot_grant_equal_or_higher' USING ERRCODE = '42501';
    END IF;
    IF NOT public.chat_group_can(OLD.conversation_id, v_actor, 'manage_roles') THEN
      RAISE EXCEPTION 'chat_group_no_permission_roles' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
    IF NOT public.chat_group_can(OLD.conversation_id, v_actor, 'manage_roles') THEN
      RAISE EXCEPTION 'chat_group_no_permission_roles' USING ERRCODE = '42501';
    END IF;
    IF NEW.permissions IS NOT NULL
       AND NOT public.chat_group_permissions_valid(COALESCE(NEW.role, OLD.role), NEW.permissions) THEN
      RAISE EXCEPTION 'chat_group_invalid_permissions' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT v_manage THEN
      -- Moderator (restrict_members): ban/left kwa member wa kawaida pekee.
      IF NOT (public.chat_group_can(OLD.conversation_id, v_actor, 'restrict_members')
              AND OLD.role = 'member'
              AND NEW.status IN ('banned', 'left')) THEN
        RAISE EXCEPTION 'chat_group_no_permission_members' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3c. UPDATE ya conversation: created_by/type/id hazibadiliki; jina = edit_info.
CREATE OR REPLACE FUNCTION public.chat_group_guard_conversation_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- maintenance ya server

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'chat_group_conversation_immutable' USING ERRCODE = '42501';
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title AND OLD.type = 'group' THEN
    IF auth.uid() IS NULL
       OR NOT public.chat_group_can(OLD.id, auth.uid(), 'edit_info') THEN
      RAISE EXCEPTION 'chat_group_no_permission_edit_info' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3d. UPDATE ya ujumbe: moderation = soft-delete (deleted_at) pekee.
CREATE OR REPLACE FUNCTION public.chat_group_guard_message_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- maintenance ya server

  -- Mwandishi: tabia zilizopo (hariri/futa) zinaendelea kama zamani.
  IF auth.uid() = OLD.sender_id THEN RETURN NEW; END IF;

  -- Wasio-mwandishi: soft-delete ya moderation pekee.
  IF NEW.deleted_at IS NULL OR OLD.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'chat_group_message_update_forbidden' USING ERRCODE = '42501';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.text IS DISTINCT FROM OLD.text
     OR NEW.media_url IS DISTINCT FROM OLD.media_url
     OR NEW.media_type IS DISTINCT FROM OLD.media_type
     OR NEW.reply_to_id IS DISTINCT FROM OLD.reply_to_id THEN
    RAISE EXCEPTION 'chat_group_message_update_forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT public.chat_group_can(OLD.conversation_id, auth.uid(), 'moderate_messages') THEN
    RAISE EXCEPTION 'chat_group_no_permission_moderate' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- 3e. Kikomo cha wanachama v2 (F9): lock ya conversation kuzuia race.
CREATE OR REPLACE FUNCTION public.enforce_chat_group_member_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_conv_type      text;
  v_setting_limit  integer;
  v_type_limit     integer;
  v_limit          integer;
  v_count          integer;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  -- Lock ya conversation: serializes inserts/reactivations per kikundi (F9).
  SELECT c.type INTO v_conv_type
  FROM public.chat_conversations c
  WHERE c.id = NEW.conversation_id
  FOR UPDATE;

  IF v_conv_type IS DISTINCT FROM 'group' THEN
    RETURN NEW;
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
    WHERE cp.conversation_id = NEW.conversation_id AND cp.status = 'active';
  ELSE
    SELECT count(*) INTO v_count
    FROM public.chat_participants cp
    WHERE cp.conversation_id = NEW.conversation_id AND cp.status = 'active'
      AND cp.user_id <> NEW.user_id;
  END IF;

  IF v_count + 1 > v_limit THEN
    RAISE EXCEPTION 'chat_group_member_limit: kikundi kimefika kikomo cha wanachama %', v_limit
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_participants_guard_ins ON public.chat_participants;
CREATE TRIGGER trg_chat_participants_guard_ins
  BEFORE INSERT ON public.chat_participants
  FOR EACH ROW EXECUTE FUNCTION public.chat_group_guard_participant_insert();

DROP TRIGGER IF EXISTS trg_chat_participants_guard_upd ON public.chat_participants;
CREATE TRIGGER trg_chat_participants_guard_upd
  BEFORE UPDATE ON public.chat_participants
  FOR EACH ROW EXECUTE FUNCTION public.chat_group_guard_participant_update();

DROP TRIGGER IF EXISTS trg_chat_conversations_guard_upd ON public.chat_conversations;
CREATE TRIGGER trg_chat_conversations_guard_upd
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.chat_group_guard_conversation_update();

DROP TRIGGER IF EXISTS trg_chat_messages_guard_upd ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_guard_upd
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_group_guard_message_update();

-- ── 4. Policies (sababu + ushahidi: audit F3–F7) ─────────────

-- 4a. Read = wanachama ACTIVE pekee (F6). Majina yanabaki yale yale.
DROP POLICY IF EXISTS participants_select_participant ON public.chat_participants;
CREATE POLICY participants_select_participant
  ON public.chat_participants FOR SELECT TO authenticated
  USING (public.chat_group_is_active(conversation_id, auth.uid()));

DROP POLICY IF EXISTS conversations_select_participant ON public.chat_conversations;
CREATE POLICY conversations_select_participant
  ON public.chat_conversations FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.chat_group_is_active(id, auth.uid())
  );

DROP POLICY IF EXISTS conversations_update_participant ON public.chat_conversations;
CREATE POLICY conversations_update_participant
  ON public.chat_conversations FOR UPDATE TO authenticated
  USING (public.chat_group_is_active(id, auth.uid()))
  WITH CHECK (public.chat_group_is_active(id, auth.uid()));

-- UTHIBITISHO (§4 wa suite): PostgreSQL hutumia USING ya SELECT policy kama
-- WITH CHECK ya mstari mpya wa UPDATE. Kwa hivyo soft-delete (deleted_at=now())
-- ilikataliwa na 42501 kwa mwandishi na moderator. Row zilizofutwa zinaonekana
-- kwa mwandishi na kwa moderator mwenye 'moderate_messages' pekee; wanachama wa
-- kawaida hawaoni (na query za app zinafunga .is('deleted_at', null) — orodha za
-- UI hazibadiliki).
DROP POLICY IF EXISTS messages_select_participant ON public.chat_messages;
CREATE POLICY messages_select_participant
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    (deleted_at IS NULL
     OR auth.uid() = sender_id
     OR public.chat_group_can(conversation_id, auth.uid(), 'moderate_messages'))
    AND public.chat_group_is_active(conversation_id, auth.uid())
  );

-- 4b. Kuongeza wanachama kwa ruhusa (F8) — creator policy ya M1 inaendelea.
DROP POLICY IF EXISTS participants_insert_permitted ON public.chat_participants;
CREATE POLICY participants_insert_permitted
  ON public.chat_participants FOR INSERT TO authenticated
  WITH CHECK (
    public.chat_group_can(conversation_id, auth.uid(), 'add_member')
    AND NOT public.chat_group_is_banned(conversation_id, user_id)
  );

-- 4c. Management update ya wanachama (F3/F7) — trigger inasimamia kanuni.
DROP POLICY IF EXISTS participants_update_manage ON public.chat_participants;
CREATE POLICY participants_update_manage
  ON public.chat_participants FOR UPDATE TO authenticated
  USING (
    public.chat_group_can(conversation_id, auth.uid(), 'manage_members')
    OR public.chat_group_can(conversation_id, auth.uid(), 'restrict_members')
  )
  WITH CHECK (
    public.chat_group_can(conversation_id, auth.uid(), 'manage_members')
    OR public.chat_group_can(conversation_id, auth.uid(), 'restrict_members')
  );

-- 4d. Kutuma ujumbe/media + slow mode (F5).
DROP POLICY IF EXISTS messages_insert_participant ON public.chat_messages;
CREATE POLICY messages_insert_participant
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      CASE WHEN media_url IS NULL AND media_type IS NULL
        THEN public.chat_group_can(conversation_id, auth.uid(), 'send_message')
        ELSE public.chat_group_can(conversation_id, auth.uid(), 'send_media')
      END
    )
    AND public.chat_group_slow_mode_ok(conversation_id, auth.uid())
  );

-- 4e. Moderation soft-delete ya ujumbe (F7; trigger inazuia columns nyingine).
DROP POLICY IF EXISTS messages_update_moderate ON public.chat_messages;
CREATE POLICY messages_update_moderate
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (public.chat_group_can(conversation_id, auth.uid(), 'moderate_messages'))
  WITH CHECK (public.chat_group_can(conversation_id, auth.uid(), 'moderate_messages'));

-- 4f. Settings: owner + admin mwenye edit_settings (F7).
DROP POLICY IF EXISTS group_settings_select ON public.chat_group_settings;
CREATE POLICY group_settings_select
  ON public.chat_group_settings FOR SELECT TO authenticated
  USING (
    public.chat_group_is_active(conversation_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.chat_conversations c
               WHERE c.id = conversation_id AND c.created_by = auth.uid())
  );

DROP POLICY IF EXISTS group_settings_update ON public.chat_group_settings;
CREATE POLICY group_settings_update
  ON public.chat_group_settings FOR UPDATE TO authenticated
  USING (public.chat_group_can(conversation_id, auth.uid(), 'edit_settings'))
  WITH CHECK (public.chat_group_can(conversation_id, auth.uid(), 'edit_settings'));

-- 4g. Storage ya group-media: kusoma = member active; kuandika = manage_photo.
DROP POLICY IF EXISTS group_media_select ON storage.objects;
CREATE POLICY group_media_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'group-media'
    AND public.chat_group_is_active(public.chat_safe_uuid((storage.foldername(name))[1]), auth.uid())
  );

DROP POLICY IF EXISTS group_media_insert ON storage.objects;
CREATE POLICY group_media_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'group-media'
    AND public.chat_group_can(public.chat_safe_uuid((storage.foldername(name))[1]), auth.uid(), 'manage_photo')
  );

DROP POLICY IF EXISTS group_media_update ON storage.objects;
CREATE POLICY group_media_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'group-media'
    AND public.chat_group_can(public.chat_safe_uuid((storage.foldername(name))[1]), auth.uid(), 'manage_photo')
  );

DROP POLICY IF EXISTS group_media_delete ON storage.objects;
CREATE POLICY group_media_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'group-media'
    AND public.chat_group_can(public.chat_safe_uuid((storage.foldername(name))[1]), auth.uid(), 'manage_photo')
  );

-- ── 5. RPCs salama (management · join · transfer · leave) ────

CREATE OR REPLACE FUNCTION public.chat_group_set_member(
  p_conversation_id uuid,
  p_user_id uuid,
  p_role text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_permissions jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_type text;
  v_actor_rank integer;
  v_target record;
  v_new_role text;
  v_new_status text;
  v_new_permissions jsonb;
  v_actor_manage boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'chat_group_unauthenticated' USING ERRCODE = '42501';
  END IF;
  SELECT c.type INTO v_type FROM public.chat_conversations c WHERE c.id = p_conversation_id;
  IF v_type IS DISTINCT FROM 'group' THEN
    RAISE EXCEPTION 'chat_group_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_actor_rank := public.chat_group_role_rank(
    public.chat_group_role(p_conversation_id, v_actor));
  IF v_actor_rank = 0 THEN
    RAISE EXCEPTION 'chat_group_no_permission' USING ERRCODE = '42501';
  END IF;

  SELECT cp.role, cp.status, cp.permissions INTO v_target
  FROM public.chat_participants cp
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = p_user_id;
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'chat_group_member_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF p_user_id = v_actor THEN
    RAISE EXCEPTION 'chat_group_self_edit_forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_target.role = 'owner' THEN
    RAISE EXCEPTION 'chat_group_owner_immutable' USING ERRCODE = '42501';
  END IF;
  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'chat_group_owner_grant_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('admin', 'moderator', 'member') THEN
    RAISE EXCEPTION 'chat_group_invalid_value' USING ERRCODE = '22023';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'pending', 'banned', 'left') THEN
    RAISE EXCEPTION 'chat_group_invalid_value' USING ERRCODE = '22023';
  END IF;
  IF v_actor_rank <= public.chat_group_role_rank(v_target.role) THEN
    RAISE EXCEPTION 'chat_group_insufficient_rank' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NOT NULL AND v_actor_rank <= public.chat_group_role_rank(p_role) THEN
    RAISE EXCEPTION 'chat_group_cannot_grant_equal_or_higher' USING ERRCODE = '42501';
  END IF;

  IF p_role IS NOT NULL AND
     NOT public.chat_group_can(p_conversation_id, v_actor, 'manage_roles') THEN
    RAISE EXCEPTION 'chat_group_no_permission_roles' USING ERRCODE = '42501';
  END IF;
  IF p_permissions IS NOT NULL AND jsonb_typeof(p_permissions) <> 'null' AND
     NOT public.chat_group_can(p_conversation_id, v_actor, 'manage_roles') THEN
    RAISE EXCEPTION 'chat_group_no_permission_roles' USING ERRCODE = '42501';
  END IF;
  IF p_permissions IS NOT NULL AND jsonb_typeof(p_permissions) <> 'null'
     AND NOT public.chat_group_permissions_valid(COALESCE(p_role, v_target.role), p_permissions) THEN
    RAISE EXCEPTION 'chat_group_invalid_permissions' USING ERRCODE = '22023';
  END IF;

  IF p_status IS NOT NULL AND p_status IS DISTINCT FROM v_target.status THEN
    v_actor_manage := public.chat_group_can(p_conversation_id, v_actor, 'manage_members');
    IF NOT v_actor_manage THEN
      IF NOT (public.chat_group_can(p_conversation_id, v_actor, 'restrict_members')
              AND v_target.role = 'member'
              AND p_status IN ('banned', 'left')) THEN
        RAISE EXCEPTION 'chat_group_no_permission_members' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  UPDATE public.chat_participants
     SET role = COALESCE(p_role, role),
         status = COALESCE(p_status, status),
         permissions = CASE
           WHEN p_permissions IS NULL THEN permissions
           WHEN jsonb_typeof(p_permissions) = 'null' THEN NULL
           ELSE p_permissions END
   WHERE conversation_id = p_conversation_id AND user_id = p_user_id
   RETURNING role, status, permissions INTO v_new_role, v_new_status, v_new_permissions;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'role', v_new_role,
    'status', v_new_status,
    'permissions', v_new_permissions
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.chat_group_add_member(
  p_conversation_id uuid, p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_type text;
  v_existing record;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'chat_group_unauthenticated' USING ERRCODE = '42501';
  END IF;
  SELECT c.type INTO v_type FROM public.chat_conversations c WHERE c.id = p_conversation_id;
  IF v_type IS DISTINCT FROM 'group' THEN
    RAISE EXCEPTION 'chat_group_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.chat_group_can(p_conversation_id, v_actor, 'add_member') THEN
    RAISE EXCEPTION 'chat_group_no_permission_add' USING ERRCODE = '42501';
  END IF;

  SELECT cp.status INTO v_existing
  FROM public.chat_participants cp
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    IF v_existing.status = 'banned' THEN
      RAISE EXCEPTION 'chat_group_banned' USING ERRCODE = '42501';
    END IF;
    IF v_existing.status IN ('active', 'pending') THEN
      RAISE EXCEPTION 'chat_group_already_member' USING ERRCODE = '23505';
    END IF;
    -- 'left' → kurejea
    UPDATE public.chat_participants SET status = 'active'
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
    RETURN jsonb_build_object('user_id', p_user_id, 'status', 'active');
  END IF;

  INSERT INTO public.chat_participants (conversation_id, user_id, role, status)
  VALUES (p_conversation_id, p_user_id, 'member', 'active');
  RETURN jsonb_build_object('user_id', p_user_id, 'status', 'active');
END;
$$;

CREATE OR REPLACE FUNCTION public.chat_group_join(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_type text;
  v_join text;
  v_privacy text;
  v_existing record;
  v_status text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'chat_group_unauthenticated' USING ERRCODE = '42501';
  END IF;
  SELECT c.type INTO v_type FROM public.chat_conversations c WHERE c.id = p_conversation_id;
  IF v_type IS DISTINCT FROM 'group' THEN
    RAISE EXCEPTION 'chat_group_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(s.join_method, 'request'), COALESCE(s.privacy, 'private')
    INTO v_join, v_privacy
  FROM public.chat_group_settings s WHERE s.conversation_id = p_conversation_id;

  SELECT cp.status INTO v_existing
  FROM public.chat_participants cp
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_actor;

  IF v_existing IS NOT NULL THEN
    IF v_existing.status = 'banned' THEN
      RAISE EXCEPTION 'chat_group_banned' USING ERRCODE = '42501';
    END IF;
    IF v_existing.status IN ('active', 'pending') THEN
      RAISE EXCEPTION 'chat_group_already_member' USING ERRCODE = '23505';
    END IF;
  END IF;

  IF v_join IN ('invite', 'invite_link') THEN
    RAISE EXCEPTION 'chat_group_invite_required' USING ERRCODE = '42501';
  END IF;
  IF v_join = 'direct' AND v_privacy = 'private' THEN
    RAISE EXCEPTION 'chat_group_join_restricted' USING ERRCODE = '42501';
  END IF;

  v_status := CASE WHEN v_join = 'direct' THEN 'active' ELSE 'pending' END;

  IF v_existing IS NOT NULL THEN
    -- left → kurejea kwa RPC pekee (marker ya transaction).
    PERFORM set_config('chat.join_conv', p_conversation_id::text, true);
    UPDATE public.chat_participants SET status = v_status
    WHERE conversation_id = p_conversation_id AND user_id = v_actor;
  ELSE
    INSERT INTO public.chat_participants (conversation_id, user_id, role, status)
    VALUES (p_conversation_id, v_actor, 'member', v_status);
  END IF;

  RETURN jsonb_build_object('user_id', v_actor, 'status', v_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.chat_group_transfer_ownership(
  p_conversation_id uuid, p_new_owner uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_type text;
  v_target record;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'chat_group_unauthenticated' USING ERRCODE = '42501';
  END IF;
  SELECT c.type INTO v_type FROM public.chat_conversations c WHERE c.id = p_conversation_id;
  IF v_type IS DISTINCT FROM 'group' THEN
    RAISE EXCEPTION 'chat_group_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.is_chat_group_owner(p_conversation_id, v_actor) THEN
    RAISE EXCEPTION 'chat_group_owner_only' USING ERRCODE = '42501';
  END IF;
  IF p_new_owner = v_actor THEN
    RAISE EXCEPTION 'chat_group_transfer_self' USING ERRCODE = '22023';
  END IF;

  SELECT cp.role, cp.status INTO v_target
  FROM public.chat_participants cp
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = p_new_owner;
  IF v_target IS NULL OR v_target.status <> 'active' OR v_target.role = 'owner' THEN
    RAISE EXCEPTION 'chat_group_transfer_invalid_target' USING ERRCODE = '22023';
  END IF;

  -- Marker: guards zinaruhusu mabadiliko ya umiliki ndani ya transaction hii.
  PERFORM set_config('chat.transfer_conv', p_conversation_id::text, true);

  UPDATE public.chat_participants SET role = 'admin'
  WHERE conversation_id = p_conversation_id AND user_id = v_actor;

  UPDATE public.chat_participants SET role = 'owner'
  WHERE conversation_id = p_conversation_id AND user_id = p_new_owner;

  RETURN jsonb_build_object(
    'conversation_id', p_conversation_id,
    'previous_owner', v_actor,
    'new_owner', p_new_owner,
    'previous_owner_role', 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.chat_group_leave(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_type text;
  v_role text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'chat_group_unauthenticated' USING ERRCODE = '42501';
  END IF;
  SELECT c.type INTO v_type FROM public.chat_conversations c WHERE c.id = p_conversation_id;
  IF v_type IS DISTINCT FROM 'group' THEN
    RAISE EXCEPTION 'chat_group_leave_direct_unsupported' USING ERRCODE = '22023';
  END IF;
  SELECT cp.role INTO v_role
  FROM public.chat_participants cp
  WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_actor AND cp.status = 'active';
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'chat_group_not_member' USING ERRCODE = '42501';
  END IF;
  IF v_role = 'owner' THEN
    RAISE EXCEPTION 'chat_group_owner_must_transfer' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('chat.join_conv', p_conversation_id::text, true);
  UPDATE public.chat_participants SET status = 'left'
  WHERE conversation_id = p_conversation_id AND user_id = v_actor
    AND status = 'active';
  RETURN jsonb_build_object('user_id', v_actor, 'status', 'left');
END;
$$;

REVOKE ALL ON FUNCTION public.chat_group_set_member(uuid, uuid, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_add_member(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_join(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_transfer_ownership(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_leave(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.chat_group_set_member(uuid, uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_group_add_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_group_join(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_group_transfer_ownership(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.chat_group_leave(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chat_group_set_member(uuid, uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_group_add_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_group_join(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_group_transfer_ownership(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_group_leave(uuid) TO authenticated;

-- ── 6. ROLLBACK (huhifadhi data) ─────────────────────────────
-- Kurudisha hali ya kabla ya M2 (data yote inabaki; hakuna DROP TABLE):
--
--   -- functions/RPC mpya
--   DROP FUNCTION IF EXISTS public.chat_group_set_member(uuid, uuid, text, text, jsonb);
--   DROP FUNCTION IF EXISTS public.chat_group_add_member(uuid, uuid);
--   DROP FUNCTION IF EXISTS public.chat_group_join(uuid);
--   DROP FUNCTION IF EXISTS public.chat_group_transfer_ownership(uuid, uuid);
--   DROP FUNCTION IF EXISTS public.chat_group_leave(uuid);
--   DROP FUNCTION IF EXISTS public.chat_group_can(uuid, uuid, text);
--   DROP FUNCTION IF EXISTS public.chat_group_slow_mode_ok(uuid, uuid);
--   DROP FUNCTION IF EXISTS public.chat_group_is_banned(uuid, uuid);
--   DROP FUNCTION IF EXISTS public.chat_group_is_active(uuid, uuid);
--   DROP FUNCTION IF EXISTS public.chat_group_role(uuid, uuid);
--   DROP FUNCTION IF EXISTS public.chat_group_role_rank(text);
--   DROP FUNCTION IF EXISTS public.chat_group_role_max(text, text);
--   DROP FUNCTION IF EXISTS public.chat_group_permissions_valid(text, jsonb);
--   DROP TRIGGER IF EXISTS trg_chat_participants_guard_ins ON public.chat_participants;
--   DROP TRIGGER IF EXISTS trg_chat_participants_guard_upd ON public.chat_participants;
--   DROP TRIGGER IF EXISTS trg_chat_conversations_guard_upd ON public.chat_conversations;
--   DROP TRIGGER IF EXISTS trg_chat_messages_guard_upd ON public.chat_messages;
--   -- policies kwa hali ya awali (nakala halisi):
--   DROP POLICY IF EXISTS participants_insert_permitted ON public.chat_participants;
--   DROP POLICY IF EXISTS participants_update_manage ON public.chat_participants;
--   DROP POLICY IF EXISTS messages_update_moderate ON public.chat_messages;
--   DROP POLICY IF EXISTS participants_select_participant ON public.chat_participants;
--   CREATE POLICY participants_select_participant ON public.chat_participants
--     FOR SELECT TO authenticated USING (public.is_chat_member(conversation_id));
--   DROP POLICY IF EXISTS conversations_select_participant ON public.chat_conversations;
--   CREATE POLICY conversations_select_participant ON public.chat_conversations
--     FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.is_chat_member(id, auth.uid()));
--   DROP POLICY IF EXISTS conversations_update_participant ON public.chat_conversations;
--   CREATE POLICY conversations_update_participant ON public.chat_conversations
--     FOR UPDATE TO authenticated USING (public.is_chat_member(id, auth.uid()))
--     WITH CHECK (public.is_chat_member(id, auth.uid()));
--   DROP POLICY IF EXISTS messages_select_participant ON public.chat_messages;
--   CREATE POLICY messages_select_participant ON public.chat_messages
--     FOR SELECT TO authenticated USING (deleted_at IS NULL AND public.is_chat_member(conversation_id));
--   -- Kumbuka: rollback inarudisha hali ya awali (mwanachama pekee, bila
--   -- waona-uliopangwa). Soft-delete haitafanya kazi baada ya rollback hadi
--   -- 034 irudi; hiyo ni sehemu ya MPANGO-B (rejesha 034).
--   DROP POLICY IF EXISTS messages_insert_participant ON public.chat_messages;
--   CREATE POLICY messages_insert_participant ON public.chat_messages
--     FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND public.is_chat_member(conversation_id));
--   DROP POLICY IF EXISTS group_settings_select ON public.chat_group_settings;
--   CREATE POLICY group_settings_select ON public.chat_group_settings
--     FOR SELECT TO authenticated USING (public.is_chat_member(conversation_id)
--       OR EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()));
--   DROP POLICY IF EXISTS group_settings_update ON public.chat_group_settings;
--   CREATE POLICY group_settings_update ON public.chat_group_settings
--     FOR UPDATE TO authenticated USING (public.is_chat_group_owner(conversation_id, auth.uid()))
--     WITH CHECK (public.is_chat_group_owner(conversation_id, auth.uid()));
--   DROP POLICY IF EXISTS group_media_select ON storage.objects;
--   CREATE POLICY group_media_select ON storage.objects FOR SELECT TO authenticated
--     USING (bucket_id = 'group-media' AND public.is_chat_member(public.chat_safe_uuid((storage.foldername(name))[1]), auth.uid()));
--   DROP POLICY IF EXISTS group_media_insert ON storage.objects;
--   CREATE POLICY group_media_insert ON storage.objects FOR INSERT TO authenticated
--     WITH CHECK (bucket_id = 'group-media' AND public.is_chat_group_owner(public.chat_safe_uuid((storage.foldername(name))[1]), auth.uid()));
--   DROP POLICY IF EXISTS group_media_update ON storage.objects;
--   CREATE POLICY group_media_update ON storage.objects FOR UPDATE TO authenticated
--     USING (bucket_id = 'group-media' AND public.is_chat_group_owner(public.chat_safe_uuid((storage.foldername(name))[1]), auth.uid()));
--   DROP POLICY IF EXISTS group_media_delete ON storage.objects;
--   CREATE POLICY group_media_delete ON storage.objects FOR DELETE TO authenticated
--     USING (bucket_id = 'group-media' AND public.is_chat_group_owner(public.chat_safe_uuid((storage.foldername(name))[1]), auth.uid()));
--   -- FORCE: USIRUDISHE (023 iliondoa kwa makusudi; F1/F2) — endelea NO FORCE.
--   -- `permissions` column inabaki (inert) — haina kufuta data ya grants.
