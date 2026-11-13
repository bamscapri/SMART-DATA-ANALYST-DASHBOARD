import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Star,
  SlidersHorizontal,
  MoreVertical,
  ChevronRight,
  Download,
  RotateCcw,
  LayoutGrid,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react';

interface BiDashboardHeaderProps {
  datasetName: string;
  sheetName?: string;
  filteredCount: number;
  totalCount: number;
  lastUpdated: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onAnalyzeWithAi: () => void;
  isFilterPanelOpen: boolean;
  onToggleFilterPanel: () => void;
  activeFilterCount: number;
  density: 'compact' | 'comfortable';
  onToggleDensity: () => void;
  onResetAll: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  onExportSnapshotPng: () => void;
}

export const BiDashboardHeader: React.FC<BiDashboardHeaderProps> = ({
  datasetName,
  sheetName,
  filteredCount,
  totalCount,
  lastUpdated,
  isFavorite,
  onToggleFavorite,
  onRefresh,
  isRefreshing,
  onAnalyzeWithAi,
  isFilterPanelOpen,
  onToggleFilterPanel,
  activeFilterCount,
  density,
  onToggleDensity,
  onResetAll,
  onExportCsv,
  onExportExcel,
  onExportSnapshotPng,
}) => {
  const [optionsOpen, setOptionsOpen] = useState(false);

  return (
    <section
      aria-label="Header Dashboard Business Intelligence"
      className="rounded-xl surface-card px-4 py-3.5 sm:px-5 sm:py-4 transition-theme"
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left: Breadcrumb, Title, Subtitle, Metadata */}
        <div className="min-w-0 space-y-1">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-medium"
          >
            <span>Workspace</span>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span>Business Intelligence</span>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-[var(--color-primary)] font-semibold">Overview Dashboard</span>
          </nav>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-main)]">
              SMART AI DATA ANALYTICS
            </h1>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Enterprise Business Intelligence &amp; Performance Monitoring
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-secondary)] tabular-nums">
            <span>
              Dataset: <strong className="text-[var(--text-main)] font-semibold">{datasetName || 'Belum dipilih'}</strong>
            </span>
            {sheetName && (
              <>
                <span aria-hidden="true">·</span>
                <span>Sheet: {sheetName}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>
              Records: <strong className="text-[var(--text-main)]">{filteredCount.toLocaleString('id-ID')}</strong> / {totalCount.toLocaleString('id-ID')}
            </span>
            <span aria-hidden="true">·</span>
            <span>Last Data Update: {lastUpdated}</span>
          </div>
        </div>

        {/* Right: Enterprise BI Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={onAnalyzeWithAi}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold text-xs shadow-xs transition-theme whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analyze with AI</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh Data Dashboard"
            title="Refresh Data Aktual"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] border border-[var(--border-color)] text-xs font-medium transition-theme whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-primary)] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Hapus dari Favorite Dashboard' : 'Tandai sebagai Favorite Dashboard'}
            title={isFavorite ? 'Dashboard Favorit Aktif' : 'Simpan sebagai Favorit'}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-theme whitespace-nowrap shrink-0 cursor-pointer ${
              isFavorite
                ? 'bg-[var(--bg-caramel-soft)] border-[var(--accent-caramel)] text-[var(--color-primary)]'
                : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-[var(--accent-caramel)] text-[var(--accent-caramel)]' : ''}`} />
            <span className="hidden md:inline">Favorite</span>
          </button>

          <button
            type="button"
            onClick={onToggleFilterPanel}
            aria-expanded={isFilterPanelOpen}
            aria-label="Toggle Panel Filter"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-theme whitespace-nowrap shrink-0 cursor-pointer ${
              isFilterPanelOpen
                ? 'bg-[var(--bg-primary-soft)] border-[var(--color-primary)] text-[var(--color-primary)] font-semibold'
                : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
          </button>

          {/* Dashboard Options Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOptionsOpen(prev => !prev)}
              aria-expanded={optionsOpen}
              aria-label="Dashboard Options"
              title="Dashboard Options"
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] border border-[var(--border-color)] text-xs font-medium transition-theme whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Options</span>
            </button>

            {optionsOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setOptionsOpen(false)} />
                <div
                  role="menu"
                  className="absolute right-0 mt-1.5 w-56 rounded-xl surface-card shadow-lg py-1.5 z-40 text-xs"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onToggleDensity();
                      setOptionsOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <LayoutGrid className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      Mode Kepadatan
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] capitalize">{density}</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onExportSnapshotPng();
                      setOptionsOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[var(--accent-caramel)]" />
                    <span>Export Dashboard PNG</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onExportCsv();
                      setOptionsOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--color-success)]" />
                    <span>Export Filtered CSV</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onExportExcel();
                      setOptionsOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--color-success)]" />
                    <span>Export Filtered Excel</span>
                  </button>

                  <div className="my-1 border-t border-[var(--border-color)]" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onResetAll();
                      setOptionsOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-danger-soft)] text-[var(--color-danger)] font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Semua Filter &amp; Drill</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
