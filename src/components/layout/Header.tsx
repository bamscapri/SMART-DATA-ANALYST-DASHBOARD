import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Moon,
  Sun,
  Database,
  FileSpreadsheet,
  UploadCloud,
  Cpu,
  Layers,
  Shield,
  User,
  CheckCircle2,
  Menu,
  Cloud,
  RefreshCw
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    selectedDataset,
    datasets,
    selectDataset,
    activeSheet,
    setActiveSheet,
    currentUser,
    switchRole,
    darkMode,
    toggleDarkMode,
    setCurrentView,
    hasGeminiKey,
    toggleMobileMenu,
    supabaseConnected,
    supabaseTablesReady,
    isSyncing,
    syncWithSupabase
  } = useApp();

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0B192C]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20 sticky top-0">
      {/* Left: Active Dataset Selector & Sheet Picker */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Menu Hamburger */}
        <button
          onClick={toggleMobileMenu}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 md:hidden hover:text-white"
          title="Open Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Dataset Dropdown */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/70 px-3 py-1.5 rounded-lg text-xs">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400 font-medium hidden sm:inline">Active Dataset:</span>
          <select
            value={selectedDataset?.id || ''}
            onChange={(e) => selectDataset(e.target.value)}
            className="bg-transparent text-slate-100 font-semibold focus:outline-none cursor-pointer max-w-[200px] truncate"
          >
            {datasets.map(ds => (
              <option key={ds.id} value={ds.id} className="bg-slate-900 text-slate-100">
                {ds.name} ({ds.data?.length || 0} rows)
              </option>
            ))}
          </select>
        </div>

        {/* Sheet Selector (if Excel with multiple sheets) */}
        {selectedDataset?.sheets && selectedDataset.sheets.length > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/70 px-2.5 py-1.5 rounded-lg text-xs">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400 hidden md:inline">Sheet:</span>
            <select
              value={activeSheet}
              onChange={(e) => setActiveSheet(e.target.value)}
              className="bg-transparent text-cyan-300 font-medium focus:outline-none cursor-pointer"
            >
              {selectedDataset.sheets.map(s => (
                <option key={s.name} value={s.name} className="bg-slate-900 text-slate-100">
                  {s.name} ({s.data.length})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Actions, Role Switcher, AI Status, Theme Toggle */}
      <div className="flex items-center gap-3">
        {/* Supabase PostgreSQL Status & Quick Sync */}
        <button
          onClick={() => {
            if (!supabaseConnected || !supabaseTablesReady) {
              setCurrentView('settings');
            } else {
              syncWithSupabase();
            }
          }}
          disabled={isSyncing}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
            supabaseConnected && supabaseTablesReady
              ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/30'
              : supabaseConnected
              ? 'bg-amber-950/40 border-amber-800/40 text-amber-300 hover:bg-amber-900/30'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title={
            supabaseConnected && supabaseTablesReady
              ? 'Supabase Terhubung & Sinkron (Klik untuk Sinkronisasi Manual)'
              : supabaseConnected
              ? 'Supabase Terhubung (Klik untuk melihat SQL Migration Schema)'
              : 'Local DB Fallback (Klik untuk konfigurasi)'
          }
        >
          <Cloud
            className={`w-3.5 h-3.5 ${
              supabaseConnected && supabaseTablesReady
                ? 'text-emerald-400'
                : supabaseConnected
                ? 'text-amber-400'
                : 'text-slate-400'
            }`}
          />
          <span>
            {supabaseConnected && supabaseTablesReady
              ? 'Supabase Cloud'
              : supabaseConnected
              ? 'Supabase (Setup DB)'
              : 'Local DB'}
          </span>
          {isSyncing ? (
            <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
          ) : (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                supabaseConnected && supabaseTablesReady
                  ? 'bg-emerald-400'
                  : supabaseConnected
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-500'
              }`}
            />
          )}
        </button>

        {/* AI Engine Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300">
          <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Gemini 3.8 Flash</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>

        {/* Role Toggle (Admin vs User) */}
        <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => switchRole('admin')}
            className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
              currentUser.role === 'admin'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Switch to Administrator Role"
          >
            <Shield className="w-3 h-3" />
            <span className="hidden sm:inline">Admin</span>
          </button>
          <button
            onClick={() => switchRole('user')}
            className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
              currentUser.role === 'user'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Switch to Standard Analyst Role"
          >
            <User className="w-3 h-3" />
            <span className="hidden sm:inline">User</span>
          </button>
        </div>

        {/* Quick Upload CTA */}
        <button
          onClick={() => setCurrentView('upload')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-md shadow-cyan-500/20 transition active:scale-95"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload Data</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>
    </header>
  );
};
