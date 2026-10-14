-- ============================================================================
-- 035_message_update_guard.sql
-- M2 REVIEW (2026-10-14) — Uimarishaji wa guard ya UPDATE ya `chat_messages`.
--
-- Sababu (ushahidi: `supabase/verify/messages-security-test.mjs` §2, na
-- `docs/verification/groups/m2-review-report.md`):
--   1) 034 ilizuia WASIO-MWANDISHI kubadilisha columns za ujumbe, lakini
--      MWANDISHI (njia ya mapema `RETURN NEW`) alikuwa bado anaweza kubadilisha
--      columns za utambulisho:
--        • `conversation_id` → kuhamisha ujumbe kwenda mazungumzo mengine alipo
--          mwanachama; UPDATE hii inaruka `messages_insert_participant`, yaani
--          slow mode, announcement-senders na media-gate za mazungumzo lengwa;
--        • `sender_id`, `id`, `created_at` → kughushi utambulisho/muda.
--   2) `deleted_at` ilikuwa inaweza kurudishwa NULL — kufuta kwa moderation
--      kulikuwa kunaweza "kufufuliwa" na mwandishi.
--
-- Kinachobadilika (guard ILEILE, trigger ipo kutoka 034 — hakuna duplicate):
--   • columns za utambulisho hazibadiliki kwa MTU YEYOTE (mwandishi, moderator,
--     mwingine) — hata kwa njia ya moja kwa moja ya SQL;
--   • `deleted_at` ni ya upande mmoja: NULL → timestamp pekee;
--   • mwandishi: hariri (text/media) + futa — tabia iliyopo inaendelea;
--   • wasio-mwandishi: soft-delete PEKEE kwa `moderate_messages` (kama 034).
--
-- Usalama wa ku-apply: additive + idempotent (CREATE OR REPLACE pekee; hakuna
-- `DROP`, hakuna `ALTER`, hakuna data inayoguzwa). Ina-apply salama kwenye DB
-- safi (baada ya 034) na kwenye DB yenye schema+data iliyopo.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.chat_group_guard_message_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- maintenance ya server

  /* (a) Utambulisho wa ujumbe: haubadiliki kwa mtu yeyote. (M2 review) */
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'chat_group_message_update_forbidden' USING ERRCODE = '42501';
  END IF;

  /* (b) Ufutaji ni wa upande mmoja. (M2 review) */
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'chat_group_message_undelete_forbidden' USING ERRCODE = '42501';
  END IF;

  /* Mwandishi: hariri/futa kama zamani (text, media, deleted_at). */
  IF auth.uid() = OLD.sender_id THEN RETURN NEW; END IF;

  /* Wasio-mwandishi: soft-delete pekee, kwa ruhusa ya moderate_messages. */
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

COMMIT;

-- ============================================================================
-- ROLLBACK (kwa komenti — hakuna `DROP TABLE`, data haiguzwi):
-- Rudisha mwili wa awali kutoka `034_group_roles_permissions.sql` (toleo la
-- 034 halikuwa na checks (a) na (b)):
--   CREATE OR REPLACE FUNCTION public.chat_group_guard_message_update()
--   ... (nakala kamili iko kwenye 034, sehemu "3d. Guard ya UPDATE ya ujumbe")
-- Kumbuka: kurudisha 034 kunafungua tena mianya ya (1) na (2) hapo juu —
-- hakikisha umeamua hivyo kwa sababu ya kumbukumbu, si kwa bahati mbaya.
-- ============================================================================
