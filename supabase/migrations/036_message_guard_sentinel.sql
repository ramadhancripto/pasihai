-- ============================================================================
-- 036_message_guard_sentinel.sql
-- M2.1 FINAL SECURITY GATE (2026-10-14) — Kinga ya kudumu (sentinel) kwa 035.
--
-- TATIZO (ushahidi: `docs/verification/groups/m2-review-report.md` §3 +
-- `evidence/migrations-existing-schema-034.txt`): `034` ina
-- `CREATE OR REPLACE FUNCTION public.chat_group_guard_message_update()`.
-- Kurudia 034 baada ya 035 (kwa mkono, au ledger ikirukwa) hurudisha mwili wa
-- awali wa guard → mianya I1 (kufufua ujumbe uliofutwa) na I2 (kubadilisha
-- columns za utambulisho / kuhamisha ujumbe) inafunguka tena.
--
-- SULUHISHO (additive, bila kubadilisha historia ya 034/035):
--   1) 036 inarudia mwili ulioimarishwa wa guard (034 ikiwa ya mwisho kutumika,
--      036 inakuwa neno la mwisho — kwa DB safi na kwa upgrade).
--   2) MUHIMU: 036 inaweka **trigger huru** (`trg_chat_messages_immutable_guard`)
--      ambayo haipo kwenye 034. Kurudia 034 hakuiondoi; hivyo invariants za
--      msingi (identity columns hazibadiliki; ufutaji wa upande mmoja)
--      zinabaki zikitekelezwa HATA kama function ya guard inarudishwa nyuma.
--   3) Hakuna `DROP` ya data/columns; hakuna kubadilisha 034/035.
--
-- Uthibitisho: `supabase/verify/migration-guard-test.mjs` §D (hostile replay)
-- + `supabase/verify/messages-security-test.mjs` (RLS/SQL moja kwa moja).
-- ============================================================================

BEGIN;

/* ── 1) Neno la mwisho kwa guard ya 034 (mwili sawa na 035) ─────────────── */
CREATE OR REPLACE FUNCTION public.chat_group_guard_message_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- maintenance ya server

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'chat_group_message_update_forbidden' USING ERRCODE = '42501';
  END IF;

  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'chat_group_message_undelete_forbidden' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() = OLD.sender_id THEN RETURN NEW; END IF;

  IF NEW.deleted_at IS NULL OR OLD.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'chat_group_message_update_forbidden' USING ERRCODE = '42501';
  END IF;
  IF NEW.text IS DISTINCT FROM OLD.text
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

/* ── 2) Sentinel huru: invariants za kimuundo (034 haiwezi kuiondoa) ────── */
CREATE OR REPLACE FUNCTION public.chat_group_message_immutable_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- maintenance ya server

  /* Identity/meta za ujumbe: hazibadiliki kwa mtu yeyote. */
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'chat_group_message_update_forbidden' USING ERRCODE = '42501';
  END IF;

  /* Ufutaji ni wa upande mmoja: deleted_at haiwezi kurudishwa NULL. */
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'chat_group_message_undelete_forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_messages_immutable_guard ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_immutable_guard
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_group_message_immutable_guard();

COMMIT;

-- ============================================================================
-- ROLLBACK (kwa komenti; hakuna kufuta data):
--   DROP TRIGGER IF EXISTS trg_chat_messages_immutable_guard ON public.chat_messages;
--   DROP FUNCTION IF EXISTS public.chat_group_message_immutable_guard();
-- Kumbuka: kufanya hivi kunafungua I1/I2 ikiwa 034 itarudiwa baadaye — usifanye
-- bila mpango ulioandikwa.
-- ============================================================================
