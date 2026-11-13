import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  detectBiSchema,
  createEmptyFilterState,
  applyBiFilters,
  buildBiKpis,
  buildCategoryClusteredData,
  buildStackedAreaTrendData,
  buildDonutDistributionData,
  buildComparativePeriodData,
  buildDetailedGroupedData,
  buildGeoDistributionData,
  buildDeterministicBiAiInsights,
  formatBiMetric,
  getBiChartColors,
  BiFilterState,
  BiCrossFilter,
  BiCategoryDrill,
  BiTimeDrill,
  TimeGranularity,
  BiAiInsightsPayload,
} from '../../utils/biDashboard';
import { exportToCsv, exportToExcel, exportElementAsPng } from '../../utils/exportUtils';
import { BiDashboardHeader } from './BiDashboardHeader';
import { BiRightFilterPanel } from './BiRightFilterPanel';
import { BiChartPanel, BiContextMenu, ContextMenuTarget } from './BiChartPanel';
import { BiGeoMap } from './BiGeoMap';
import { BiDataTablePanel } from './BiDataTablePanel';
import { BiAiAnalysisModal } from './BiAiAnalysisModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RotateCcw,
  UploadCloud,
  Database,
  ArrowUpDown,
  X,
  FilterX,
} from 'lucide-react';

const FAVORITE_STORAGE_KEY = 'smart_ai_bi_favorites';
const GRANULARITY_ORDER: TimeGranularity[] = ['year', 'quarter', 'month', 'week', 'day'];
const GRANULARITY_LABELS: Record<TimeGranularity, string> = {
  year: 'Tahun',
  quarter: 'Kuartal',
  month: 'Bulan',
  week: 'Minggu',
  day: 'Hari',
};

