-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 023: rekebisha recursion ya RLS kwenye chat
--
-- TATIZO (limethibitishwa kwa PostgREST 12 + Postgres 17 ya ndani):
--   "infinite recursion detected in policy for relation \"chat_participants\"".
--   participants_select_participant inasoma chat_participants ndani ya policy yake
--   yenyewe. conversations_select_participant na messages_* nazo zinasoma
--   chat_participants, kwa hiyo mazungumzo hayawezi kusomwa wala kutumwa kwenye live.
--
-- SULUHISHO:
--   1) Helper SECURITY DEFINER `is_conversation_participant(conv, uid)` inasoma
--      chat_participants bila kupitia RLS, kwa hiyo policies hazijirudii.
--   2) Creator wa conversation anaweza kuiona conversation yake (inahitajika ili
--      INSERT ... RETURNING ifanye kazi kabla washiriki hawajaongezwa).
--   3) chat_participants: NO FORCE ROW LEVEL SECURITY. Ni owner wa jedwali pekee
--      (migration owner) ndiye anayebypass RLS. Roles za API (anon, authenticated)
--      bado zinatumia RLS kikamilifu.
--
-- ATHARI: hakuna jedwali, safu wala data inayofutwa. Policies za chat na CHECK ya
-- chat_conversations (ambayo ilizuia DM zote) zinabadilika. Rollback: tazama mwisho wa faili.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_conversation_creator(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversations cc
    WHERE cc.id = p_conversation_id
      AND cc.created_by = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_conversation_creator(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_creator(uuid, uuid) TO authenticated;

-- ── Constraint ya conversation ───────────────────────────
-- 012 ilikuwa na CHECK (type = 'group' AND title ...) kwenye title, ambayo inakataa
-- KILA conversation ya 'direct' (chat_conversations_check). Hakuna DM inayoweza kuundwa.
-- Sheria sahihi: direct haina title; group ina title ya herufi 1–100.
ALTER TABLE public.chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_check;
ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_check
  CHECK (
    (type = 'direct' AND title IS NULL)
    OR (type = 'group' AND char_length(title) BETWEEN 1 AND 100)
  );

-- chat_participants: owner haibypass tena policy kwa FORCE; API roles bado zinazuiwa na RLS.
ALTER TABLE public.chat_participants NO FORCE ROW LEVEL SECURITY;

-- ── chat_conversations ─────────────────────────────────────
DROP POLICY IF EXISTS "conversations_select_participant" ON public.chat_conversations;
CREATE POLICY "conversations_select_participant"
  ON public.chat_conversations FOR SELECT TO authenticated
  USING (
    public.is_conversation_participant(chat_conversations.id, auth.uid())
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "conversations_update_participant" ON public.chat_conversations;
CREATE POLICY "conversations_update_participant"
  ON public.chat_conversations FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(chat_conversations.id, auth.uid()));

-- ── chat_participants ──────────────────────────────────────
DROP POLICY IF EXISTS "participants_select_participant" ON public.chat_participants;
CREATE POLICY "participants_select_participant"
  ON public.chat_participants FOR SELECT TO authenticated
  USING (public.is_conversation_participant(chat_participants.conversation_id, auth.uid()));

DROP POLICY IF EXISTS "participants_insert_creator" ON public.chat_participants;
CREATE POLICY "participants_insert_creator"
  ON public.chat_participants FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_conversation_creator(chat_participants.conversation_id, auth.uid())
  );

-- ── chat_messages ──────────────────────────────────────────
DROP POLICY IF EXISTS "messages_select_participant" ON public.chat_messages;
CREATE POLICY "messages_select_participant"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_conversation_participant(chat_messages.conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON public.chat_messages;
CREATE POLICY "messages_insert_participant"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_conversation_participant(chat_messages.conversation_id, auth.uid())
  );

-- ROLLBACK (ikihitajika, kwa mpango ulioidhinishwa tu):
--   Rudisha policies za awali kutoka 012_chat.sql, kisha:
--   ALTER TABLE public.chat_participants FORCE ROW LEVEL SECURITY;
--   DROP FUNCTION public.is_conversation_participant(uuid, uuid);
--   DROP FUNCTION public.is_conversation_creator(uuid, uuid);
