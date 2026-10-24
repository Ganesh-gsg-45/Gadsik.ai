-- 002_enable_rls_and_indexes.sql
-- Enables Row-Level Security, establishes tenant isolation policies, and adds missing performance indexes.

-- 1. Ensure Row Level Security is enabled
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_documents_conv_user ON documents(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);

-- 3. Row Level Security Policies

-- Conversations: Users can only select, insert, update, or delete their own threads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'Users can manage their own conversations'
    ) THEN
        CREATE POLICY "Users can manage their own conversations"
            ON conversations
            FOR ALL
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Messages: Users can only manage messages in conversations they own
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'Users can manage messages in their conversations'
    ) THEN
        CREATE POLICY "Users can manage messages in their conversations"
            ON messages
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM conversations
                    WHERE conversations.id = messages.conversation_id
                    AND conversations.user_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM conversations
                    WHERE conversations.id = messages.conversation_id
                    AND conversations.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Documents: Users can only manage their own documents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'Users can manage their own documents'
    ) THEN
        CREATE POLICY "Users can manage their own documents"
            ON documents
            FOR ALL
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Usage Events: Users can only view their own usage history
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'usage_events' AND policyname = 'Users can view their own usage events'
    ) THEN
        CREATE POLICY "Users can view their own usage events"
            ON usage_events
            FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;
