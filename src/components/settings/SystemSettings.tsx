import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ThemeSwitcher } from '../common/ThemeSwitcher';
import {
  CANONICAL_SUPABASE_PROJECT_REF,
  CANONICAL_SUPABASE_URL,
  REQUIRED_SUPABASE_TABLES,
} from '../../lib/supabaseHelpers';
import {
  Settings,
  Database,
  Cpu,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  FileCode,
  Download,
  Key,
  Eye,
  EyeOff,
  Palette,
  Activity,
  HardDrive,
  Lock,
  LogIn,
  LogOut,
  UserPlus,
  MailQuestion,
  AlertTriangle,
  Wifi,
  Terminal,
  Trash2,
} from 'lucide-react';

type AuthFormMode = 'login' | 'register' | 'forgot';

const COMPLETE_ENTERPRISE_SQL = `-- ==============================================================================
-- SMART AI DATA ANALYST DASHBOARD - COMPLETE ENTERPRISE DATABASE SCHEMA & RLS
-- Target Project: https://hbfjcqqiqajwbnnoittc.supabase.co (hbfjcqqiqajwbnnoittc)
-- Safe & Idempotent DDL (CREATE IF NOT EXISTS + DROP/CREATE POLICIES)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
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

-- 2. DATASETS
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

-- 3. DATASET FILES
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

-- 4. DATASET SHEETS
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

-- 5. ANALYSIS RESULTS
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

-- 6. AI CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New AI Analysis Session',
    model_used TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. AI MESSAGES
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    data_sources JSONB DEFAULT '[]'::jsonb,
    charts_suggested JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. FORECASTS
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

-- 9. REPORTS
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

-- 10. ACTIVITY LOGS
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

-- 11. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- INDEXES
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

-- GRANTS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles,
  public.datasets,
  public.dataset_files,
  public.dataset_sheets,
  public.analysis_results,
  public.ai_conversations,
  public.ai_messages,
  public.forecasts,
  public.reports,
  public.activity_logs,
  public.system_settings
TO authenticated;
GRANT SELECT ON public.system_settings TO anon;

-- ENABLE RLS
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

-- HELPER & PROFILE SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, company)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    'user',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'company', ''), 'Enterprise Organization')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES (IDEMPOTENT)
DROP POLICY IF EXISTS "Users can view own profile or Admin all" ON public.profiles;
CREATE POLICY "Users can view own profile or Admin all" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id AND role = 'user');

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
  );

DROP POLICY IF EXISTS "Users manage own datasets" ON public.datasets;
CREATE POLICY "Users manage own datasets" ON public.datasets
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users access own dataset files" ON public.dataset_files;
CREATE POLICY "Users access own dataset files" ON public.dataset_files
  FOR ALL USING (auth.uid() = uploaded_by OR public.is_admin())
  WITH CHECK (auth.uid() = uploaded_by OR public.is_admin());

DROP POLICY IF EXISTS "Users access own dataset sheets" ON public.dataset_sheets;
CREATE POLICY "Users access own dataset sheets" ON public.dataset_sheets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.datasets
      WHERE datasets.id = dataset_sheets.dataset_id
      AND (datasets.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users manage own analysis results" ON public.analysis_results;
CREATE POLICY "Users manage own analysis results" ON public.analysis_results
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users manage own conversations" ON public.ai_conversations;
CREATE POLICY "Users manage own conversations" ON public.ai_conversations
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users manage own messages" ON public.ai_messages;
CREATE POLICY "Users manage own messages" ON public.ai_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND (ai_conversations.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users manage own forecasts" ON public.forecasts;
CREATE POLICY "Users manage own forecasts" ON public.forecasts
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users manage own reports" ON public.reports;
CREATE POLICY "Users manage own reports" ON public.reports
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users view own activity logs" ON public.activity_logs;
CREATE POLICY "Users view own activity logs" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users insert activity logs" ON public.activity_logs;
CREATE POLICY "Authenticated users insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public system settings readable" ON public.system_settings;
CREATE POLICY "Public system settings readable" ON public.system_settings
  FOR SELECT USING (is_public = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage system settings" ON public.system_settings;
CREATE POLICY "Admins manage system settings" ON public.system_settings
  FOR ALL USING (public.is_admin());

INSERT INTO public.system_settings (setting_key, setting_value, description, is_public)
VALUES (
  'enterprise_connectivity',
  jsonb_build_object('project_ref', 'hbfjcqqiqajwbnnoittc', 'storage_bucket', 'datasets', 'rls_enforced', true),
  'Canonical Supabase connectivity health verification record',
  true
)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value, is_public = true, updated_at = timezone('utc'::text, now());

-- PRIVATE STORAGE BUCKET & OWNER-SCOPED OBJECT RLS
INSERT INTO storage.buckets (id, name, public)
VALUES ('datasets', 'datasets', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users read own dataset objects" ON storage.objects;
CREATE POLICY "Users read own dataset objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'datasets' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

DROP POLICY IF EXISTS "Users upload own dataset objects" ON storage.objects;
CREATE POLICY "Users upload own dataset objects" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'datasets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own dataset objects" ON storage.objects;
CREATE POLICY "Users update own dataset objects" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'datasets' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

DROP POLICY IF EXISTS "Users delete own dataset objects" ON storage.objects;
CREATE POLICY "Users delete own dataset objects" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'datasets' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
`;

