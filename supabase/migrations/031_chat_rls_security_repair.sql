
BEGIN;

-- ChatHai: RLS repair, migration 031
-- Preserve conversation privacy and restrict participant insertion.

CREATE OR REPLACE FUNCTION public.is_chat_member(
  p_conversation_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = p_user_id
  );
$function$;

REVOKE ALL ON FUNCTION public.is_chat_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS conversations_insert_auth
  ON public.chat_conversations;

CREATE POLICY conversations_insert_auth
  ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS conversations_select_participant
  ON public.chat_conversations;

CREATE POLICY conversations_select_participant
  ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_chat_member(id, auth.uid())
  );

DROP POLICY IF EXISTS conversations_update_participant
  ON public.chat_conversations;

CREATE POLICY conversations_update_participant
  ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (public.is_chat_member(id, auth.uid()))
  WITH CHECK (public.is_chat_member(id, auth.uid()));

DROP POLICY IF EXISTS participants_insert_creator
  ON public.chat_participants;

CREATE POLICY participants_insert_creator
  ON public.chat_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations c
      WHERE c.id = conversation_id
        AND c.created_by = auth.uid()
    )
  );

COMMIT();
