-- ══════════════════════════════════════════════════════════════
-- PASIHAI — Migration 012: chat_conversations + chat_messages
--
-- Inalingana na: chatService + chatRepository
-- Dependency: profiles (001)
-- Rollback: DROP TABLE IF EXISTS chat_messages CASCADE;
--           DROP TABLE IF EXISTS chat_conversations CASCADE;
-- ══════════════════════════════════════════════════════════════

-- ── chat_conversations ──────────────────────────────────────
CREATE TABLE chat_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL DEFAULT 'direct'
                CHECK (type IN ('direct', 'group')),
  title       TEXT CHECK (type = 'group' AND char_length(title) >= 1 AND char_length(title) <= 100),
  created_by  UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_updated ON chat_conversations(updated_at DESC);

-- ── Trigger: updated_at ─────────────────────────────────────
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── chat_participants (junction table) ──────────────────────
CREATE TABLE chat_participants (
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_participants_user ON chat_participants(user_id);

-- ── chat_messages ───────────────────────────────────────────
CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  text            TEXT CHECK (char_length(text) >= 1 AND char_length(text) <= 5000),
  media_url       TEXT CHECK (media_url IS NULL OR media_url ~ '^https?://'),
  media_type      TEXT CHECK (media_type IN ('image', 'video', 'audio', 'file')),
  reply_to_id     UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_messages_conversation ON chat_messages(conversation_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_sender ON chat_messages(sender_id)
  WHERE deleted_at IS NULL;

-- ── Trigger: update conversation updated_at ─────────────────
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_update_conversation
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- ── RLS: chat_conversations ─────────────────────────────────
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations FORCE ROW LEVEL SECURITY;

-- SELECT: washiriki pekee wanaona conversation
CREATE POLICY "conversations_select_participant"
  ON chat_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = chat_conversations.id AND user_id = auth.uid()
    )
  );

-- INSERT: mtumiaji yeyote aliyeingia anaweza kuunda conversation
CREATE POLICY "conversations_insert_auth"
  ON chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- UPDATE: washiriki pekee wanaweza kusasisha (kwa sasa hakuna update fields)
CREATE POLICY "conversations_update_participant"
  ON chat_conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = chat_conversations.id AND user_id = auth.uid()
    )
  );

-- ── RLS: chat_participants ──────────────────────────────────
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants FORCE ROW LEVEL SECURITY;

-- SELECT: washiriki pekee wanaona washiriki wengine
CREATE POLICY "participants_select_participant"
  ON chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.conversation_id = chat_participants.conversation_id AND cp.user_id = auth.uid()
    )
  );

-- INSERT: creator wa conversation au admin (kwa sasa creator pekee)
CREATE POLICY "participants_insert_creator"
  ON chat_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = (SELECT created_by FROM chat_conversations WHERE id = conversation_id)
  );

-- UPDATE: mtumiaji anaweza kusasisha last_read_at yake
CREATE POLICY "participants_update_own"
  ON chat_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: mtumiaji anaweza kuondoka conversation
CREATE POLICY "participants_delete_own"
  ON chat_participants FOR DELETE
  USING (auth.uid() = user_id);

-- ── RLS: chat_messages ──────────────────────────────────────
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;

-- SELECT: washiriki pekee wanaona messages
CREATE POLICY "messages_select_participant"
  ON chat_messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid()
    )
  );

-- INSERT: washiriki pekee wanaweza kutuma messages
CREATE POLICY "messages_insert_participant"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chat_participants
      WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid()
    )
  );

-- UPDATE: mtumiaji anaweza kufuta messages zake (soft delete)
CREATE POLICY "messages_update_sender"
  ON chat_messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- DELETE: mtumiaji anaweza kufuta messages zake (hard delete)
CREATE POLICY "messages_delete_sender"
  ON chat_messages FOR DELETE
  USING (auth.uid() = sender_id);
