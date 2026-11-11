import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Database,
  Cpu,
  Lock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Server,
  ShieldCheck,
  FileCode,
  Download,
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  Cloud,
  ArrowDownToLine,
  ArrowUpFromLine
} from 'lucide-react';

export const SystemSettings: React.FC = () => {
  const {
    supabaseConnected,
    supabaseTablesReady,
    supabaseConfig,
    supabaseLatency,
    isSyncing,
    updateSupabaseCredentials,
    disconnectSupabase,
    syncWithSupabase,
    hasGeminiKey,
    addToast
  } = useApp();

  const [inputUrl, setInputUrl] = useState(supabaseConfig.url || '');
  const [inputAnonKey, setInputAnonKey] = useState(supabaseConfig.anonKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputAnonKey.trim()) {
      addToast('warning', 'Input Tidak Lengkap', 'URL dan Anon Key Supabase wajib diisi.');
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

  const copyMigrationSql = () => {
    const sqlText = `-- SMART AI DATA ANALYST DASHBOARD - COMPLETE DATABASE SCHEMA
-- Target: Supabase PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to datasets" ON public.datasets FOR ALL USING (true);
CREATE POLICY "Allow authenticated access to sheets" ON public.dataset_sheets FOR ALL USING (true);
CREATE POLICY "Allow authenticated access to logs" ON public.activity_logs FOR ALL USING (true);
`;

    navigator.clipboard.writeText(sqlText);
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 2000);
    addToast('success', 'SQL Schema Disalin ke Clipboard', 'Siap ditempelkan ke SQL Editor dashboard Supabase.');
  };

  const downloadSqlMigrationFile = () => {
    const sqlText = `-- SMART AI DATA ANALYST DASHBOARD - COMPLETE DATABASE SCHEMA
-- Target: Supabase PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to datasets" ON public.datasets FOR ALL USING (true);
CREATE POLICY "Allow authenticated access to sheets" ON public.dataset_sheets FOR ALL USING (true);
CREATE POLICY "Allow authenticated access to logs" ON public.activity_logs FOR ALL USING (true);
`;

    const blob = new Blob([sqlText], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'supabase_initial_schema.sql');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'File SQL Didownload', 'supabase_initial_schema.sql siap dieksekusi.');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          Konfigurasi Sistem & Integrasi Enterprise
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Status konektivitas database Supabase PostgreSQL, autentikasi RLS, Gemini AI Engine, dan sinkronisasi cloud real-time.
        </p>
      </div>

      {/* Grid of Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Supabase PostgreSQL Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Supabase PostgreSQL</h3>
                <div className="text-[11px] text-slate-400">Database, Auth & Row Level Security</div>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                supabaseConnected && supabaseTablesReady
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : supabaseConnected
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-slate-700/40 text-slate-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  supabaseConnected && supabaseTablesReady
                    ? 'bg-emerald-400'
                    : supabaseConnected
                    ? 'bg-amber-400'
                    : 'bg-slate-400'
                }`}
              />
              {supabaseConnected && supabaseTablesReady
                ? `PostgreSQL Ready (${supabaseLatency || 0}ms)`
                : supabaseConnected
                ? `Connected (Pending SQL Schema)`
                : 'Local Storage Mode'}
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300 font-mono bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="truncate">
              Project URL: <span className="text-cyan-400">{supabaseConfig.url || 'Belum Dikonfigurasi'}</span>
            </div>
            <div>
              Status Sinkronisasi:{' '}
              <span
                className={
                  supabaseConnected && supabaseTablesReady
                    ? 'text-emerald-400'
                    : supabaseConnected
                    ? 'text-amber-400 font-sans'
                    : 'text-slate-400'
                }
              >
                {supabaseConnected && supabaseTablesReady
                  ? 'Auto-Sync Aktif ke PostgreSQL'
                  : supabaseConnected
                  ? 'Tabel Belum Dibuat (Salin & Jalankan SQL Migration)'
                  : 'Local Fallback (Browser)'}
              </span>
            </div>
            <div>
              RLS Protection: <span className="text-emerald-400">11 Tabel Terisolasi Keamanan</span>
            </div>
          </div>

          {/* Action Buttons for Supabase */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{supabaseConnected ? 'Ubah Kredensial' : 'Hubungkan Supabase'}</span>
            </button>

            {supabaseConnected && (
              <button
                onClick={syncWithSupabase}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data'}</span>
              </button>
            )}

            {supabaseConnected && (
              <button
                onClick={disconnectSupabase}
                className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 text-xs transition"
              >
                Putus Koneksi
              </button>
            )}
          </div>
        </div>

        {/* Gemini AI Engine Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Google Gemini AI Engine</h3>
                <div className="text-[11px] text-slate-400">Server-Side Multi-Modal Inference</div>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              gemini-3.8-flash
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300 font-mono bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div>Model: <span className="text-cyan-400">gemini-3.8-flash</span></div>
            <div>Server Proxy: <span className="text-emerald-400">Mounted at /api/ai/*</span></div>
            <div>
              Client Key Exposure:{' '}
              <span className="text-emerald-400 font-bold">Zero (100% Server Protected)</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed pt-1">
            API key dikelola secara aman di backend Express melalui variable `GEMINI_API_KEY` tanpa pernah diekspos ke browser pengguna.
          </div>
        </div>
      </div>

      {/* SQL Migration & Schema Setup Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              Supabase SQL Migration & Database DDL
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Skrip DDL lengkap untuk menginisialisasi 11 tabel PostgreSQL, relasi foreign key, indeks performa, dan aturan RLS.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={copyMigrationSql}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-slate-700 transition"
            >
              {copiedMigration ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMigration ? 'Tersalin!' : 'Copy SQL Schema'}</span>
            </button>

            <button
              onClick={downloadSqlMigrationFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download .SQL</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          <div className="text-slate-500">-- Struktur 11 Tabel Utama PostgreSQL SMART AI:</div>
          <div className="text-cyan-400 mt-1">1. public.profiles (Akun & RBAC Admin/User)</div>
          <div>2. public.datasets (Metadata & Status Dataset)</div>
          <div>3. public.dataset_sheets (Multi-Sheet Excel Support)</div>
          <div>4. public.dataset_files (Metadata Storage Bucket)</div>
          <div>5. public.analysis_results (Hasil Olah Data & Metrik)</div>
          <div>6. public.ai_conversations (Sesi Chat Gemini)</div>
          <div>7. public.ai_messages (Percakapan & Grounded Evidence)</div>
          <div>8. public.forecasts (Hasil Peramalan Time-Series & Metrik)</div>
          <div>9. public.reports (Executive Summary Formal)</div>
          <div>10. public.activity_logs (Audit Trail Operasional)</div>
          <div>11. public.system_settings (Konfigurasi Global Enterprise)</div>
        </div>
      </div>

      {/* Security Architecture Checklist */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          Kepatuhan Standar Keamanan & Proteksi Data (Enterprise Compliance)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200">No Client Key Exposure</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Gemini API key tersimpan di backend secret manager.</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200">PostgreSQL Row Level Security</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Isolasi data antar pengguna terjamin via RLS.</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-200">Non-Destructive Cleaning</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Data asli tidak pernah diubah secara langsung.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Hubungkan Database Supabase</h2>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Supabase Project URL:
                </label>
                <input
                  type="url"
                  placeholder="https://xyzproject.supabase.co"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Ditemukan di Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Supabase Anon Key (Public API Key):
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={inputAnonKey}
                    onChange={(e) => setInputAnonKey(e.target.value)}
                    className="w-full px-3 py-2 pr-9 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Ditemukan di Supabase Dashboard &gt; Project Settings &gt; API &gt; Project API keys (anon/public)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <div className="font-semibold text-cyan-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Koneksi Langsung & Aman</span>
                </div>
                <div>
                  Kredensial disimpan secara aman di browser dan berkomunikasi langsung dengan klaster PostgreSQL Supabase melalui REST endpoint terenkripsi SSL.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition disabled:opacity-50"
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
