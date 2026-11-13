import React, { useState } from 'react';
import {
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  TableProperties,
  Sparkles,
  Filter,
  Download,
  Eye,
} from 'lucide-react';

export interface ContextMenuTarget {
  panelId: string;
  panelTitle: string;
  column: string;
  value: string;
  x: number;
  y: number;
  canDrillDown?: boolean;
}

interface BiChartPanelProps {
  id: string;
  title: string;
  subtitle: string;
  drillTrail?: string[];
  onDrillUp?: () => void;
  headerRight?: React.ReactNode;
  subToolbar?: React.ReactNode;
  onExportData?: () => void;
  onViewDetails?: () => void;
  onAnalyzeWithAi?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const BiChartPanel: React.FC<BiChartPanelProps> = ({
  id,
  title,
  subtitle,
  drillTrail,
  onDrillUp,
  headerRight,
  subToolbar,
  onExportData,
  onViewDetails,
  onAnalyzeWithAi,
  children,
  className = '',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article
      id={id}
      className={`rounded-xl surface-card p-3.5 flex flex-col justify-between transition-theme ${className}`}
    >
      {/* Panel Header */}
      <div className="flex items-start justify-between gap-1.5 pb-2 border-b border-[var(--border-color)]/60">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-xs font-bold text-[var(--text-main)] leading-snug">
              {title}
            </h2>
            {drillTrail && drillTrail.length > 0 && (
              <button
                type="button"
                onClick={onDrillUp}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--bg-caramel-soft)] text-[10px] font-semibold text-[var(--color-primary)] hover:bg-[var(--bg-primary-soft)] whitespace-nowrap shrink-0 cursor-pointer"
                title="Kembali ke level hierarki sebelumnya"
              >
                <ArrowUp className="w-2.5 h-2.5" />
                <span>Drill Up</span>
              </button>
            )}
          </div>
          <p className="text-[10.5px] text-[var(--text-secondary)] truncate mt-0.5">
            {drillTrail && drillTrail.length > 0
              ? `Hierarki aktif: ${drillTrail.join(' › ')}`
              : subtitle}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {headerRight}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(prev => !prev)}
              aria-label={`Opsi Panel ${title}`}
              title="Opsi Panel"
              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)] transition-theme cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div
                  role="menu"
                  className="absolute right-0 mt-1 w-44 rounded-xl surface-card shadow-lg py-1 z-40 text-xs"
                >
                  {onViewDetails && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onViewDetails();
                        setMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      <span>View Details</span>
                    </button>
                  )}
                  {onAnalyzeWithAi && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onAnalyzeWithAi();
                        setMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[var(--accent-caramel)]" />
                      <span>Analyze with AI</span>
                    </button>
                  )}
                  {onExportData && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onExportData();
                        setMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[var(--color-success)]" />
                      <span>Export Data CSV</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {subToolbar && (
        <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
          {subToolbar}
        </div>
      )}

      {/* Chart Content */}
      <div className="pt-2 flex-1 min-h-0">{children}</div>
    </article>
  );
};

interface BiContextMenuProps {
  target: ContextMenuTarget | null;
  onClose: () => void;
  onDrillDown: (target: ContextMenuTarget) => void;
  onDrillThrough: (target: ContextMenuTarget) => void;
  onViewDetails: (target: ContextMenuTarget) => void;
  onAnalyzeWithAi: (target: ContextMenuTarget) => void;
  onAddToFilters: (target: ContextMenuTarget) => void;
  onExportSegment: (target: ContextMenuTarget) => void;
}

export const BiContextMenu: React.FC<BiContextMenuProps> = ({
  target,
  onClose,
  onDrillDown,
  onDrillThrough,
  onViewDetails,
  onAnalyzeWithAi,
  onAddToFilters,
  onExportSegment,
}) => {
  if (!target) return null;

  const left = typeof window !== 'undefined' ? Math.min(target.x, window.innerWidth - 230) : target.x;
  const top = typeof window !== 'undefined' ? Math.min(target.y, window.innerHeight - 260) : target.y;

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }} />
      <div
        role="menu"
        aria-label={`Aksi untuk ${target.value}`}
        style={{ left: `${Math.max(12, left)}px`, top: `${Math.max(12, top)}px` }}
        className="fixed z-50 w-52 rounded-xl surface-card shadow-xl py-1.5 text-xs border border-[var(--border-color)]"
      >
        <div className="px-3 py-1.5 border-b border-[var(--border-color)]">
          <div className="text-[10px] text-[var(--text-secondary)] truncate">{target.panelTitle}</div>
          <div className="font-bold text-[var(--text-main)] truncate">
            {target.column}: {target.value}
          </div>
        </div>

        {target.canDrillDown !== false && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDrillDown(target);
              onClose();
            }}
            className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Drill Down</span>
          </button>
        )}

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onDrillThrough(target);
            onClose();
          }}
          className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
        >
          <TableProperties className="w-3.5 h-3.5 text-[var(--accent-caramel)]" />
          <span>Drill Through (Records)</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onViewDetails(target);
            onClose();
          }}
          className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>View Details</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onAddToFilters(target);
            onClose();
          }}
          className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5 text-[var(--color-success)]" />
          <span>Add to Dashboard Filters</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onAnalyzeWithAi(target);
            onClose();
          }}
          className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-caramel)]" />
          <span>Analyze with AI</span>
        </button>

        <div className="my-1 border-t border-[var(--border-color)]" />

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onExportSegment(target);
            onClose();
          }}
          className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <span>Export Data</span>
        </button>
      </div>
    </>
  );
};
