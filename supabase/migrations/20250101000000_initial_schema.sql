-- ==============================================================================
-- SMART AI DATA ANALYST DASHBOARD - COMPLETE DATABASE SCHEMA & RLS
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    avatar_url TEXT,
    company TEXT DEFAULT 'Enterprise Organization',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. DATASETS TABLE
CREATE TABLE IF NOT EXISTS public.datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    row_count INTEGER NOT NULL DEFAULT 0,
    col_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'error', 'archived')),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_cleaned BOOLEAN DEFAULT false,
    original_dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. DATASET FILES TABLE
CREATE TABLE IF NOT EXISTS public.dataset_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'datasets',
    original_name TEXT NOT NULL,
    mime_type TEXT,
    file_size_bytes BIGINT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. DATASET SHEETS TABLE (For Excel multi-sheet support)
CREATE TABLE IF NOT EXISTS public.dataset_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    sheet_name TEXT NOT NULL,
    sheet_index INTEGER NOT NULL DEFAULT 0,
    row_count INTEGER NOT NULL DEFAULT 0,
    col_count INTEGER NOT NULL DEFAULT 0,
    sample_data JSONB DEFAULT '[]'::jsonb,
    schema JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ANALYSIS RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    key_findings JSONB DEFAULT '[]'::jsonb,
    correlations JSONB DEFAULT '[]'::jsonb,
    anomalies JSONB DEFAULT '[]'::jsonb,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. AI CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New AI Analysis Session',
    model_used TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. AI MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    data_sources JSONB DEFAULT '[]'::jsonb,
    charts_suggested JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. FORECASTS TABLE
CREATE TABLE IF NOT EXISTS public.forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date_column TEXT NOT NULL,
    target_column TEXT NOT NULL,
    method TEXT NOT NULL,
    horizon TEXT NOT NULL,
    historical_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    forecast_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    evaluation JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    report_type TEXT NOT NULL DEFAULT 'executive_summary',
    executive_summary TEXT,
    sections JSONB DEFAULT '[]'::jsonb,
    metrics_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON public.datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON public.datasets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dataset_files_dataset_id ON public.dataset_files(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_sheets_dataset_id ON public.dataset_sheets(dataset_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_dataset_id ON public.analysis_results(dataset_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_dataset_id ON public.forecasts(dataset_id);
CREATE INDEX IF NOT EXISTS idx_reports_dataset_id ON public.reports(dataset_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: Is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view & update their own profile; Admins can view all
CREATE POLICY "Users can view own profile or Admin all" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Datasets: Users manage their own datasets; Admins can inspect all
CREATE POLICY "Users manage own datasets" ON public.datasets
    FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Dataset files: Linked to dataset owner
CREATE POLICY "Users access own dataset files" ON public.dataset_files
    FOR ALL USING (auth.uid() = uploaded_by OR public.is_admin());

-- Dataset sheets: Accessible if dataset owner
CREATE POLICY "Users access own dataset sheets" ON public.dataset_sheets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.datasets
            WHERE datasets.id = dataset_sheets.dataset_id
            AND (datasets.user_id = auth.uid() OR public.is_admin())
        )
    );

-- Analysis results
CREATE POLICY "Users manage own analysis results" ON public.analysis_results
    FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- AI Conversations & Messages
CREATE POLICY "Users manage own conversations" ON public.ai_conversations
    FOR ALL USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users manage own messages" ON public.ai_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE ai_conversations.id = ai_messages.conversation_id
            AND (ai_conversations.user_id = auth.uid() OR public.is_admin())
        )
    );

-- Forecasts & Reports
CREATE POLICY "Users manage own forecasts" ON public.forecasts
    FOR ALL USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users manage own reports" ON public.reports
    FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Activity Logs: Users view own activity, Admins view all; Anyone authenticated can insert
CREATE POLICY "Users view own activity logs" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Authenticated users insert activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- System Settings: Public settings readable by all; Admins can update
CREATE POLICY "Public system settings readable" ON public.system_settings
    FOR SELECT USING (is_public = true OR public.is_admin());

CREATE POLICY "Admins manage system settings" ON public.system_settings
    FOR ALL USING (public.is_admin());

-- Storage bucket configuration for datasets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('datasets', 'datasets', false)
ON CONFLICT (id) DO NOTHING;
