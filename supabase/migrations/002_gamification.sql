-- Migration: 002_gamification.sql
-- Description: Gamification tables — bond levels, streaks, badges, duo sessions
-- Depends on: 001_init.sql

-- ── User Stats (denormalized for fast reads) ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id                UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  messages_count         INTEGER NOT NULL DEFAULT 0 CHECK (messages_count >= 0),
  streak_days            INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
  duo_sessions_count     INTEGER NOT NULL DEFAULT 0 CHECK (duo_sessions_count >= 0),
  topic_categories_used  INTEGER NOT NULL DEFAULT 0 CHECK (topic_categories_used >= 0),
  ai_requests_count      INTEGER NOT NULL DEFAULT 0 CHECK (ai_requests_count >= 0),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Conversation Log Dates (for streak calculation) ───────────────────────

CREATE TABLE IF NOT EXISTS public.conversation_log_dates (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logged_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, logged_at)  -- one entry per user per calendar day
);

-- ── Bond Score Snapshots ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bond_snapshots (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reply_consistency_score  NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (reply_consistency_score BETWEEN 0 AND 100),
  topic_diversity_score    NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (topic_diversity_score BETWEEN 0 AND 100),
  message_depth_score      NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (message_depth_score BETWEEN 0 AND 100),
  duo_features_score       NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (duo_features_score BETWEEN 0 AND 100),
  streak_bonus             NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (streak_bonus BETWEEN 0 AND 100),
  bond_level               NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (bond_level BETWEEN 0 AND 100),
  bond_label               TEXT NOT NULL,
  snapshotted_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Badge Definitions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id          TEXT PRIMARY KEY,  -- e.g. 'first_message', 'streak_7'
  name_ja     TEXT NOT NULL,     -- Japanese display name
  description TEXT,
  icon_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed badge definitions
INSERT INTO public.badge_definitions (id, name_ja, description) VALUES
  ('first_message',  '最初のメッセージ',     '初めてメッセージを送りました'),
  ('streak_3',       '3日連続',             '3日連続でログインしました'),
  ('streak_7',       '1週間連続',           '7日連続でログインしました'),
  ('streak_30',      '30日連続',            '30日連続でログインしました'),
  ('duo_first',      '初めてのデュオ',       'パートナーと初めてDuo機能を使いました'),
  ('topic_master',   'トピックマスター',     '10種類以上のトピックを使いました'),
  ('first_ai_use',   '初めてのAI活用',       '初めてAI返信候補を使いました')
ON CONFLICT (id) DO NOTHING;

-- ── Earned Badges (user <-> badge many-to-many) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_badges (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id   TEXT NOT NULL REFERENCES public.badge_definitions(id),
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)  -- a badge can only be earned once
);

-- ── Duo Sessions ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.duo_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiator_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_code    TEXT NOT NULL,      -- shareable join code
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.duo_questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES public.duo_sessions(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  answer_me       TEXT,
  answer_partner  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_stats_user_id
  ON public.user_stats(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_log_dates_user_id
  ON public.conversation_log_dates(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_log_dates_logged_at
  ON public.conversation_log_dates(logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_bond_snapshots_user_id
  ON public.bond_snapshots(user_id);

CREATE INDEX IF NOT EXISTS idx_bond_snapshots_snapshotted_at
  ON public.bond_snapshots(snapshotted_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id
  ON public.user_badges(user_id);

CREATE INDEX IF NOT EXISTS idx_duo_sessions_initiator_id
  ON public.duo_sessions(initiator_id);

-- ── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.user_stats             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_log_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bond_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_definitions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duo_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duo_questions          ENABLE ROW LEVEL SECURITY;

-- user_stats: owner only
CREATE POLICY "user_stats: owner access" ON public.user_stats
  FOR ALL USING (auth.uid() = user_id);

-- conversation_log_dates: owner only
CREATE POLICY "conversation_log_dates: owner access" ON public.conversation_log_dates
  FOR ALL USING (auth.uid() = user_id);

-- bond_snapshots: owner only
CREATE POLICY "bond_snapshots: owner access" ON public.bond_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- badge_definitions: public read, no write from client
CREATE POLICY "badge_definitions: public read" ON public.badge_definitions
  FOR SELECT USING (true);

-- user_badges: owner read/write
CREATE POLICY "user_badges: owner access" ON public.user_badges
  FOR ALL USING (auth.uid() = user_id);

-- duo_sessions: initiator can see their own sessions
CREATE POLICY "duo_sessions: initiator access" ON public.duo_sessions
  FOR ALL USING (auth.uid() = initiator_id);

-- duo_questions: accessible through session ownership
CREATE POLICY "duo_questions: session owner access" ON public.duo_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.duo_sessions ds
      WHERE ds.id = duo_questions.session_id
        AND ds.initiator_id = auth.uid()
    )
  );

-- ── updated_at trigger for user_stats ─────────────────────────────────────

CREATE TRIGGER user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
