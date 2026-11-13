import React from 'react';
import { useApp } from '../../context/AppContext';
import { ThemeSwitcher } from '../common/ThemeSwitcher';
import {
  Database,
  UploadCloud,
  Layers,
  Shield,
  User,
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
    setCurrentView,
    toggleMobileMenu,
    supabaseConnected,
    supabaseTablesReady,
    isSyncing,
    syncWithSupabase
  } = useApp();

  return (
    <header className="h-16 border-b border-[var(--border-color)] bg-[var(--bg-header)] text-[var(--text-main)] px-4 sm:px-6 flex items-center justify-between gap-3 z-20 sticky top-0 backdrop-blur-md transition-theme">
      {/* Left: Mobile Menu + Active Dataset Selector & Sheet Picker */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleMobileMenu}
          aria-label="Buka Menu Navigasi"
          className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)] md:hidden transition-theme shrink-0 cursor-pointer"
          title="Buka Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Dataset Dropdown */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] shadow-2xs transition-theme min-w-0">
          <Database className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
          <span className="text-[var(--text-secondary)] font-medium hidden lg:inline whitespace-nowrap">
            Dataset:
          </span>
          <select
            aria-label="Pilih Dataset Aktif"
            value={selectedDataset?.id || ''}
            onChange={(e) => selectDataset(e.target.value)}
            className="bg-transparent font-semibold text-[var(--text-main)] focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[210px] truncate"
          >
            {datasets.map(ds => (
              <option key={ds.id} value={ds.id}>
                {ds.name} ({ds.data?.length || 0} rows)
              </option>
            ))}
          </select>
        </div>

        {/* Sheet Selector (if Excel with multiple sheets) */}
        {selectedDataset?.sheets && selectedDataset.sheets.length > 1 && (
          <div className="hidden sm:flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] px-2.5 py-1.5 rounded-lg text-xs transition-theme">
            <Layers className="w-3.5 h-3.5 text-[var(--accent-caramel)] shrink-0" />
            <span className="text-[var(--text-secondary)] hidden xl:inline">Sheet:</span>
            <select
              aria-label="Pilih Sheet Aktif"
              value={activeSheet}
              onChange={(e) => setActiveSheet(e.target.value)}
              className="bg-transparent text-[var(--color-primary)] font-semibold focus:outline-none cursor-pointer"
            >
              {selectedDataset.sheets.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.data.length})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Supabase Status, Role Toggle, 3-Mode Theme Switcher, Upload CTA */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Supabase PostgreSQL Status & Quick Sync */}
        <button
          type="button"
          onClick={() => {
            if (!supabaseConnected || !supabaseTablesReady) {
              setCurrentView('settings');
            } else {
              syncWithSupabase();
            }
          }}
          disabled={isSyncing}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-caramel-soft)] transition-theme whitespace-nowrap shrink-0 cursor-pointer"
          title={
            supabaseConnected && supabaseTablesReady
              ? 'Supabase Terhubung & Sinkron (Klik untuk Sinkronisasi Manual)'
              : supabaseConnected
              ? 'Supabase Terhubung (Klik untuk melihat SQL Migration Schema)'
              : 'Local Persistence (Klik untuk konfigurasi Supabase)'
          }
        >
          <Cloud
            className="w-3.5 h-3.5 shrink-0"
            style={{
              color:
                supabaseConnected && supabaseTablesReady
                  ? 'var(--color-success)'
                  : supabaseConnected
                  ? 'var(--color-warning)'
                  : 'var(--text-secondary)'
            }}
          />
          <span className="text-[var(--text-main)]">
            {supabaseConnected && supabaseTablesReady
              ? 'Supabase'
              : supabaseConnected
              ? 'Setup DB'
              : 'Local DB'}
          </span>
          {isSyncing && (
            <RefreshCw className="w-3 h-3 animate-spin" style={{ color: 'var(--color-success)' }} />
          )}
        </button>

        {/* Role Toggle (Admin vs User) */}
        <div
          role="group"
          aria-label="Pilih Peran Pengguna"
          className="hidden md:flex items-center p-0.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs transition-theme"
        >
          <button
            type="button"
            onClick={() => switchRole('admin')}
            className={`px-2.5 py-1 rounded-md font-medium transition-theme flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
              currentUser.role === 'admin'
                ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
            title="Switch to Administrator Role"
          >
            <Shield className="w-3 h-3" />
            <span>Admin</span>
          </button>
          <button
            type="button"
            onClick={() => switchRole('user')}
            className={`px-2.5 py-1 rounded-md font-medium transition-theme flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
              currentUser.role === 'user'
                ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
            title="Switch to Standard Analyst Role"
          >
            <User className="w-3 h-3" />
            <span>User</span>
          </button>
        </div>

        {/* 3-Mode Theme Switcher (Light / Dark / System) */}
        <ThemeSwitcher compact />

        {/* Quick Upload CTA */}
        <button
          type="button"
          onClick={() => setCurrentView('upload')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold text-xs shadow-xs transition-theme active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload Data</span>
        </button>
      </div>
    </header>
  );
};
