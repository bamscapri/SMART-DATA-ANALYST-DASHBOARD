import React, { useState, useMemo } from 'react';
import {
  BiFilterState,
  BiSchema,
  BiCrossFilter,
} from '../../utils/biDashboard';
import {
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  X,
  Calendar,
  Filter,
} from 'lucide-react';

interface BiRightFilterPanelProps {
  schema: BiSchema;
  draftFilters: BiFilterState;
  appliedFilters: BiFilterState;
  crossFilter: BiCrossFilter | null;
  allColumns: string[];
  onChangeDraft: (next: BiFilterState) => void;
  onApply: () => void;
  onResetAll: () => void;
  onClearCrossFilter: () => void;
  isOpenDesktop: boolean;
  isDrawerOpenMobile: boolean;
  onCloseMobileDrawer: () => void;
}

export const BiRightFilterPanel: React.FC<BiRightFilterPanelProps> = ({
  schema,
  draftFilters,
  appliedFilters,
  crossFilter,
  allColumns,
  onChangeDraft,
  onApply,
  onResetAll,
  onClearCrossFilter,
  isOpenDesktop,
  isDrawerOpenMobile,
  onCloseMobileDrawer,
}) => {
  const [facetSearch, setFacetSearch] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { date: true, custom: false };
    schema.filterableCols.forEach((f, idx) => {
      init[f.key] = idx < 3;
    });
    return init;
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFacetValue = (col: string, val: string) => {
    const existing = draftFilters.facets[col] || [];
    const nextVals = existing.includes(val)
      ? existing.filter(v => v !== val)
      : [...existing, val];
    onChangeDraft({
      ...draftFilters,
      facets: {
        ...draftFilters.facets,
        [col]: nextVals,
      },
    });
  };

  const selectAllFacet = (col: string, allValues: string[]) => {
    onChangeDraft({
      ...draftFilters,
      facets: {
        ...draftFilters.facets,
        [col]: [...allValues],
      },
    });
  };

  const clearFacet = (col: string) => {
    const nextFacets = { ...draftFilters.facets };
    delete nextFacets[col];
    onChangeDraft({
      ...draftFilters,
      facets: nextFacets,
    });
  };

  const hasPendingChanges = useMemo(
    () => JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters),
    [draftFilters, appliedFilters]
  );

  const panelBody = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Filter className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-[var(--text-main)] truncate">
              Filter Dimensi &amp; Segmen
            </h2>
            <p className="text-[10px] text-[var(--text-secondary)] truncate">
              Dinamis sesuai skema dataset aktif
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobileDrawer}
          aria-label="Tutup Panel Filter"
          className="p-1 rounded-lg lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-main)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Filter Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
        {/* Global Row Search */}
        <div className="space-y-1">
          <label htmlFor="bi-global-search" className="text-[11px] font-semibold text-[var(--text-secondary)]">
            Pencarian Cepat Data
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="bi-global-search"
              type="text"
              value={draftFilters.searchQuery}
              onChange={(e) => onChangeDraft({ ...draftFilters, searchQuery: e.target.value })}
              placeholder="Cari produk, wilayah, ID..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-secondary)]/70"
            />
          </div>
        </div>

        {/* Active Cross-filter notice */}
        {crossFilter && (
          <div className="p-2.5 rounded-lg bg-[var(--bg-caramel-soft)] border border-[var(--accent-caramel)] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[var(--color-primary)]">Cross-Filter Aktif</span>
              <button
                type="button"
                onClick={onClearCrossFilter}
                className="text-[11px] font-semibold text-[var(--color-danger)] hover:underline cursor-pointer"
              >
                Hapus
              </button>
            </div>
            <div className="text-[11px] text-[var(--text-main)] truncate">
              {crossFilter.column === '__TIME_BUCKET__' ? 'Periode' : crossFilter.column}: <strong>{crossFilter.value}</strong>
            </div>
          </div>
        )}

        {/* Date Filter (only if dataset has a date column) */}
        {schema.dateCol && schema.dateBounds && (
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('date')}
              className="w-full px-3 py-2 flex items-center justify-between text-left font-semibold text-[11px] text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)]/50 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>Date Filter ({schema.dateCol})</span>
              </span>
              {expandedSections.date ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {expandedSections.date && (
              <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[var(--border-color)]/60">
                <div>
                  <label htmlFor="bi-date-from" className="text-[10px] text-[var(--text-secondary)] block mb-0.5">
                    Dari Tanggal
                  </label>
                  <input
                    id="bi-date-from"
                    type="date"
                    value={draftFilters.dateFrom}
                    min={schema.dateBounds.min}
                    max={schema.dateBounds.max}
                    onChange={(e) => onChangeDraft({ ...draftFilters, dateFrom: e.target.value })}
                    className="w-full px-2 py-1 rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-[11px] text-[var(--text-main)] tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="bi-date-to" className="text-[10px] text-[var(--text-secondary)] block mb-0.5">
                    Sampai Tanggal
                  </label>
                  <input
                    id="bi-date-to"
                    type="date"
                    value={draftFilters.dateTo}
                    min={schema.dateBounds.min}
                    max={schema.dateBounds.max}
                    onChange={(e) => onChangeDraft({ ...draftFilters, dateTo: e.target.value })}
                    className="w-full px-2 py-1 rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-[11px] text-[var(--text-main)] tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Facet Checkboxes based on available dataset columns */}
        {schema.filterableCols.map(facet => {
          const isExpanded = expandedSections[facet.key] ?? false;
          const selected = draftFilters.facets[facet.key] || [];
          const q = (facetSearch[facet.key] || '').toLowerCase();
          const filteredValues = facet.values.filter(v => v.toLowerCase().includes(q));

          return (
            <div
              key={facet.key}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleSection(facet.key)}
                className="w-full px-3 py-2 flex items-center justify-between text-left font-semibold text-[11px] text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)]/50 cursor-pointer"
              >
                <span className="truncate">
                  {facet.label}
                  {selected.length > 0 && (
                    <span className="ml-1.5 text-[10px] text-[var(--color-primary)] tabular-nums">
                      ({selected.length})
                    </span>
                  )}
                </span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-2.5 pb-2.5 pt-1.5 space-y-2 border-t border-[var(--border-color)]/60">
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => selectAllFacet(facet.key, facet.values)}
                      className="text-[var(--color-primary)] hover:underline font-medium cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => clearFacet(facet.key)}
                      className="text-[var(--text-secondary)] hover:text-[var(--color-danger)] font-medium cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  </div>

                  {facet.values.length > 5 && (
                    <input
                      type="text"
                      value={facetSearch[facet.key] || ''}
                      onChange={(e) => setFacetSearch(prev => ({ ...prev, [facet.key]: e.target.value }))}
                      placeholder={`Filter ${facet.label}...`}
                      className="w-full px-2 py-1 rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-[11px] text-[var(--text-main)]"
                    />
                  )}

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {filteredValues.map(val => {
                      const checked = selected.includes(val);
                      return (
                        <label
                          key={val}
                          className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-[var(--bg-caramel-soft)]/60 cursor-pointer text-[11px] text-[var(--text-main)]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFacetValue(facet.key, val)}
                            className="rounded border-[var(--border-color)] accent-[var(--color-primary)] cursor-pointer shrink-0"
                          />
                          <span className="truncate">{val}</span>
                        </label>
                      );
                    })}
                    {filteredValues.length === 0 && (
                      <div className="text-[10px] text-[var(--text-secondary)] py-1">Tidak ada hasil</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Custom Column Filter */}
        {allColumns.length > 0 && (
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('custom')}
              className="w-full px-3 py-2 flex items-center justify-between text-left font-semibold text-[11px] text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)]/50 cursor-pointer"
            >
              <span>Custom Column Filter</span>
              {expandedSections.custom ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {expandedSections.custom && (
              <div className="px-3 pb-3 pt-1.5 space-y-2 border-t border-[var(--border-color)]/60">
                <select
                  aria-label="Pilih Kolom Filter Kustom"
                  value={draftFilters.customColumn}
                  onChange={(e) => onChangeDraft({ ...draftFilters, customColumn: e.target.value })}
                  className="w-full px-2 py-1 rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-[11px] text-[var(--text-main)]"
                >
                  {allColumns.map(col => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    aria-label="Operator Filter Kustom"
                    value={draftFilters.customOperator}
                    onChange={(e) =>
                      onChangeDraft({
                        ...draftFilters,
                        customOperator: e.target.value as BiFilterState['customOperator'],
                      })
                    }
                    className="px-2 py-1 rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-[11px] text-[var(--text-main)]"
                  >
                    <option value="contains">Contains</option>
                    <option value="equals">Equals</option>
                    <option value="gt">&gt; Greater</option>
                    <option value="lt">&lt; Less</option>
                  </select>
                  <input
                    type="text"
                    aria-label="Nilai Filter Kustom"
                    value={draftFilters.customValue}
                    onChange={(e) => onChangeDraft({ ...draftFilters, customValue: e.target.value })}
                    placeholder="Nilai..."
                    className="px-2 py-1 rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-[11px] text-[var(--text-main)]"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions: Apply Filter & Reset All */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
        <button
          type="button"
          onClick={() => {
            onApply();
            onCloseMobileDrawer();
          }}
          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-theme cursor-pointer ${
            hasPendingChanges
              ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] shadow-xs'
              : 'bg-[var(--bg-primary-soft)] text-[var(--color-primary)] hover:bg-[var(--bg-caramel-soft)]'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>{hasPendingChanges ? 'Apply Filter' : 'Filter Tersinkron'}</span>
        </button>

        <button
          type="button"
          onClick={onResetAll}
          className="w-full py-1.5 px-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-medium flex items-center justify-center gap-1.5 transition-theme cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Right Panel (~20-23% width) */}
      {isOpenDesktop && (
        <aside
          aria-label="Panel Filter Bisnis"
          className="hidden lg:flex w-64 xl:w-[272px] shrink-0 rounded-xl surface-card flex-col overflow-hidden self-start sticky top-20 max-h-[calc(100vh-6rem)]"
        >
          {panelBody}
        </aside>
      )}

      {/* Tablet / Mobile Drawer */}
      {isDrawerOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div className="fixed inset-0 bg-[#211C19]/60 backdrop-blur-xs" onClick={onCloseMobileDrawer} />
          <aside
            aria-label="Drawer Filter Bisnis"
            className="relative w-80 max-w-[88vw] h-full bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl z-10 flex flex-col"
          >
            {panelBody}
          </aside>
        </div>
      )}
    </>
  );
};