function formatTimestamp(iso?: string | null): string {
  if (!iso) return 'Belum Pernah';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getStatusColor(status: string): string {
  if (status === 'CONNECTED' || status === 'OK' || status === 'READY' || status === 'HEALTHY') {
    return 'var(--color-success)';
  }
  if (
    status === 'CONNECTING' ||
    status === 'RECONNECTING' ||
    status === 'WARNING' ||
    status === 'AUTH_REQUIRED' ||
    status === 'SETUP_REQUIRED' ||
    status === 'DEGRADED'
  ) {
    return 'var(--color-warning)';
  }
  if (
    status === 'DISCONNECTED' ||
    status === 'AUTHENTICATION ERROR' ||
    status === 'DATABASE ERROR' ||
    status === 'ERROR' ||
    status === 'MISSING_TABLE' ||
    status === 'OFFLINE'
  ) {
    return 'var(--color-danger)';
  }
  return 'var(--text-secondary)';
}

export const SystemSettings: React.FC = () => {
  const {
    currentUser,
    supabaseConnected,
    supabaseTablesReady,
    supabaseConfig,
    supabaseLatency,
    supabaseConnectionStatus,
    supabaseHealth,
    lastSuccessfulConnection,
    lastSupabaseError,
    supabaseTechLogs,
    supabaseAuthenticated,
    isPasswordRecoveryMode,
    isSyncing,
    isCheckingHealth,
    updateSupabaseCredentials,
    disconnectSupabase,
    syncWithSupabase,
    runSupabaseConnectionTest,
    refreshSupabaseConnection,
    checkSupabaseDatabaseOnly,
    checkSupabaseAuthOnly,
    checkSupabaseStorageOnly,
    clearTechLogs,
    loginSupabase,
    registerSupabase,
    logoutSupabase,
    forgotPasswordSupabase,
    resetPasswordSupabase,
    addToast,
  } = useApp();

  const [inputUrl, setInputUrl] = useState(supabaseConfig.url || CANONICAL_SUPABASE_URL);
  const [inputAnonKey, setInputAnonKey] = useState(supabaseConfig.anonKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Supabase Auth Form State
  const [authMode, setAuthMode] = useState<AuthFormMode>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authCompany, setAuthCompany] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputAnonKey.trim()) {
      addToast('warning', 'Input Tidak Lengkap', 'URL dan Publishable / Anon Key Supabase wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateSupabaseCredentials(inputUrl.trim(), inputAnonKey.trim());
      if (result.success) {
        setShowConfigModal(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);

    if (authMode === 'forgot') {
      if (!authEmail.trim()) {
        setAuthFeedback({ type: 'error', text: 'Masukkan alamat email akun Supabase Anda.' });
        return;
      }
      setIsAuthSubmitting(true);
      try {
        const res = await forgotPasswordSupabase(authEmail.trim());
        setAuthFeedback({ type: res.success ? 'success' : 'error', text: res.message });
      } finally {
        setIsAuthSubmitting(false);
      }
      return;
    }

    if (!authEmail.trim() || !authPassword) {
      setAuthFeedback({ type: 'error', text: 'Email dan password wajib diisi.' });
      return;
    }

    setIsAuthSubmitting(true);
    try {
      if (authMode === 'login') {
        const res = await loginSupabase(authEmail.trim(), authPassword);
        setAuthFeedback({ type: res.success ? 'success' : 'error', text: res.message });
        if (res.success) {
          setAuthPassword('');
        }
      } else {
        const res = await registerSupabase(
          authEmail.trim(),
          authPassword,
          authFullName.trim() || authEmail.split('@')[0],
          authCompany.trim() || 'Enterprise Organization'
        );
        setAuthFeedback({
          type: res.success ? (res.requiresEmailConfirmation ? 'info' : 'success') : 'error',
          text: res.message,
        });
        if (res.success) {
          setAuthPassword('');
        }
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryNewPassword.length < 8) {
      setAuthFeedback({ type: 'error', text: 'Password baru minimal 8 karakter.' });
      return;
    }
    setIsAuthSubmitting(true);
    try {
      const res = await resetPasswordSupabase(recoveryNewPassword);
      setAuthFeedback({ type: res.success ? 'success' : 'error', text: res.message });
      if (res.success) setRecoveryNewPassword('');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const copyMigrationSql = () => {
    navigator.clipboard.writeText(COMPLETE_ENTERPRISE_SQL);
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 2000);
    addToast('success', 'SQL Schema 11 Tabel Disalin', 'Tempelkan dan eksekusi di SQL Editor Supabase Dashboard.');
  };

  const downloadSqlMigrationFile = () => {
    const blob = new Blob([COMPLETE_ENTERPRISE_SQL], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'supabase_enterprise_complete_migration.sql');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('success', 'File SQL Didownload', 'supabase_enterprise_complete_migration.sql siap dieksekusi.');
  };

  const envConfigLabel = supabaseConfig.envValidation.isConfigured
    ? supabaseConfig.envValidation.source === 'custom_storage'
      ? 'Valid (Custom Override)'
      : 'Valid (Env Vars)'
    : 'Belum Lengkap / Perlu Konfigurasi';

  const dbCheck = supabaseHealth?.databaseCheck;
  const authCheck = supabaseHealth?.authCheck;
  const storageCheck = supabaseHealth?.storageCheck;

  const dbStatusSummary = dbCheck
    ? `${dbCheck.status} — ${dbCheck.existingCount}/${dbCheck.totalTables} tabel terdeteksi (${dbCheck.accessibleCount} akses siap, ${dbCheck.latencyMs}ms)`
    : supabaseTablesReady
    ? 'OK — 11/11 Tabel Siap'
    : 'Menunggu Pemeriksaan';

  const authStatusSummary = authCheck
    ? authCheck.authenticated
      ? `Terautentikasi (${authCheck.email || currentUser.email} · ${(authCheck.role || 'user').toUpperCase()})`
      : `Mode Anonim / Lokal (${authCheck.status})`
    : supabaseAuthenticated
    ? `Terautentikasi (${currentUser.email})`
    : 'Belum Login Supabase Auth';

  const storageStatusSummary = storageCheck
    ? `${storageCheck.status} — Bucket '${storageCheck.bucketName}' (${
        storageCheck.canListOwnFolder
          ? `${storageCheck.objectCount} objek di folder Anda`
          : storageCheck.bucketAccessible
          ? 'Memerlukan login Auth'
          : 'Perlu inisialisasi bucket'
      })`
    : "Bucket 'datasets' (Private RLS)";

  const systemHealthBadge = supabaseHealth?.systemHealth || (supabaseConnected ? 'HEALTHY' : 'OFFLINE');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <Settings className="w-5 h-5 text-[var(--color-primary)]" />
          <span>Konfigurasi Sistem & Integrasi Enterprise</span>
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Pengaturan tampilan tema, konektivitas database Supabase PostgreSQL, autentikasi RLS, private storage, dan Gemini AI Engine.
        </p>
      </div>

      {/* Theme Appearance Card (Preserved) */}
      <div className="p-5 rounded-2xl surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl text-[var(--color-primary)]"
            style={{ backgroundColor: 'var(--bg-caramel-soft)' }}
          >
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-main)]">Tema & Tampilan Antarmuka</h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Pilih Light Mode (Brown Cream), Dark Mode (Dark Brown), atau ikuti preferensi sistem perangkat Anda.
            </p>
          </div>
        </div>
        <ThemeSwitcher showLabels />
      </div>

      {/* Enterprise Supabase Status & 10 Indicators Dashboard */}
      <div className="p-6 rounded-2xl surface-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{
                backgroundColor: supabaseConnected ? 'var(--bg-success-soft)' : 'var(--bg-danger-soft)',
                color: getStatusColor(supabaseConnectionStatus),
              }}
            >
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">
                Status Koneksi & Diagnostik Enterprise Supabase
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Monitoring stabilitas API Gateway, PostgreSQL RLS (11 Tabel), Supabase Auth, dan Private Storage Bucket.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono border border-[var(--border-color)] surface-secondary tabular-nums"
              style={{ color: getStatusColor(supabaseConnectionStatus) }}
            >
              {supabaseConnectionStatus}
              {supabaseLatency !== undefined ? ` · ${supabaseLatency}ms` : ''}
            </span>
            <span
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono border border-[var(--border-color)] surface-secondary"
              style={{ color: getStatusColor(systemHealthBadge) }}
            >
              {systemHealthBadge}
            </span>
          </div>
        </div>

        {/* 10 Required Indicators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl surface-secondary flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
              1. Project URL
            </span>
            <span className="font-mono font-semibold text-[var(--text-main)] truncate">
              {supabaseConfig.url || CANONICAL_SUPABASE_URL}
            </span>
          </div>

          <div className="p-3 rounded-xl surface-secondary flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
              2. Project Ref
            </span>
            <span className="font-mono font-semibold text-[var(--color-primary)]">
              {supabaseConfig.projectRef || CANONICAL_SUPABASE_PROJECT_REF}
            </span>
          </div>

          <div className="p-3 rounded-xl surface-secondary flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
              3. Connection Status
            </span>
            <span className="font-mono font-bold" style={{ color: getStatusColor(supabaseConnectionStatus) }}>
              {supabaseConnectionStatus}
            </span>
          </div>

          <div className="p-3 rounded-xl surface-secondary flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
              4. Authentication Status
            </span>
            <span
              className="font-semibold"
              style={{ color: getStatusColor(authCheck?.status || (supabaseAuthenticated ? 'OK' : 'WARNING')) }}
            >
              {authStatusSummary}
            </span>
          </div>

          <div className="p-3 rounded-xl surface-secondary flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
              5. Database Status
            </span>
            <span className="font-semibold" style={{ color: getStatusColor(dbCheck?.status || 'WARNING') }}>
              {dbStatusSummary}
            </span>
          </div>

          <div className="p-3 rounded-xl surface-secondary flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
              6. Storage Status
            </span>
            <span className="font-semibold" style={{ color: getStatusColor(storageCheck?.status || 'WARNING') }}>
              {storageStatusSummary}
            </span>
          </div>

          <div className="p-3 rounded-xl surface-secondary flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
              7. Last Successful Connection
            </span>
            <span className="font-mono text-[var(--text-main)] tabular-nums">
              {formatTimestamp(lastSuccessfulConnection)}
            </span>
          </div>

          <div className="p-3 rounded-xl surface-secondary flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
              8. Last Error
            </span>
            <span
              className="text-[11px] leading-snug"
              style={{ color: lastSupabaseError ? 'var(--color-danger)' : 'var(--color-success)' }}
            >
              {lastSupabaseError || 'Tidak Ada Error'}
            </span>
          </div>

          <div className="p-3 rounded-xl surface-secondary flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
              9. System Health
            </span>
            <span className="font-mono font-bold" style={{ color: getStatusColor(systemHealthBadge) }}>
              {systemHealthBadge}
            </span>
          </div>

          <div className="p-3 rounded-xl surface-secondary flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
              10. Environment Configuration Status
            </span>
            <span
              className="font-semibold"
              style={{ color: supabaseConfig.envValidation.isConfigured ? 'var(--color-success)' : 'var(--color-danger)' }}
            >
              {envConfigLabel}
            </span>
          </div>
        </div>

        {/* 5 Required Diagnostic Buttons + Credential/Sync Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => runSupabaseConnectionTest()}
            disabled={isCheckingHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] text-xs font-semibold shadow-2xs transition-theme disabled:opacity-50 cursor-pointer"
          >
            <Activity className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-pulse' : ''}`} />
            <span>Test Supabase Connection</span>
          </button>

          <button
            type="button"
            onClick={() => checkSupabaseDatabaseOnly()}
            disabled={isCheckingHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-semibold border border-[var(--border-color)] transition-theme disabled:opacity-50 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Check Database</span>
          </button>

          <button
            type="button"
            onClick={() => checkSupabaseAuthOnly()}
            disabled={isCheckingHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-semibold border border-[var(--border-color)] transition-theme disabled:opacity-50 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Check Authentication</span>
          </button>

          <button
            type="button"
            onClick={() => checkSupabaseStorageOnly()}
            disabled={isCheckingHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-semibold border border-[var(--border-color)] transition-theme disabled:opacity-50 cursor-pointer"
          >
            <HardDrive className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Check Storage</span>
          </button>

          <button
            type="button"
            onClick={() => refreshSupabaseConnection()}
            disabled={isCheckingHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-semibold border border-[var(--border-color)] transition-theme disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
            <span>Refresh Connection</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--color-primary)] text-xs font-semibold border border-[var(--border-color)] transition-theme cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{supabaseConnected ? 'Ubah Kredensial' : 'Hubungkan Supabase'}</span>
          </button>

          {supabaseConnected && (
            <button
              type="button"
              onClick={syncWithSupabase}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-semibold border border-[var(--border-color)] transition-theme disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data'}</span>
            </button>
          )}

          {supabaseConfig.envValidation.source === 'custom_storage' && (
            <button
              type="button"
              onClick={disconnectSupabase}
              className="px-2.5 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--bg-secondary)] text-xs transition-theme cursor-pointer"
            >
              Reset Override Lokal
            </button>
          )}
        </div>

        {/* 11-Table Live Inspection Matrix */}
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--text-main)]">
              Status Pemeriksaan Real-Time 11 Tabel PostgreSQL
            </span>
            <span className="font-mono text-[11px] text-[var(--text-secondary)] tabular-nums">
              {dbCheck ? `${dbCheck.existingCount}/${dbCheck.totalTables} Terdeteksi` : `${REQUIRED_SUPABASE_TABLES.length} Tabel Target`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
            {(dbCheck?.tables || REQUIRED_SUPABASE_TABLES.map(t => ({ table: t, status: 'AUTH_REQUIRED' as const, detail: 'Menunggu check database' }))).map(
              (item) => (
                <div
                  key={item.table}
                  className="px-3 py-2 rounded-lg surface-secondary flex items-center justify-between gap-2 border border-[var(--border-color)]"
                  title={item.detail}
                >
                  <span className="font-mono font-medium text-[var(--text-main)] truncate">
                    public.{item.table}
                  </span>
                  <span
                    className="font-mono font-bold text-[10px] shrink-0"
                    style={{ color: getStatusColor(item.status) }}
                  >
                    {item.status}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Grid: Supabase Authentication Panel + Gemini AI Engine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Supabase Auth Integration Card */}
        <div className="p-6 rounded-2xl surface-card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2.5 rounded-xl"
                style={{
                  backgroundColor: supabaseAuthenticated ? 'var(--bg-success-soft)' : 'var(--bg-caramel-soft)',
                  color: supabaseAuthenticated ? 'var(--color-success)' : 'var(--color-primary)',
                }}
              >
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">Autentikasi Supabase Auth</h3>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Session Persistence, Auto Token Refresh & Sinkronisasi Profil
                </div>
              </div>
            </div>

            <span
              className="text-[11px] font-semibold font-mono"
              style={{ color: supabaseAuthenticated ? 'var(--color-success)' : 'var(--color-warning)' }}
            >
              {supabaseAuthenticated ? 'Authenticated' : 'Anonymous'}
            </span>
          </div>

          {isPasswordRecoveryMode ? (
            <form onSubmit={handleRecoverySubmit} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl surface-secondary text-[var(--color-warning)] font-medium">
                Tautan pemulihan password terdeteksi. Masukkan password baru Anda di bawah ini.
              </div>
              <div>
                <label htmlFor="sb-recovery-pw" className="block font-semibold text-[var(--text-main)] mb-1">
                  Password Baru (Min. 8 karakter)
                </label>
                <input
                  id="sb-recovery-pw"
                  type="password"
                  value={recoveryNewPassword}
                  onChange={(e) => setRecoveryNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isAuthSubmitting}
                className="w-full py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold cursor-pointer"
              >
                {isAuthSubmitting ? 'Memperbarui...' : 'Simpan Password Baru'}
              </button>
            </form>
          ) : supabaseAuthenticated ? (
            <div className="space-y-3">
              <div className="space-y-1.5 text-xs p-3.5 rounded-xl surface-secondary font-mono">
                <div className="text-[var(--text-main)]">
                  Email: <span className="font-bold text-[var(--color-primary)]">{currentUser.email}</span>
                </div>
                <div className="text-[var(--text-main)]">
                  Nama: <span>{currentUser.fullName}</span>
                </div>
                <div className="text-[var(--text-main)]">
                  Role (DB):{' '}
                  <span className="font-bold uppercase" style={{ color: 'var(--color-success)' }}>
                    {currentUser.role}
                  </span>
                </div>
                {authCheck?.tokenExpiresAt && (
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    Token Exp: {formatTimestamp(authCheck.tokenExpiresAt)}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={logoutSupabase}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-danger-soft)] text-[var(--color-danger)] text-xs font-semibold border border-[var(--border-color)] transition-theme cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout dari Supabase Auth</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Auth Mode Switcher */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthFeedback(null);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition-theme cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthFeedback(null);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition-theme cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Daftar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot');
                    setAuthFeedback(null);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition-theme cursor-pointer ${
                    authMode === 'forgot'
                      ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <MailQuestion className="w-3.5 h-3.5" />
                  <span>Reset PW</span>
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-2.5 text-xs">
                {authMode === 'register' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="sb-auth-name" className="block text-[11px] font-semibold text-[var(--text-main)] mb-1">
                        Nama Lengkap
                      </label>
                      <input
                        id="sb-auth-name"
                        type="text"
                        placeholder="Nama Lengkap"
                        value={authFullName}
                        onChange={(e) => setAuthFullName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="sb-auth-comp" className="block text-[11px] font-semibold text-[var(--text-main)] mb-1">
                        Perusahaan / Divisi
                      </label>
                      <input
                        id="sb-auth-comp"
                        type="text"
                        placeholder="Enterprise Org"
                        value={authCompany}
                        onChange={(e) => setAuthCompany(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="sb-auth-email" className="block text-[11px] font-semibold text-[var(--text-main)] mb-1">
                    Email Supabase
                  </label>
                  <input
                    id="sb-auth-email"
                    type="email"
                    placeholder="nama@perusahaan.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)]"
                    required
                  />
                </div>

                {authMode !== 'forgot' && (
                  <div>
                    <label htmlFor="sb-auth-password" className="block text-[11px] font-semibold text-[var(--text-main)] mb-1">
                      Password
                    </label>
                    <input
                      id="sb-auth-password"
                      type="password"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)]"
                      required
                    />
                  </div>
                )}

                {authFeedback && (
                  <div
                    className="p-2.5 rounded-lg text-[11px] font-medium flex items-start gap-1.5 border border-[var(--border-color)]"
                    style={{
                      backgroundColor:
                        authFeedback.type === 'error'
                          ? 'var(--bg-danger-soft)'
                          : authFeedback.type === 'info'
                          ? 'var(--bg-warning-soft)'
                          : 'var(--bg-success-soft)',
                      color:
                        authFeedback.type === 'error'
                          ? 'var(--color-danger)'
                          : authFeedback.type === 'info'
                          ? 'var(--color-warning)'
                          : 'var(--color-success)',
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{authFeedback.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthSubmitting || !supabaseConfig.isConfigured}
                  className="w-full py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold transition-theme disabled:opacity-50 cursor-pointer"
                >
                  {isAuthSubmitting
                    ? 'Memproses...'
                    : authMode === 'login'
                    ? 'Login ke Supabase Auth'
                    : authMode === 'register'
                    ? 'Daftar Akun Baru'
                    : 'Kirim Email Reset Password'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Gemini AI Engine Card (Preserved) */}
        <div className="p-6 rounded-2xl surface-card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2.5 rounded-xl text-[var(--color-primary)]"
                style={{ backgroundColor: 'var(--bg-primary-soft)' }}
              >
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">Google Gemini AI Engine</h3>
                <div className="text-[11px] text-[var(--text-secondary)]">Server-Side Multi-Modal Inference</div>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-[var(--color-primary)] font-mono">
              gemini-3.8-flash
            </span>
          </div>

          <div className="space-y-2 text-xs text-[var(--text-main)] font-mono p-3.5 rounded-xl surface-secondary">
            <div>
              Model: <span className="text-[var(--color-primary)]">gemini-3.8-flash</span>
            </div>
            <div>
              Server Proxy: <span style={{ color: 'var(--color-success)' }}>Mounted at /api/ai/*</span>
            </div>
            <div>
              Client Key Exposure:{' '}
              <span className="font-bold" style={{ color: 'var(--color-success)' }}>
                Zero (100% Server Protected)
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed pt-1">
            API key dikelola secara aman di backend Express melalui variable `GEMINI_API_KEY` tanpa pernah diekspos ke browser pengguna.
          </div>
        </div>
      </div>

      {/* Technical Supabase Health Logs Card */}
      <div className="p-6 rounded-2xl surface-card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Log Teknis Koneksi & Diagnostik Supabase (Tersanitasi)</span>
          </h3>
          <button
            type="button"
            onClick={clearTechLogs}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-secondary)] hover:text-[var(--text-main)] text-[11px] font-medium border border-[var(--border-color)] cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Bersihkan Log</span>
          </button>
        </div>

        <div className="surface-secondary rounded-xl p-3 max-h-44 overflow-y-auto font-mono text-[11px] space-y-1.5">
          {supabaseTechLogs.length === 0 ? (
            <div className="text-[var(--text-secondary)]">Belum ada log aktivitas koneksi tersimpan.</div>
          ) : (
            supabaseTechLogs.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 leading-relaxed border-b border-[var(--border-color)]/40 pb-1 last:border-b-0">
                <span className="text-[var(--text-secondary)] shrink-0 tabular-nums">
                  {new Date(entry.timestamp).toLocaleTimeString('id-ID')}
                </span>
                <span className="font-bold text-[var(--color-primary)] shrink-0">[{entry.category}]</span>
                <span
                  className="break-words"
                  style={{
                    color:
                      entry.level === 'error'
                        ? 'var(--color-danger)'
                        : entry.level === 'warning'
                        ? 'var(--color-warning)'
                        : entry.level === 'success'
                        ? 'var(--color-success)'
                        : 'var(--text-main)',
                  }}
                >
                  {entry.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SQL Migration & Schema Setup Card */}
      <div className="p-6 rounded-2xl surface-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Supabase SQL Migration & Database DDL (11 Tabel Lengkap + Storage RLS)</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Skrip DDL idempoten lengkap untuk 11 tabel PostgreSQL, GRANT authenticated, trigger handle_new_user(), kebijakan anti-eskalasi role, dan private bucket &apos;datasets&apos;.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={copyMigrationSql}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--color-primary)] text-xs font-semibold border border-[var(--border-color)] transition-theme cursor-pointer"
            >
              {copiedMigration ? (
                <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedMigration ? 'Tersalin!' : 'Copy SQL Schema'}</span>
            </button>

            <button
              type="button"
              onClick={downloadSqlMigrationFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-semibold border border-[var(--border-color)] transition-theme cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
              <span>Download .SQL</span>
            </button>
          </div>
        </div>

        <div className="surface-secondary p-4 rounded-xl font-mono text-[11px] text-[var(--text-main)] max-h-48 overflow-y-auto space-y-0.5">
          <div className="text-[var(--text-secondary)]">-- Struktur 11 Tabel Utama PostgreSQL SMART AI + Trigger + Storage RLS:</div>
          <div className="text-[var(--color-primary)] mt-1 font-semibold">
            1. public.profiles (Akun, Sinkronisasi auth.users & RBAC Admin/User)
          </div>
          <div>2. public.datasets (Metadata & Status Dataset)</div>
          <div>3. public.dataset_files (Metadata Private Storage Bucket &apos;datasets&apos;)</div>
          <div>4. public.dataset_sheets (Multi-Sheet Excel Support)</div>
          <div>5. public.analysis_results (Hasil Olah Data & Metrik)</div>
          <div>6. public.ai_conversations (Sesi Chat Gemini)</div>
          <div>7. public.ai_messages (Percakapan & Grounded Evidence)</div>
          <div>8. public.forecasts (Hasil Peramalan Time-Series & Metrik)</div>
          <div>9. public.reports (Executive Summary Formal)</div>
          <div>10. public.activity_logs (Audit Trail Operasional)</div>
          <div>11. public.system_settings (Konfigurasi Global Enterprise)</div>
        </div>
      </div>

      {/* Security Architecture Checklist (Preserved) */}
      <div className="p-6 rounded-2xl surface-card space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
          <span>Kepatuhan Standar Keamanan & Proteksi Data (Enterprise Compliance)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl surface-secondary flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
            <div>
              <div className="font-semibold text-[var(--text-main)]">No Client Key Exposure</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Gemini API key tersimpan di backend secret manager; browser hanya memakai Anon Key.
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl surface-secondary flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
            <div>
              <div className="font-semibold text-[var(--text-main)]">PostgreSQL Row Level Security</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Isolasi data & bucket storage antar pengguna terjamin via RLS & auth.uid().
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl surface-secondary flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
            <div>
              <div className="font-semibold text-[var(--text-main)]">Non-Destructive Cleaning</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Data asli tidak pernah diubah secara langsung.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Configuration Modal (Canonical-Pinned) */}
      {showConfigModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-supabase-title"
          className="fixed inset-0 z-50 bg-[#211C19]/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="surface-card rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                <h2 id="modal-supabase-title" className="text-base font-bold text-[var(--text-main)]">
                  Konfigurasi Kredensial Supabase ({CANONICAL_SUPABASE_PROJECT_REF})
                </h2>
              </div>
              <button
                type="button"
                aria-label="Tutup Modal Supabase"
                onClick={() => setShowConfigModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-main)] text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs">
              <div>
                <label htmlFor="sb-url" className="block text-[var(--text-main)] font-semibold mb-1">
                  Supabase Project URL (Dikunci ke Project Utama)
                </label>
                <input
                  id="sb-url"
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-caramel)] font-mono"
                  required
                />
                <span className="text-[10px] text-[var(--text-secondary)] mt-1 block">
                  Harus cocok dengan {CANONICAL_SUPABASE_URL}
                </span>
              </div>

              <div>
                <label htmlFor="sb-anon" className="block text-[var(--text-main)] font-semibold mb-1">
                  Supabase Publishable / Anon Key
                </label>
                <div className="relative">
                  <input
                    id="sb-anon"
                    type={showKey ? 'text' : 'password'}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={inputAnonKey}
                    onChange={(e) => setInputAnonKey(e.target.value)}
                    className="w-full px-3 py-2 pr-9 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-caramel)] font-mono text-xs"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showKey ? 'Sembunyikan Key' : 'Tampilkan Key'}
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-2.5 text-[var(--text-secondary)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-[var(--text-secondary)] mt-1 block">
                  Jangan pernah memasukkan service_role key ke browser frontend.
                </span>
              </div>

              <div className="p-3 rounded-xl surface-secondary text-[11px] text-[var(--text-secondary)] space-y-1">
                <div className="font-semibold text-[var(--color-primary)] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
                  <span>Koneksi Langsung & Aman</span>
                </div>
                <div>
                  Aplikasi terhubung langsung ke project Supabase terverifikasi ({CANONICAL_SUPABASE_PROJECT_REF}) melalui SSL/TLS tanpa mengekspos kunci privat server.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] border border-[var(--border-color)] font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold transition-theme disabled:opacity-50 cursor-pointer"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSaving ? 'Mengetes Koneksi...' : 'Verifikasi & Simpan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