export const OverviewDashboard: React.FC = () => {
  const {
    datasets,
    selectedDataset,
    activeSheet,
    currentStats,
    setCurrentView,
    syncWithSupabase,
    supabaseConnected,
    supabaseTablesReady,
    supabaseAuthenticated,
    addToast,
    logActivity,
  } = useApp();
  const { resolvedTheme, chartTheme } = useTheme();

  const rawRows = selectedDataset?.data || [];
  const datasetId = selectedDataset?.id || 'none';
  const datasetName = selectedDataset?.name || 'Dataset Aktif';

  // Detect schema once per dataset/sheet change
  const schema = useMemo(() => detectBiSchema(rawRows, currentStats), [rawRows, currentStats]);
  const allColumns = useMemo(() => Object.keys(rawRows[0] || {}), [rawRows]);
  const chartColors = useMemo(() => getBiChartColors(resolvedTheme), [resolvedTheme]);

  // Filter & Cross-filter states
  const [draftFilters, setDraftFilters] = useState<BiFilterState>(() => createEmptyFilterState(schema));
  const [appliedFilters, setAppliedFilters] = useState<BiFilterState>(() => createEmptyFilterState(schema));
  const [crossFilter, setCrossFilter] = useState<BiCrossFilter | null>(null);

  // Drill-down states
  const [categoryDrill, setCategoryDrill] = useState<BiCategoryDrill>({ level: 0, filters: [] });
  const [timeDrill, setTimeDrill] = useState<BiTimeDrill>({ granularity: 'month' });

  // Drill-through / Data table state
  const [tableExpanded, setTableExpanded] = useState<boolean>(false);
  const [drillThroughTarget, setDrillThroughTarget] = useState<{ column: string; value: string } | null>(null);

  // View preferences
  const [isFilterOpenDesktop, setIsFilterOpenDesktop] = useState<boolean>(true);
  const [isFilterOpenMobile, setIsFilterOpenMobile] = useState<boolean>(false);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [clusterSort, setClusterSort] = useState<'desc' | 'asc' | 'alpha'>('desc');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(() =>
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );

  // Favorites persisted in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const isFavorite = favorites.includes(datasetId);

  // Context menu & Detail Modal & AI Modal
  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiInsights, setAiInsights] = useState<BiAiInsightsPayload | null>(null);
  const [aiLiveNarrative, setAiLiveNarrative] = useState<string | null>(null);
  const [aiFocusLabel, setAiFocusLabel] = useState<string | null>(null);

  // Reset filters and drill states cleanly when dataset or sheet changes
  useEffect(() => {
    const fresh = createEmptyFilterState(schema);
    setDraftFilters(fresh);
    setAppliedFilters(fresh);
    setCrossFilter(null);
    setCategoryDrill({ level: 0, filters: [] });
    setTimeDrill({ granularity: schema.rowCount > 45 ? 'month' : 'month' });
    setDrillThroughTarget(null);
    setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  }, [datasetId, activeSheet, schema.dateBounds?.min, schema.dateBounds?.max]);

  // Active filter count badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    Object.values(appliedFilters.facets).forEach(arr => {
      if (arr && arr.length > 0) count += 1;
    });
    if (appliedFilters.searchQuery.trim()) count += 1;
    if (appliedFilters.customValue.trim()) count += 1;
    if (schema.dateBounds && (appliedFilters.dateFrom !== schema.dateBounds.min || appliedFilters.dateTo !== schema.dateBounds.max)) {
      count += 1;
    }
    if (crossFilter) count += 1;
    return count;
  }, [appliedFilters, schema.dateBounds, crossFilter]);

  // Filtered dataset rows (shared across KPIs, Charts, Geo)
  const filteredRows = useMemo(
    () =>
      applyBiFilters(rawRows, schema, appliedFilters, {
        crossFilter,
        categoryDrill,
        timeDrill,
      }),
    [rawRows, schema, appliedFilters, crossFilter, categoryDrill, timeDrill]
  );

  // Table rows optionally narrowed by Drill Through selection
  const tableRows = useMemo(() => {
    if (!drillThroughTarget) return filteredRows;
    return filteredRows.filter(r => String(r[drillThroughTarget.column] ?? '').trim() === drillThroughTarget.value);
  }, [filteredRows, drillThroughTarget]);

  // Active drill column for Clustered Bar & Donut
  const activeCategoryCol = useMemo(() => {
    if (schema.categoryHierarchy.length === 0) return '';
    const idx = Math.min(categoryDrill.level, schema.categoryHierarchy.length - 1);
    return schema.categoryHierarchy[idx];
  }, [schema.categoryHierarchy, categoryDrill.level]);

  const donutCategoryCol = schema.categoryHierarchy[0] || activeCategoryCol;
  const groupedDimensionCol =
    schema.geoCol ||
    schema.categoryHierarchy[1] ||
    schema.categoryHierarchy[0] ||
    '';

  // Panel aggregations (memoized)
  const kpiCards = useMemo(() => buildBiKpis(filteredRows, rawRows, schema), [filteredRows, rawRows, schema]);
  const clusteredData = useMemo(
    () => buildCategoryClusteredData(filteredRows, schema, activeCategoryCol, clusterSort),
    [filteredRows, schema, activeCategoryCol, clusterSort]
  );
  const stackedTrend = useMemo(
    () => buildStackedAreaTrendData(filteredRows, schema, timeDrill.granularity, donutCategoryCol),
    [filteredRows, schema, timeDrill.granularity, donutCategoryCol]
  );

  // Donut ignores cross-filters originating from donut itself so user can still see & switch slices easily
  const donutRows = useMemo(
    () =>
      applyBiFilters(rawRows, schema, appliedFilters, {
        crossFilter,
        categoryDrill,
        timeDrill,
        ignoreCrossFilterFromPanel: 'donut',
      }),
    [rawRows, schema, appliedFilters, crossFilter, categoryDrill, timeDrill]
  );
  const donutData = useMemo(
    () => buildDonutDistributionData(donutRows, schema, donutCategoryCol),
    [donutRows, schema, donutCategoryCol]
  );

  const comparativeData = useMemo(
    () => buildComparativePeriodData(filteredRows, schema, timeDrill.granularity),
    [filteredRows, schema, timeDrill.granularity]
  );
  const detailedGroupedData = useMemo(
    () => buildDetailedGroupedData(filteredRows, schema, groupedDimensionCol),
    [filteredRows, schema, groupedDimensionCol]
  );
  const geoData = useMemo(
    () => buildGeoDistributionData(filteredRows, schema),
    [filteredRows, schema]
  );

  // Handlers
  const handleToggleFavorite = () => {
    const next = isFavorite ? favorites.filter(id => id !== datasetId) : [...favorites, datasetId];
    setFavorites(next);
    try {
      localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
    addToast(
      'info',
      isFavorite ? 'Dihapus dari Favorit' : 'Ditandai sebagai Favorit',
      `${datasetName} ${isFavorite ? 'dihapus dari' : 'disimpan ke'} daftar dashboard favorit.`
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (supabaseConnected && supabaseTablesReady && supabaseAuthenticated) {
        await syncWithSupabase();
      }
      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      addToast('success', 'Dashboard Diperbarui', 'Seluruh metrik dan visualisasi disinkronkan dengan data aktual.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetAll = useCallback(() => {
    const fresh = createEmptyFilterState(schema);
    setDraftFilters(fresh);
    setAppliedFilters(fresh);
    setCrossFilter(null);
    setCategoryDrill({ level: 0, filters: [] });
    setTimeDrill({ granularity: 'month' });
    setDrillThroughTarget(null);
    addToast('info', 'Filter Direset', 'Semua filter, cross-filter, dan drill-down dikembalikan ke kondisi awal.');
  }, [schema, addToast]);

  const handleToggleCrossFilter = (column: string, value: string, sourcePanel: string) => {
    if (!column || !value) return;
    setCrossFilter(prev => {
      if (prev && prev.column === column && prev.value === value) {
        return null;
      }
      return { column, value, sourcePanel };
    });
  };

  const handleCategoryDrillDown = (col: string, val: string) => {
    const currentIdx = schema.categoryHierarchy.indexOf(col);
    const nextIdx = currentIdx >= 0 ? currentIdx + 1 : categoryDrill.level + 1;
    if (nextIdx < schema.categoryHierarchy.length) {
      setCategoryDrill(prev => ({
        level: nextIdx,
        filters: [...prev.filters, { column: col, value: val }],
      }));
      setCrossFilter(null);
      addToast(
        'info',
        `Drill Down → ${schema.categoryHierarchy[nextIdx]}`,
        `Menampilkan rincian untuk ${col}: ${val}`
      );
    } else {
      // At leaf level: trigger Drill Through into records explorer
      setDrillThroughTarget({ column: col, value: val });
      setTableExpanded(true);
      addToast('info', 'Leaf Level Tercapai — Drill Through Dibuka', `Menampilkan baris data untuk ${col}: ${val}`);
    }
  };

  const handleCategoryDrillUp = () => {
    setCategoryDrill(prev => {
      if (prev.level <= 0) return { level: 0, filters: [] };
      return {
        level: prev.level - 1,
        filters: prev.filters.slice(0, -1),
      };
    });
  };

  const handleTimeDrillStep = (direction: 'down' | 'up', clickedBucket?: string) => {
    const idx = GRANULARITY_ORDER.indexOf(timeDrill.granularity);
    if (direction === 'down' && idx < GRANULARITY_ORDER.length - 1) {
      const nextGran = GRANULARITY_ORDER[idx + 1];
      setTimeDrill(prev => ({
        ...prev,
        granularity: nextGran,
      }));
      if (clickedBucket) {
        addToast('info', `Time Drill Down (${GRANULARITY_LABELS[nextGran]})`, `Fokus rincian waktu dari ${clickedBucket}.`);
      }
    } else if (direction === 'up' && idx > 0) {
      const prevGran = GRANULARITY_ORDER[idx - 1];
      setTimeDrill({ granularity: prevGran });
    }
  };

  const handleAnalyzeWithAi = async (focusSegment?: { column: string; value: string } | null) => {
    const targetRows = focusSegment
      ? filteredRows.filter(r => String(r[focusSegment.column] ?? '').trim() === focusSegment.value)
      : filteredRows;
    const focusText = focusSegment ? `${focusSegment.column}: ${focusSegment.value}` : null;

    setAiFocusLabel(focusText);
    setAiModalOpen(true);
    setAiLoading(true);
    setAiLiveNarrative(null);

    const kpisForScope = focusSegment ? buildBiKpis(targetRows, rawRows, schema) : kpiCards;
    const clusteredForScope = buildCategoryClusteredData(targetRows, schema, activeCategoryCol, 'desc');
    const compForScope = buildComparativePeriodData(targetRows, schema, timeDrill.granularity);
    const geoForScope = buildGeoDistributionData(targetRows, schema);

    const deterministic = buildDeterministicBiAiInsights(
      datasetName,
      targetRows,
      rawRows,
      schema,
      kpisForScope,
      clusteredForScope,
      compForScope,
      geoForScope
    );
    setAiInsights(deterministic);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          datasetName: focusText ? `${datasetName} (${focusText})` : datasetName,
          stats: currentStats,
          sampleData: targetRows.slice(0, 12),
          query: `Berikan ringkasan eksekutif singkat berbasis metrik aktual dashboard (${targetRows.length} baris terfilter${focusText ? `, fokus ${focusText}` : ''}): ${deterministic.keyInsights.join(' ')} Sertakan rekomendasi keputusan paling berdampak.`,
        }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data?.answer) {
          setAiLiveNarrative(data.answer);
        }
      }
    } catch {
      // Deterministic grounded insights remain rendered cleanly
    } finally {
      setAiLoading(false);
      logActivity('BI_AI_ANALYSIS', 'Dashboard', datasetName, focusText || `${targetRows.length} rows`);
    }
  };

  const handleContextMenuAction = {
    drillDown: (t: ContextMenuTarget) => {
      if (t.panelId === 'trend' || t.panelId === 'comparative') {
        if (schema.dateCol) handleTimeDrillStep('down', t.value);
        else handleCategoryDrillDown(activeCategoryCol, t.value);
      } else {
        handleCategoryDrillDown(t.column, t.value);
      }
    },
    drillThrough: (t: ContextMenuTarget) => {
      if (t.column === '__TIME_BUCKET__') {
        handleToggleCrossFilter(t.column, t.value, t.panelId);
      } else {
        setDrillThroughTarget({ column: t.column, value: t.value });
      }
      setTableExpanded(true);
      setTimeout(() => {
        document.getElementById('bi-data-records-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    },
    viewDetails: (t: ContextMenuTarget) => {
      setDrillThroughTarget(t.column === '__TIME_BUCKET__' ? null : { column: t.column, value: t.value });
      setTableExpanded(true);
      setTimeout(() => {
        document.getElementById('bi-data-records-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    },
    addToFilters: (t: ContextMenuTarget) => {
      if (t.column === '__TIME_BUCKET__') {
        handleToggleCrossFilter(t.column, t.value, t.panelId);
        return;
      }
      const existing = appliedFilters.facets[t.column] || [];
      const nextFacetVals = existing.includes(t.value) ? existing : [...existing, t.value];
      const nextFilters: BiFilterState = {
        ...appliedFilters,
        facets: { ...appliedFilters.facets, [t.column]: nextFacetVals },
      };
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
      addToast('success', 'Ditambahkan ke Filter', `${t.column}: ${t.value} aktif di seluruh dashboard.`);
    },
    analyzeWithAi: (t: ContextMenuTarget) => {
      handleAnalyzeWithAi(t.column === '__TIME_BUCKET__' ? null : { column: t.column, value: t.value });
    },
    exportSegment: (t: ContextMenuTarget) => {
      const segRows =
        t.column === '__TIME_BUCKET__'
          ? filteredRows
          : filteredRows.filter(r => String(r[t.column] ?? '').trim() === t.value);
      exportToCsv(segRows, `${datasetName.replace(/\s+/g, '_')}_${t.value}.csv`);
      addToast('success', 'Data Diekspor', `${segRows.length} baris untuk ${t.value} berhasil diunduh.`);
    },
  };

  const chartHeightClass = density === 'compact' ? 'h-56' : 'h-64';

  // Empty Dataset Guard
  if (datasets.length === 0 || rawRows.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-2xl surface-card p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary-soft)] text-[var(--color-primary)] mx-auto flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-main)]">Belum Ada Dataset Aktif</h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            Unggah file Excel, CSV, PDF, atau Word untuk mengaktifkan dashboard analitik Business Intelligence beserta filter dimensi dan drill-down otomatis.
          </p>
          <button
            type="button"
            onClick={() => setCurrentView('upload')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] text-xs font-semibold cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Dataset Pertama</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="bi-dashboard-root" className="p-4 sm:p-5 space-y-3.5 max-w-[1680px] mx-auto">
      {/* Enterprise BI Header */}
      <BiDashboardHeader
        datasetName={datasetName}
        sheetName={selectedDataset?.sheets && selectedDataset.sheets.length > 1 ? activeSheet : undefined}
        filteredCount={filteredRows.length}
        totalCount={rawRows.length}
        lastUpdated={lastUpdated}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onAnalyzeWithAi={() => handleAnalyzeWithAi(null)}
        isFilterPanelOpen={isFilterOpenDesktop}
        onToggleFilterPanel={() => {
          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setIsFilterOpenMobile(prev => !prev);
          } else {
            setIsFilterOpenDesktop(prev => !prev);
          }
        }}
        activeFilterCount={activeFilterCount}
        density={density}
        onToggleDensity={() => setDensity(d => (d === 'compact' ? 'comfortable' : 'compact'))}
        onResetAll={handleResetAll}
        onExportCsv={() => exportToCsv(filteredRows, `${datasetName.replace(/\s+/g, '_')}_dashboard.csv`)}
        onExportExcel={() => exportToExcel(filteredRows, 'Dashboard_Data', `${datasetName.replace(/\s+/g, '_')}_dashboard.xlsx`)}
        onExportSnapshotPng={() => exportElementAsPng('bi-dashboard-root', `${datasetName.replace(/\s+/g, '_')}_BI_Snapshot.png`)}
      />

      {/* Cross-filter / Active Filter / Drill Notification Bar */}
      {(crossFilter || categoryDrill.filters.length > 0 || activeFilterCount > 0) && (
        <div className="rounded-xl surface-card px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-[var(--text-main)]">
            <span className="font-semibold text-[var(--color-primary)]">Filter &amp; Eksplorasi Aktif:</span>
            {crossFilter && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--bg-caramel-soft)] border border-[var(--accent-caramel)] text-[11px] font-medium">
                <span>
                  {crossFilter.column === '__TIME_BUCKET__' ? 'Periode' : crossFilter.column}: <strong>{crossFilter.value}</strong>
                </span>
                <button
                  type="button"
                  aria-label="Hapus Cross Filter"
                  onClick={() => setCrossFilter(null)}
                  className="hover:text-[var(--color-danger)] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {categoryDrill.filters.map((df, i) => (
              <span
                key={`${df.column}-${i}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-primary-soft)] text-[11px] font-medium"
              >
                Drill {df.column}: <strong>{df.value}</strong>
              </span>
            ))}
            <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
              Menampilkan {filteredRows.length.toLocaleString('id-ID')} dari {rawRows.length.toLocaleString('id-ID')} baris
            </span>
          </div>

          <div className="flex items-center gap-2">
            {crossFilter && (
              <button
                type="button"
                onClick={() => setCrossFilter(null)}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[11px] font-semibold text-[var(--text-main)] cursor-pointer"
              >
                Clear Selection
              </button>
            )}
            <button
              type="button"
              onClick={handleResetAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-danger-soft)] text-[var(--color-danger)] text-[11px] font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Zone BI Layout: Area Analytics Utama (~75-80%) + Right Side Filter Panel (~20-25%) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* A. AREA ANALYTICS UTAMA */}
        <div className="flex-1 min-w-0 w-full space-y-3.5">
          {filteredRows.length === 0 ? (
            <div className="rounded-xl surface-card p-10 text-center space-y-3">
              <FilterX className="w-8 h-8 text-[var(--color-warning)] mx-auto" />
              <div className="text-sm font-bold text-[var(--text-main)]">
                Tidak Ada Data yang Sesuai dengan Kombinasi Filter
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Ubah pilihan di Panel Filter sebelah kanan atau reset seluruh filter untuk menampilkan kembali visualisasi data aktual.
              </p>
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--text-on-primary)] text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua Filter</span>
              </button>
            </div>
          ) : (
            <>
              {/* BARIS PERTAMA: 3 Panel (Clustered Bar, Stacked Area, Donut) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3.5">
                {/* Panel 1: Sales / Performance by Category (Clustered Bar Chart) */}
                <BiChartPanel
                  id="panel-clustered-category"
                  title={`Performance by ${activeCategoryCol || 'Category'}`}
                  subtitle={`Klik bar untuk cross-filter · Klik kanan untuk Drill Down`}
                  drillTrail={categoryDrill.filters.map(f => `${f.column}: ${f.value}`)}
                  onDrillUp={handleCategoryDrillUp}
                  className="xl:col-span-4 min-w-0"
                  subToolbar={
                    <div className="w-full flex items-center justify-between gap-2 text-[10px]">
                      <span className="text-[var(--text-secondary)] truncate">
                        Urutan {activeCategoryCol || 'Kategori'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setClusterSort(prev => (prev === 'desc' ? 'asc' : prev === 'asc' ? 'alpha' : 'desc'))
                        }
                        title="Ubah urutan kategori"
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[10px] font-semibold text-[var(--text-main)] cursor-pointer shrink-0"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        <span className="uppercase">{clusterSort}</span>
                      </button>
                    </div>
                  }
                  onViewDetails={() => setTableExpanded(true)}
                  onAnalyzeWithAi={() => handleAnalyzeWithAi(null)}
                  onExportData={() => exportToCsv(clusteredData, `${datasetName}_category_performance.csv`)}
                >
                  <div className={`${chartHeightClass} w-full`}>
                    {clusteredData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={clusteredData}
                          margin={{ top: 22, right: 8, left: 0, bottom: 6 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} vertical={false} />
                          <XAxis
                            dataKey="name"
                            stroke={chartTheme.axisStroke}
                            tick={{ fontSize: 9.5, fill: chartTheme.axisTickColor }}
                            interval={0}
                            tickFormatter={(v) => (String(v).length > 9 ? `${String(v).slice(0, 8)}…` : v)}
                          />
                          <YAxis
                            stroke={chartTheme.axisStroke}
                            tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                            tickFormatter={(v) => formatBiMetric(Number(v), schema.primaryMetric, true)}
                            width={54}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: chartTheme.tooltipBg,
                              borderColor: chartTheme.tooltipBorder,
                              color: chartTheme.tooltipText,
                              borderRadius: '10px',
                              fontSize: '11px',
                            }}
                            formatter={(val: any, name: any) => [
                              formatBiMetric(Number(val), String(name), false),
                              String(name),
                            ]}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Bar
                            dataKey="primary"
                            name={schema.primaryMetric || 'Primary'}
                            fill={chartColors[0]}
                            radius={[4, 4, 0, 0]}
                            className="cursor-pointer"
                            onClick={(data: any) => {
                              if (data?.name && activeCategoryCol) {
                                handleToggleCrossFilter(activeCategoryCol, data.name, 'clustered');
                              }
                            }}
                          >
                            {clusteredData.map(entry => {
                              const dim = crossFilter?.column === activeCategoryCol ? crossFilter.value : null;
                              return (
                                <Cell
                                  key={entry.name}
                                  fill={chartColors[0]}
                                  fillOpacity={dim && dim !== entry.name ? 0.35 : 0.95}
                                />
                              );
                            })}
                            <LabelList
                              dataKey="sharePct"
                              position="top"
                              formatter={(v: any) => `${v}%`}
                              style={{ fontSize: '9px', fill: chartTheme.axisTickColor }}
                            />
                          </Bar>
                          {schema.secondaryMetric && (
                            <Bar
                              dataKey="secondary"
                              name={schema.secondaryMetric}
                              fill={chartColors[1]}
                              radius={[4, 4, 0, 0]}
                              className="cursor-pointer"
                              onClick={(data: any) => {
                                if (data?.name && activeCategoryCol) {
                                  handleToggleCrossFilter(activeCategoryCol, data.name, 'clustered');
                                }
                              }}
                            />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">
                        Tidak ada kolom kategori untuk perbandingan
                      </div>
                    )}
                  </div>
                  {clusteredData.length > 0 && activeCategoryCol && (
                    <div className="mt-1.5 flex items-center justify-between gap-1.5 flex-wrap text-[10px] text-[var(--text-secondary)]">
                      <span className="shrink-0">Aksi cepat drill / filter:</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {clusteredData.slice(0, 3).map(item => (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => handleCategoryDrillDown(activeCategoryCol, item.name)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({
                                panelId: 'clustered',
                                panelTitle: `Performance by ${activeCategoryCol}`,
                                column: activeCategoryCol,
                                value: item.name,
                                x: e.clientX,
                                y: e.clientY,
                              });
                            }}
                            className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] whitespace-nowrap cursor-pointer"
                            title={`Drill down ke ${item.name}`}
                          >
                            {item.name} ↘
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </BiChartPanel>

                {/* Panel 2: Performance Trend Analysis (Stacked Area Chart) */}
                <BiChartPanel
                  id="panel-stacked-trend"
                  title="Performance Trend Analysis"
                  subtitle={
                    stackedTrend.hasDateAxis
                      ? `Tren ${schema.primaryMetric || 'Metrik'} berdasarkan ${GRANULARITY_LABELS[timeDrill.granularity]}`
                      : 'Tren urutan aktual (dataset tanpa kolom tanggal)'
                  }
                  className="xl:col-span-5 min-w-0"
                  subToolbar={
                    stackedTrend.hasDateAxis ? (
                      <div className="w-full flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] text-[var(--text-secondary)]">Granularitas waktu:</span>
                        <div
                          role="group"
                          aria-label="Granularitas Waktu"
                          className="flex items-center p-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px]"
                        >
                          {(['year', 'quarter', 'month', 'day'] as TimeGranularity[]).map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setTimeDrill({ granularity: g })}
                              className={`px-1.5 py-0.5 rounded font-semibold transition-theme cursor-pointer ${
                                timeDrill.granularity === g
                                  ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                              }`}
                            >
                              {GRANULARITY_LABELS[g]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : undefined
                  }
                  onViewDetails={() => setTableExpanded(true)}
                  onAnalyzeWithAi={() => handleAnalyzeWithAi(null)}
                  onExportData={() => exportToCsv(stackedTrend.data, `${datasetName}_trend_series.csv`)}
                >
                  <div className={`${chartHeightClass} w-full`}>
                    {stackedTrend.data.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={stackedTrend.data}
                          margin={{ top: 10, right: 10, left: 0, bottom: 4 }}
                          onClick={(state: any) => {
                            if (state?.activeLabel && stackedTrend.hasDateAxis) {
                              handleToggleCrossFilter('__TIME_BUCKET__', state.activeLabel, 'trend');
                            }
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                          <XAxis
                            dataKey="label"
                            stroke={chartTheme.axisStroke}
                            tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                          />
                          <YAxis
                            stroke={chartTheme.axisStroke}
                            tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                            tickFormatter={(v) => formatBiMetric(Number(v), schema.primaryMetric, true)}
                            width={52}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: chartTheme.tooltipBg,
                              borderColor: chartTheme.tooltipBorder,
                              color: chartTheme.tooltipText,
                              borderRadius: '10px',
                              fontSize: '11px',
                            }}
                            formatter={(val: any, name: any) => [
                              formatBiMetric(Number(val), schema.primaryMetric, false),
                              String(name),
                            ]}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          {stackedTrend.seriesKeys.map((sk, idx) => {
                            const c = chartColors[idx % chartColors.length];
                            return (
                              <Area
                                key={sk}
                                type="monotone"
                                dataKey={sk}
                                stackId="1"
                                stroke={c}
                                fill={c}
                                fillOpacity={0.42}
                                strokeWidth={2}
                              />
                            );
                          })}
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">
                        Data tren tidak mencukupi
                      </div>
                    )}
                  </div>
                </BiChartPanel>

                {/* Panel 3: Category Distribution (Donut Chart) */}
                <BiChartPanel
                  id="panel-category-donut"
                  title="Category Distribution"
                  subtitle={`Proporsi ${donutCategoryCol || 'Segmen'} · Klik slice untuk cross-filter`}
                  className="md:col-span-2 xl:col-span-3 min-w-0"
                  onViewDetails={() => setTableExpanded(true)}
                  onAnalyzeWithAi={() => handleAnalyzeWithAi(null)}
                  onExportData={() => exportToCsv(donutData, `${datasetName}_distribution.csv`)}
                >
                  <div className="w-full flex flex-col justify-between gap-2">
                    {donutData.length > 0 ? (
                      <>
                        <div className="h-[132px] w-full shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={donutData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius="46%"
                                outerRadius="76%"
                                paddingAngle={2}
                                className="cursor-pointer"
                                onClick={(entry: any) => {
                                  if (entry?.name && donutCategoryCol) {
                                    handleToggleCrossFilter(donutCategoryCol, entry.name, 'donut');
                                  }
                                }}
                              >
                                {donutData.map((entry, idx) => {
                                  const activeSlice =
                                    crossFilter?.column === donutCategoryCol ? crossFilter.value : null;
                                  return (
                                    <Cell
                                      key={entry.name}
                                      fill={chartColors[idx % chartColors.length]}
                                      fillOpacity={activeSlice && activeSlice !== entry.name ? 0.35 : 1}
                                      stroke="var(--bg-card)"
                                      strokeWidth={2}
                                    />
                                  );
                                })}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: chartTheme.tooltipBg,
                                  borderColor: chartTheme.tooltipBorder,
                                  color: chartTheme.tooltipText,
                                  borderRadius: '10px',
                                  fontSize: '11px',
                                }}
                                formatter={(val: any, name: any, item: any) => [
                                  `${formatBiMetric(Number(val), schema.primaryMetric, false)} (${item?.payload?.percentage ?? 0}%)`,
                                  String(name),
                                ]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="space-y-0.5">
                          {donutData.slice(0, 4).map((slice, idx) => {
                            const isSelected =
                              crossFilter?.column === donutCategoryCol && crossFilter.value === slice.name;
                            return (
                              <button
                                key={slice.name}
                                type="button"
                                onClick={() => handleToggleCrossFilter(donutCategoryCol, slice.name, 'donut')}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setContextMenu({
                                    panelId: 'donut',
                                    panelTitle: 'Category Distribution',
                                    column: donutCategoryCol,
                                    value: slice.name,
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                                }}
                                className={`w-full flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded cursor-pointer ${
                                  isSelected ? 'bg-[var(--bg-caramel-soft)] font-bold' : 'hover:bg-[var(--bg-secondary)]'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 truncate text-[var(--text-main)]">
                                  <span
                                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                                    style={{ backgroundColor: chartColors[idx % chartColors.length] }}
                                  />
                                  <span className="truncate">{slice.name}</span>
                                </span>
                                <span className="tabular-nums text-[var(--text-secondary)] shrink-0 ml-1">
                                  {slice.percentage}%
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">
                        Tidak ada data distribusi kategori
                      </div>
                    )}
                  </div>
                </BiChartPanel>
              </div>

              {/* BARIS KEDUA: 2 Panel (Comparative Performance + 6 KPI Sparkline Cards) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-stretch">
                {/* Panel 1: Comparative Performance Analysis */}
                <BiChartPanel
                  id="panel-comparative-performance"
                  title="Comparative Performance Analysis"
                  subtitle={
                    schema.dateCol
                      ? `Perubahan antarperiode (${GRANULARITY_LABELS[timeDrill.granularity]}: Growth vs Decline)`
                      : 'Deviasi kategori terhadap rata-rata keseluruhan (%)'
                  }
                  className="xl:col-span-5 min-w-0"
                  onViewDetails={() => setTableExpanded(true)}
                  onAnalyzeWithAi={() => handleAnalyzeWithAi(null)}
                  onExportData={() => exportToCsv(comparativeData, `${datasetName}_comparative_growth.csv`)}
                >
                  <div className="h-56 w-full">
                    {comparativeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={comparativeData}
                          margin={{ top: 18, right: 10, left: 0, bottom: 12 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} vertical={false} />
                          <XAxis
                            dataKey="period"
                            stroke={chartTheme.axisStroke}
                            tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                          />
                          <YAxis
                            stroke={chartTheme.axisStroke}
                            tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                            tickFormatter={(v) => `${v}%`}
                            width={44}
                            domain={[
                              (dataMin: number) => Math.min(-35, Math.floor(dataMin - 16)),
                              (dataMax: number) => Math.max(20, Math.ceil(dataMax + 16)),
                            ]}
                          />
                          <ReferenceLine y={0} stroke={chartTheme.axisStroke} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: chartTheme.tooltipBg,
                              borderColor: chartTheme.tooltipBorder,
                              color: chartTheme.tooltipText,
                              borderRadius: '10px',
                              fontSize: '11px',
                            }}
                            formatter={(val: any, _name: any, item: any) => {
                              const p = item?.payload;
                              return [
                                `${Number(val) >= 0 ? '+' : ''}${val}% (Δ ${formatBiMetric(p?.delta || 0, schema.primaryMetric)})`,
                                'Perubahan',
                              ];
                            }}
                          />
                          <Bar dataKey="deltaPct" name="Delta (%)" radius={[4, 4, 0, 0]}>
                            {comparativeData.map((entry, idx) => (
                              <Cell
                                key={`${entry.period}-${idx}`}
                                fill={entry.isPositive ? chartTheme.success : chartTheme.danger}
                              />
                            ))}
                            <LabelList
                              dataKey="deltaPct"
                              content={(props: any) => {
                                const { x, y, width, height, value } = props;
                                const num = Number(value ?? 0);
                                if (!Number.isFinite(num)) return null;
                                const cx = Number(x) + Number(width) / 2;
                                const yNum = Number(y);
                                const hNum = Number(height);
                                const topY = Math.min(yNum, yNum + hNum);
                                const bottomY = Math.max(yNum, yNum + hNum);
                                const labelY = num >= 0 ? topY - 5 : bottomY + 11;
                                return (
                                  <text
                                    x={cx}
                                    y={labelY}
                                    textAnchor="middle"
                                    fontSize={9}
                                    fontWeight={600}
                                    fill={chartTheme.axisTickColor}
                                  >
                                    {`${num >= 0 ? '+' : ''}${num}%`}
                                  </text>
                                );
                              }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">
                        Memerlukan minimal 2 periode untuk perbandingan
                      </div>
                    )}
                  </div>
                </BiChartPanel>

                {/* Panel 2: KPI Performance Cards (6 Compact Cards with Trend Arrow + Sparkline) */}
                <section
                  aria-label="Panel Indikator Kinerja Utama"
                  className="xl:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3"
                >
                  {kpiCards.map((kpi, idx) => {
                    const isUp = kpi.trend === 'up';
                    const isDown = kpi.trend === 'down';
                    const trendColor = isUp
                      ? 'var(--color-success)'
                      : isDown
                      ? 'var(--color-danger)'
                      : 'var(--text-secondary)';
                    const sparkStroke = isUp
                      ? chartTheme.success
                      : isDown
                      ? chartTheme.danger
                      : chartColors[idx % chartColors.length];

                    return (
                      <div
                        key={kpi.id}
                        className="rounded-xl surface-card p-3 flex flex-col justify-between hover:border-[var(--accent-caramel)] transition-theme min-w-0"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="text-[11px] font-semibold text-[var(--text-secondary)] truncate">
                            {kpi.label}
                          </span>
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums shrink-0"
                            style={{ color: trendColor }}
                          >
                            {isUp ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : isDown ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                            {kpi.deltaPct !== null ? `${kpi.deltaPct >= 0 ? '+' : ''}${kpi.deltaPct}%` : ''}
                          </span>
                        </div>

                        <div className="my-1.5">
                          <div
                            className="text-base sm:text-lg font-bold text-[var(--text-main)] tracking-tight tabular-nums truncate"
                            title={kpi.formattedValue}
                          >
                            {kpi.formattedValue}
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] truncate">
                            {kpi.subtitle}
                          </div>
                        </div>

                        {/* Inline Real Data Sparkline */}
                        <div className="h-9 w-full">
                          {kpi.sparkline.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={kpi.sparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                                <Area
                                  type="monotone"
                                  dataKey="value"
                                  stroke={sparkStroke}
                                  strokeWidth={1.75}
                                  fill={sparkStroke}
                                  fillOpacity={0.16}
                                  isAnimationActive={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full border-b border-dashed border-[var(--border-color)]" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>
              </div>

              {/* BARIS KETIGA: 2 Panel (Detailed Performance Grouped Bar + Geographical Analytics) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5">
                {/* Panel 1: Detailed Performance Analysis (Grouped Column Chart) */}
                <BiChartPanel
                  id="panel-detailed-grouped"
                  title={`Detailed Performance Analysis (${groupedDimensionCol || 'Metrik'})`}
                  subtitle={
                    detailedGroupedData[0]
                      ? `Perbandingan ${detailedGroupedData[0].groupALabel} vs ${detailedGroupedData[0].groupBLabel}`
                      : 'Perbandingan detail metrik antar segmen'
                  }
                  className="xl:col-span-6 min-w-0"
                  onViewDetails={() => setTableExpanded(true)}
                  onAnalyzeWithAi={() => handleAnalyzeWithAi(null)}
                  onExportData={() => exportToCsv(detailedGroupedData, `${datasetName}_detailed_grouped.csv`)}
                >
                  <div className="h-60 w-full">
                    {detailedGroupedData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={detailedGroupedData}
                          margin={{ top: 10, right: 10, left: 0, bottom: 6 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} vertical={false} />
                          <XAxis
                            dataKey="name"
                            stroke={chartTheme.axisStroke}
                            tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                            tickFormatter={(v) => (String(v).length > 12 ? `${String(v).slice(0, 11)}…` : v)}
                          />
                          <YAxis
                            stroke={chartTheme.axisStroke}
                            tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                            tickFormatter={(v) => formatBiMetric(Number(v), schema.primaryMetric, true)}
                            width={54}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: chartTheme.tooltipBg,
                              borderColor: chartTheme.tooltipBorder,
                              color: chartTheme.tooltipText,
                              borderRadius: '10px',
                              fontSize: '11px',
                            }}
                            formatter={(val: any, name: any) => [
                              formatBiMetric(Number(val), String(name), false),
                              String(name),
                            ]}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Bar
                            dataKey="groupA"
                            name={detailedGroupedData[0].groupALabel}
                            fill={chartColors[2]}
                            radius={[4, 4, 0, 0]}
                            className="cursor-pointer"
                            onClick={(data: any) => {
                              if (data?.name && groupedDimensionCol) {
                                handleToggleCrossFilter(groupedDimensionCol, data.name, 'grouped');
                              }
                            }}
                          />
                          <Bar
                            dataKey="groupB"
                            name={detailedGroupedData[0].groupBLabel}
                            fill={chartColors[4]}
                            radius={[4, 4, 0, 0]}
                            className="cursor-pointer"
                            onClick={(data: any) => {
                              if (data?.name && groupedDimensionCol) {
                                handleToggleCrossFilter(groupedDimensionCol, data.name, 'grouped');
                              }
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">
                        Memerlukan minimal 2 metrik atau dimensi pembanding
                      </div>
                    )}
                  </div>
                </BiChartPanel>

                {/* Panel 2: Geographical Analytics (or relevant fallback when dataset has no geo column) */}
                <BiChartPanel
                  id="panel-geographical-analytics"
                  title={geoData.hasGeoData ? `Geographical Analytics (${geoData.geoCol})` : 'Segment & Metric Distribution'}
                  subtitle={
                    geoData.hasGeoData
                      ? 'Distribusi wilayah aktual · Klik wilayah untuk cross-filter'
                      : 'Visualisasi alternatif karena dataset tidak memiliki kolom lokasi'
                  }
                  className="xl:col-span-6 min-w-0"
                  onViewDetails={() => setTableExpanded(true)}
                  onAnalyzeWithAi={() => handleAnalyzeWithAi(null)}
                  onExportData={() =>
                    exportToCsv(
                      geoData.hasGeoData ? geoData.regions : geoData.alternativeBreakdown.items,
                      `${datasetName}_geo_distribution.csv`
                    )
                  }
                >
                  <BiGeoMap
                    geo={geoData}
                    primaryMetric={schema.primaryMetric}
                    activeCrossFilterValue={
                      geoData.geoCol && crossFilter?.column === geoData.geoCol ? crossFilter.value : null
                    }
                    onSelectRegion={(region) => {
                      if (geoData.geoCol) {
                        handleToggleCrossFilter(geoData.geoCol, region, 'geo');
                      }
                    }}
                    onOpenContextMenu={(t) => setContextMenu(t)}
                    chartColors={chartColors}
                  />
                </BiChartPanel>
              </div>
            </>
          )}

          {/* Collapsible Data Records & Drill-Through Explorer */}
          <BiDataTablePanel
            rows={tableRows}
            datasetName={datasetName}
            isExpanded={tableExpanded}
            onToggleExpand={() => setTableExpanded(prev => !prev)}
            drillThroughLabel={
              drillThroughTarget ? `${drillThroughTarget.column} = ${drillThroughTarget.value}` : null
            }
            onClearDrillThrough={() => setDrillThroughTarget(null)}
          />
        </div>

        {/* B. AREA FILTER PANEL (~20-25% width on desktop, drawer on tablet/mobile) */}
        <BiRightFilterPanel
          schema={schema}
          draftFilters={draftFilters}
          appliedFilters={appliedFilters}
          crossFilter={crossFilter}
          allColumns={allColumns}
          onChangeDraft={setDraftFilters}
          onApply={() => {
            setAppliedFilters(draftFilters);
            addToast('success', 'Filter Diterapkan', 'Seluruh panel visualisasi dan KPI diperbarui.');
          }}
          onResetAll={handleResetAll}
          onClearCrossFilter={() => setCrossFilter(null)}
          isOpenDesktop={isFilterOpenDesktop}
          isDrawerOpenMobile={isFilterOpenMobile}
          onCloseMobileDrawer={() => setIsFilterOpenMobile(false)}
        />
      </div>

      {/* Right-Click BI Context Menu */}
      <BiContextMenu
        target={contextMenu}
        onClose={() => setContextMenu(null)}
        onDrillDown={handleContextMenuAction.drillDown}
        onDrillThrough={handleContextMenuAction.drillThrough}
        onViewDetails={handleContextMenuAction.viewDetails}
        onAnalyzeWithAi={handleContextMenuAction.analyzeWithAi}
        onAddToFilters={handleContextMenuAction.addToFilters}
        onExportSegment={handleContextMenuAction.exportSegment}
      />

      {/* AI Executive Brief Modal */}
      <BiAiAnalysisModal
        isOpen={aiModalOpen}
        isLoading={aiLoading}
        insights={aiInsights}
        liveNarrative={aiLiveNarrative}
        focusLabel={aiFocusLabel}
        onClose={() => setAiModalOpen(false)}
        onOpenFullAnalyst={() => setCurrentView('ai_analyst')}
      />
    </div>
  );
};
