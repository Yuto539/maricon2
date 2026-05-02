-- Migration: 001_init.sql
-- Description: Core tables for TalkBridge MVP
-- Run with: supabase db push

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users (managed by Supabase Auth) ─────────────────────────────────────
-- Supabase provides auth.users; we create a public profile table.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Conversations ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Messages ───────────────────────────────────────────────────────────────

CREATE TYPE public.message_sender AS ENUM ('me', 'partner');

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender          public.message_sender NOT NULL,
  content         TEXT NOT NULL,
  sentiment       NUMERIC(4, 3) CHECK (sentiment BETWEEN -1 AND 1),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AI Requests log ────────────────────────────────────────────────────────

CREATE TYPE public.ai_request_type AS ENUM (
  'topic_suggestion',
  'reply_draft',
  'conversation_analysis'
);

CREATE TABLE IF NOT EXISTS public.ai_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  request_type    public.ai_request_type NOT NULL,
  prompt          TEXT NOT NULL,
  response        TEXT,
  provider        TEXT NOT NULL DEFAULT 'claude', -- 'claude' | 'groq'
  latency_ms      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_conversations_user_id
  ON public.conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_sent_at
  ON public.messages(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id
  ON public.ai_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_requests_created_at
  ON public.ai_requests(created_at DESC);

-- ── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests    ENABLE ROW LEVEL SECURITY;

-- profiles: users can only read/write their own profile
CREATE POLICY "profiles: owner access" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- conversations: users can only access their own
CREATE POLICY "conversations: owner access" ON public.conversations
  FOR ALL USING (auth.uid() = user_id);

-- messages: users can access messages in their conversations
CREATE POLICY "messages: owner via conversation" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- ai_requests: users can only see their own
CREATE POLICY "ai_requests: owner access" ON public.ai_requests
  FOR ALL USING (auth.uid() = user_id);

-- ── updated_at trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
