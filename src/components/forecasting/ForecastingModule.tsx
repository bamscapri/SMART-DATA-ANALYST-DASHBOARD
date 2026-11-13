import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  ForecastMethod,
  ForecastModelId,
  ForecastHorizon,
  ConfidenceLevel,
  DataFrequency,
  HistoricalPeriodFilter,
  DuplicateAggregation,
  ForecastOutput,
  ModelComparisonRow,
  ValidationIssue,
  MODEL_CATALOG,
  runAdvancedForecastPipeline,
  prepareTimeSeries,
  computeTimeSeriesStats,
  compareForecastModels,
} from '../../utils/forecasting';
import { analyzeDataset } from '../../utils/analytics';
import { exportToCsv, exportToExcel, exportElementAsPng } from '../../utils/exportUtils';
import {
  ForecastHistoryRecord,
  fetchForecastHistoryFromSupabase,
  saveForecastToSupabase,
  deleteForecastFromSupabase,
} from '../../lib/supabaseService';
import {
  TrendingUp,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Shield,
  Download,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  Save,
  Layers,
  Database,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ArrowUpDown,
  Search,
  Send,
  FileSpreadsheet,
  Image as ImageIcon,
  Info,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  Brush,
} from 'recharts';

const LOCAL_HISTORY_KEY = 'smart_ai_forecast_history';

function readLocalForecastHistory(): ForecastHistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalForecastHistory(items: ForecastHistoryRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items.slice(0, 25)));
  } catch {
    // ignore storage quota errors
  }
}

const PRESET_QUESTIONS = [
  'Apa risiko terbesar yang terlihat dari Confidence Interval dan volatilitas data historis?',
  'Mengapa model terpilih mengungguli model kandidat lain pada backtesting?',
  'Berapa target konservatif dan target optimal yang disarankan untuk kuartal mendatang?',
];

export const ForecastingModule: React.FC = () => {
  const {
    datasets,
    selectedDataset,
    selectedDatasetId,
    selectDataset,
    activeSheet,
    setActiveSheet,
    currentStats,
    logActivity,
    addToast,
    supabaseAuthenticated,
    supabaseTablesReady,
  } = useApp();
  const { chartTheme } = useTheme();

  // Configuration state
  const [dateCol, setDateCol] = useState<string>('');
  const [targetCol, setTargetCol] = useState<string>('');
  const [categoryCol, setCategoryCol] = useState<string>('');
  const [segmentValue, setSegmentValue] = useState<string>('ALL');
  const [frequency, setFrequency] = useState<DataFrequency>('auto');
  const [historicalPeriod, setHistoricalPeriod] = useState<HistoricalPeriodFilter>('all');
  const [aggregation, setAggregation] = useState<DuplicateAggregation>('sum');
  const [method, setMethod] = useState<ForecastMethod>('auto');
  const [horizon, setHorizon] = useState<ForecastHorizon>('30d');
  const [customSteps, setCustomSteps] = useState<number>(14);
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>(0.95);
  const [scenarioShockPct, setScenarioShockPct] = useState<number>(12);

  // Execution & validation state
  const [forecastResult, setForecastResult] = useState<ForecastOutput | null>(null);
  const [blockingError, setBlockingError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [modelComparisons, setModelComparisons] = useState<ModelComparisonRow[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  // Chart toggles
  const [showHistoricalLine, setShowHistoricalLine] = useState<boolean>(true);
  const [showCiBand, setShowCiBand] = useState<boolean>(true);
  const [showTrendLine, setShowTrendLine] = useState<boolean>(true);
  const [showBacktestLine, setShowBacktestLine] = useState<boolean>(true);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);

  // Results Table controls
  const [tableFilterStatus, setTableFilterStatus] = useState<'ALL' | 'Historical' | 'Backtest' | 'Forecast'>('ALL');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableSortKey, setTableSortKey] = useState<'index' | 'date' | 'historical' | 'forecast' | 'lowerBound' | 'upperBound'>('index');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('asc');
  const [tablePage, setTablePage] = useState<number>(1);
  const [tablePageSize, setTablePageSize] = useState<number>(12);

  // Backtest detail toggle
  const [showBacktestTable, setShowBacktestTable] = useState<boolean>(true);

  // AI Interpretation & Q&A state
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiModelUsed, setAiModelUsed] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // History state
  const [historyRecords, setHistoryRecords] = useState<ForecastHistoryRecord[]>(() => readLocalForecastHistory());
  const [isSavingHistory, setIsSavingHistory] = useState<boolean>(false);

  const comparisonSectionRef = useRef<HTMLDivElement | null>(null);
  const lastDatasetSheetKeyRef = useRef<string>('');

  const availableColumns = useMemo(() => {
    return Object.keys(selectedDataset?.data?.[0] || {});
  }, [selectedDataset]);

  const segmentOptions = useMemo(() => {
    if (!categoryCol || !selectedDataset?.data) return [];
    const unique = new Set<string>();
    for (const row of selectedDataset.data) {
      const v = row[categoryCol];
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        unique.add(String(v).trim());
      }
    }
    return Array.from(unique).slice(0, 50);
  }, [selectedDataset, categoryCol]);

  // Auto-sync columns when dataset or active sheet changes
  useEffect(() => {
    const rows = selectedDataset?.data || [];
    const contextKey = `${selectedDataset?.id || ''}::${selectedDataset?.activeSheet || activeSheet || ''}`;

    if (rows.length === 0) {
      lastDatasetSheetKeyRef.current = contextKey;
      setDateCol('');
      setTargetCol('');
      setCategoryCol('');
      setSegmentValue('ALL');
      return;
    }

    const sheetStats = analyzeDataset(rows);
    const cols = Object.keys(rows[0] || {});

    const nextDateCol =
      sheetStats.dateCols.find(c => cols.includes(c)) ||
      cols.find(c => /date|tanggal|time|waktu|bulan|month|year|tahun|period/i.test(c)) ||
      cols[0] ||
      '';

    const nextTargetCol =
      sheetStats.numericCols.find(c => /revenue|omset|sales|penjualan|profit|laba|mrr|value|nilai|skor|score|jumlah/i.test(c)) ||
      sheetStats.numericCols[0] ||
      cols.find(c => typeof rows[0][c] === 'number') ||
      '';

    const contextChanged = lastDatasetSheetKeyRef.current !== contextKey;
    lastDatasetSheetKeyRef.current = contextKey;

    if (contextChanged) {
      setDateCol(nextDateCol);
      setTargetCol(nextTargetCol);
      setCategoryCol('');
      setSegmentValue('ALL');
    } else {
      setDateCol(prev => (cols.includes(prev) ? prev : nextDateCol));
      setTargetCol(prev => (cols.includes(prev) ? prev : nextTargetCol));
      setCategoryCol(prev => (prev && cols.includes(prev) ? prev : ''));
    }
  }, [selectedDataset?.id, selectedDataset?.activeSheet, selectedDataset?.data, activeSheet]);

  // Load Supabase history if authenticated & tables ready
  useEffect(() => {
    let mounted = true;
    const loadHistory = async () => {
      const localItems = readLocalForecastHistory();
      if (supabaseAuthenticated && supabaseTablesReady) {
        const res = await fetchForecastHistoryFromSupabase();
        if (mounted && res.records.length > 0) {
          const merged = [
            ...res.records,
            ...localItems.filter(l => l.source === 'local'),
          ].slice(0, 25);
          setHistoryRecords(merged);
          return;
        }
      }
      if (mounted) setHistoryRecords(localItems);
    };
    loadHistory();
    return () => {
      mounted = false;
    };
  }, [supabaseAuthenticated, supabaseTablesReady]);

  // Execute Forecasting Pipeline (Backend API with deterministic client fallback)
  const handleRunForecast = useCallback(
    async (overrideMethod?: ForecastMethod) => {
      const rows = selectedDataset?.data || [];
      const activeMethod = overrideMethod ?? method;

      if (!selectedDataset || rows.length === 0) {
        setForecastResult(null);
        setModelComparisons([]);
        setBlockingError('Dataset aktif kosong. Unggah atau pilih dataset yang memiliki data historis.');
        setValidationIssues([]);
        return;
      }

      setIsRunning(true);
      setProgressMsg('Memvalidasi deret waktu & menghitung rolling-origin backtest...');

      const payload = {
        rows,
        dateColumn: dateCol,
        targetColumn: targetCol,
        categoryColumn: categoryCol || undefined,
        segmentValue: categoryCol ? segmentValue : undefined,
        frequency,
        historicalPeriod,
        aggregation,
        method: activeMethod,
        horizon,
        customSteps: horizon === 'custom' ? customSteps : undefined,
        confidenceLevel,
        scenarioShockPct,
      };

      try {
        const res = await fetch('/api/forecast/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || !data.success || !data.result) {
          setForecastResult(null);
          setModelComparisons([]);
          setBlockingError(data.error || 'Dataset tidak memenuhi syarat validasi time-series.');
          setValidationIssues(Array.isArray(data.issues) ? data.issues : []);
          return;
        }

        setBlockingError(null);
        setValidationIssues(data.issues || []);
        setForecastResult(data.result);
        setModelComparisons(data.result.modelComparisons || []);
        setLastRunAt(new Date().toISOString());
        setTablePage(1);
      } catch {
        // Offline / local deterministic fallback using exact same shared engine
        const fallback = runAdvancedForecastPipeline(payload);
        if (!fallback.success || !fallback.result) {
          setForecastResult(null);
          setModelComparisons([]);
          setBlockingError(fallback.error || 'Dataset tidak valid untuk forecasting.');
          setValidationIssues(fallback.issues);
          return;
        }
        setBlockingError(null);
        setValidationIssues(fallback.issues);
        setForecastResult(fallback.result);
        setModelComparisons(fallback.result.modelComparisons || []);
        setLastRunAt(new Date().toISOString());
        setTablePage(1);
      } finally {
        setIsRunning(false);
        setProgressMsg('');
      }
    },
    [
      selectedDataset,
      dateCol,
      targetCol,
      categoryCol,
      segmentValue,
      frequency,
      historicalPeriod,
      aggregation,
      method,
      horizon,
      customSteps,
      confidenceLevel,
      scenarioShockPct,
    ]
  );

  // Auto-run when selected dataset/sheet/columns settle cleanly
  useEffect(() => {
    if (selectedDataset && dateCol && targetCol) {
      handleRunForecast();
    }
  }, [
    selectedDataset?.id,
    activeSheet,
    dateCol,
    targetCol,
    categoryCol,
    segmentValue,
    frequency,
    historicalPeriod,
    aggregation,
    method,
    horizon,
    customSteps,
    confidenceLevel,
    scenarioShockPct,
  ]);

  // Explicit Compare Models Button
  const handleCompareModels = async () => {
    const rows = selectedDataset?.data || [];
    if (rows.length === 0) return;

    setIsComparing(true);
    setProgressMsg('Melakukan benchmark seluruh 10 model statistik via Rolling-Origin Backtest...');

    const payload = {
      rows,
      dateColumn: dateCol,
      targetColumn: targetCol,
      categoryColumn: categoryCol || undefined,
      segmentValue: categoryCol ? segmentValue : undefined,
      frequency,
      historicalPeriod,
      aggregation,
    };

    try {
      const res = await fetch('/api/forecast/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setBlockingError(data.error || 'Gagal membandingkan model.');
        setValidationIssues(data.issues || []);
        addToast('error', 'Komparasi Model Gagal', data.error || 'Periksa kolom tanggal & target.');
        return;
      }

      setModelComparisons(data.comparisons || []);
      comparisonSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      addToast('success', 'Benchmark 10 Model Selesai', 'Peringkat akurasi model berdasarkan out-of-sample RMSE telah diperbarui.');
    } catch {
      const prep = prepareTimeSeries(payload);
      if (prep.valid) {
        const st = computeTimeSeriesStats(prep.points, prep.appliedFrequency);
        const cmp = compareForecastModels(prep.points, st);
        setModelComparisons(cmp);
        comparisonSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        addToast('success', 'Benchmark Model Selesai', 'Evaluasi seluruh model selesai dijalankan.');
      }
    } finally {
      setIsComparing(false);
      setProgressMsg('');
    }
  };

  // Reset Configuration
  const handleResetConfiguration = () => {
    setCategoryCol('');
    setSegmentValue('ALL');
    setFrequency('auto');
    setHistoricalPeriod('all');
    setAggregation('sum');
    setMethod('auto');
    setHorizon('30d');
    setCustomSteps(14);
    setConfidenceLevel(0.95);
    setScenarioShockPct(12);
    setAiAnalysis(null);
    setAiQuestion('');
    addToast('info', 'Konfigurasi Direset', 'Parameter forecasting dikembalikan ke pengaturan optimal standar.');
  };

  // Request AI Strategic Interpretation & Q&A
  const handleRequestAiAnalysis = async (customQuestion?: string) => {
    if (!forecastResult) return;
    const questionText = (customQuestion ?? aiQuestion).trim();
    setIsAnalyzing(true);
    setProgressMsg('Menyusun interpretasi AI terstruktur 8 bagian berbasis angka terhitung...');

    try {
      const res = await fetch('/api/ai/forecast-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName: selectedDataset?.name || 'Dataset Aktif',
          metricName: targetCol,
          dateColumn: dateCol,
          horizon,
          horizonSteps: forecastResult.horizonSteps,
          appliedFrequency: forecastResult.appliedFrequency,
          method: forecastResult.evaluation.selectedModelId,
          modelName: forecastResult.evaluation.selectedModelName,
          confidenceLevel: `${Math.round(confidenceLevel * 100)}% CI`,
          evaluation: forecastResult.evaluation,
          statistics: forecastResult.statistics,
          backtestSample: forecastResult.backtestPoints.slice(-10),
          pointsSample: forecastResult.points.filter(p => p.status === 'Forecast').slice(0, 12),
          scenarios: forecastResult.scenarios,
          question: questionText || undefined,
        }),
      });

      if (!res.ok) throw new Error('Gagal memproses interpretasi AI.');
      const data = await res.json();
      setAiAnalysis(data.analysis);
      setAiModelUsed(data.model || 'gemini-4-hydrogen');

      logActivity(
        'RUN_FORECAST',
        'Forecasting',
        targetCol,
        `Model: ${forecastResult.evaluation.selectedModelName}, Horizon: ${forecastResult.horizonSteps} langkah, CI: ${Math.round(confidenceLevel * 100)}%`
      );
      addToast('success', 'Interpretasi AI Selesai', 'Ringkasan 8 bagian berbasis metrik aktual siap ditinjau.');
    } catch (err: any) {
      addToast('error', 'Gagal Mendapatkan Analisis AI', err.message || 'Kesalahan koneksi server');
    } finally {
      setIsAnalyzing(false);
      setProgressMsg('');
    }
  };

  // Save Forecast to Supabase & Local History
  const handleSaveForecast = async () => {
    if (!forecastResult || !selectedDataset) return;
    setIsSavingHistory(true);

    const historicalData = forecastResult.points
      .filter(p => p.historical !== undefined)
      .map(p => ({ date: p.date, value: p.historical }));

    const forecastData = forecastResult.points
      .filter(p => p.status === 'Forecast')
      .map(p => ({
        date: p.date,
        forecast: p.forecast,
        lower80: p.lower80,
        upper80: p.upper80,
        lower95: p.lower95,
        upper95: p.upper95,
      }));

    const title = `${targetCol} · ${forecastResult.evaluation.selectedModelName} (${forecastResult.horizonSteps} ${forecastResult.appliedFrequency})`;

    const draftRecord: Omit<ForecastHistoryRecord, 'id' | 'source' | 'createdAt'> = {
      datasetId: selectedDataset.id,
      datasetName: selectedDataset.name,
      sheetName: selectedDataset.activeSheet || activeSheet,
      title,
      dateColumn: dateCol,
      targetColumn: targetCol,
      categoryColumn: categoryCol || undefined,
      segmentValue: categoryCol ? segmentValue : undefined,
      method: forecastResult.evaluation.selectedModelId,
      horizon,
      customSteps: horizon === 'custom' ? customSteps : undefined,
      frequency,
      historicalPeriod,
      aggregation,
      confidenceLevel,
      historicalData,
      forecastData,
      evaluation: forecastResult.evaluation,
      statistics: forecastResult.statistics,
      scenarios: forecastResult.scenarios,
      backtestPoints: forecastResult.backtestPoints,
      aiAnalysis,
    };

    try {
      const sbRes = await saveForecastToSupabase(draftRecord, selectedDataset);
      if (sbRes.success && sbRes.savedRecord) {
        const updated = [sbRes.savedRecord, ...historyRecords].slice(0, 25);
        setHistoryRecords(updated);
        writeLocalForecastHistory(updated.filter(r => r.source === 'local'));
        addToast('success', 'Tersimpan ke Supabase', sbRes.message);
      } else {
        const localRecord: ForecastHistoryRecord = {
          ...draftRecord,
          id: `fc-local-${Date.now()}`,
          source: 'local',
          createdAt: new Date().toISOString(),
        };
        const updated = [localRecord, ...historyRecords].slice(0, 25);
        setHistoryRecords(updated);
        writeLocalForecastHistory(updated.filter(r => r.source === 'local'));
        addToast('info', 'Tersimpan di Riwayat Lokal', sbRes.message);
      }
      logActivity('SAVE_FORECAST', 'Forecasting', title, `RMSE: ${forecastResult.evaluation.rmse}`);
    } finally {
      setIsSavingHistory(false);
    }
  };

  const handleLoadHistoryRecord = (rec: ForecastHistoryRecord) => {
    const matchedDs = datasets.find(d => d.id === rec.datasetId || d.name === rec.datasetName);
    if (matchedDs) {
      selectDataset(matchedDs.id);
      if (rec.sheetName && matchedDs.sheets?.some(s => s.name === rec.sheetName)) {
        setActiveSheet(rec.sheetName);
      }
    }
    if (rec.dateColumn) setDateCol(rec.dateColumn);
    if (rec.targetColumn) setTargetCol(rec.targetColumn);
    setCategoryCol(rec.categoryColumn || '');
    setSegmentValue(rec.segmentValue || 'ALL');
    setFrequency((rec.frequency as DataFrequency) || 'auto');
    setHistoricalPeriod((rec.historicalPeriod as HistoricalPeriodFilter) || 'all');
    setAggregation((rec.aggregation as DuplicateAggregation) || 'sum');
    setMethod((rec.method as ForecastMethod) || 'auto');
    setHorizon((rec.horizon as ForecastHorizon) || '30d');
    if (rec.customSteps) setCustomSteps(rec.customSteps);
    if (rec.confidenceLevel) setConfidenceLevel(rec.confidenceLevel as ConfidenceLevel);
    if (rec.aiAnalysis) setAiAnalysis(rec.aiAnalysis);

    addToast('success', 'Konfigurasi Riwayat Dimuat', `Menjalankan ulang "${rec.title}".`);
  };

  const handleDeleteHistoryRecord = async (rec: ForecastHistoryRecord) => {
    if (rec.source === 'supabase') {
      await deleteForecastFromSupabase(rec.id);
    }
    const next = historyRecords.filter(r => r.id !== rec.id);
    setHistoryRecords(next);
    writeLocalForecastHistory(next.filter(r => r.source === 'local'));
    addToast('info', 'Riwayat Dihapus', `"${rec.title}" dihapus dari daftar.`);
  };

  // Export functions
  const buildExportRows = () => {
    if (!forecastResult) return [];
    return forecastResult.points.map((p, idx) => ({
      Step: idx + 1,
      Date_Period: p.date,
      Historical: p.historical ?? '',
      Forecast: p.forecast ?? '',
      Lower_Bound_Selected_CI: p.lowerBound ?? '',
      Upper_Bound_Selected_CI: p.upperBound ?? '',
      Lower_80_CI: p.lower80 ?? '',
      Upper_80_CI: p.upper80 ?? '',
      Lower_95_CI: p.lower95 ?? '',
      Upper_95_CI: p.upper95 ?? '',
      Trend_Line: p.trendLine ?? '',
      Status: p.status || '',
      Model: forecastResult.evaluation.selectedModelName,
    }));
  };

  const handleExportCsv = () => {
    const rows = buildExportRows();
    if (rows.length === 0) return;
    exportToCsv(rows, `${selectedDataset?.name || 'Dataset'}_Forecast_${targetCol}.csv`);
    setExportMenuOpen(false);
    addToast('success', 'CSV Forecast Diunduh', 'Tabel lengkap historis & proyeksi tersimpan.');
  };

  const handleExportExcel = () => {
    const rows = buildExportRows();
    if (rows.length === 0) return;
    exportToExcel(rows, 'Forecast_Results', `${selectedDataset?.name || 'Dataset'}_Forecast_${targetCol}.xlsx`);
    setExportMenuOpen(false);
    addToast('success', 'Excel Forecast Diunduh', 'File .xlsx hasil forecasting berhasil dibuat.');
  };

  const handleDownloadChartPng = async () => {
    setExportMenuOpen(false);
    await exportElementAsPng('forecast-chart-capture', `Forecast_Chart_${targetCol}.png`);
    addToast('success', 'Gambar Chart Diunduh', 'Grafik forecasting disimpan sebagai PNG.');
  };

  // Forecast start marker date for ReferenceLine
  const forecastStartDate = useMemo(() => {
    if (!forecastResult) return null;
    const histPts = forecastResult.points.filter(p => p.historical !== undefined);
    return histPts.length > 0 ? histPts[histPts.length - 1].date : null;
  }, [forecastResult]);

  // Filtered, sorted, paginated table rows
  const processedTableRows = useMemo(() => {
    if (!forecastResult) return [];
    const evalTrend = forecastResult.evaluation.trend;

    let mapped = forecastResult.points.map((p, idx) => ({
      ...p,
      index: idx + 1,
      trendLabel: evalTrend,
      statusLabel: p.status || (p.historical !== undefined ? 'Historical' : 'Forecast'),
    }));

    if (tableFilterStatus !== 'ALL') {
      mapped = mapped.filter(r => r.statusLabel === tableFilterStatus);
    }

    if (tableSearch.trim()) {
      const q = tableSearch.trim().toLowerCase();
      mapped = mapped.filter(r => r.date.toLowerCase().includes(q) || r.statusLabel.toLowerCase().includes(q));
    }

    mapped.sort((a, b) => {
      const dir = tableSortDir === 'asc' ? 1 : -1;
      if (tableSortKey === 'date') return a.date.localeCompare(b.date) * dir;
      if (tableSortKey === 'index') return (a.index - b.index) * dir;
      const va = Number(a[tableSortKey] ?? -Infinity);
      const vb = Number(b[tableSortKey] ?? -Infinity);
      return (va - vb) * dir;
    });

    return mapped;
  }, [forecastResult, tableFilterStatus, tableSearch, tableSortKey, tableSortDir]);

  const totalPages = Math.max(1, Math.ceil(processedTableRows.length / tablePageSize));
  const safePage = Math.min(tablePage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * tablePageSize;
    return processedTableRows.slice(start, start + tablePageSize);
  }, [processedTableRows, safePage, tablePageSize]);

  const toggleSort = (key: typeof tableSortKey) => {
    if (tableSortKey === key) {
      setTableSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortKey(key);
      setTableSortDir('asc');
    }
  };

  const formatNum = (val: number | null | undefined, digits = 2) => {
    if (val === null || val === undefined || !Number.isFinite(val)) return '-';
    return val.toLocaleString('id-ID', { maximumFractionDigits: digits });
  };

  const formatCompactMetric = (val: number | null | undefined) => {
    if (val === null || val === undefined || !Number.isFinite(val)) return '-';
    const abs = Math.abs(val);
    if (abs >= 1e12) return val.toExponential(2);
    if (abs >= 1e9) return `${(val / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} B`;
    return val.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  };

  const ciPctLabel = Math.round(confidenceLevel * 100);

  return (
    <div className="p-5 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* ==================== A. FORECASTING OVERVIEW ==================== */}
      <section className="p-5 rounded-2xl surface-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[var(--bg-caramel-soft)] text-[var(--color-primary)] border border-[var(--accent-caramel)]">
                <TrendingUp className="w-3.5 h-3.5" />
                PREDICTIVE ANALYTICS ENGINE
              </span>
              {forecastResult && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border"
                  style={{
                    backgroundColor:
                      forecastResult.evaluation.validationStatus === 'VALIDATED'
                        ? 'var(--bg-success-soft)'
                        : 'var(--bg-warning-soft)',
                    borderColor:
                      forecastResult.evaluation.validationStatus === 'VALIDATED'
                        ? 'var(--color-success)'
                        : 'var(--color-warning)',
                    color:
                      forecastResult.evaluation.validationStatus === 'VALIDATED'
                        ? 'var(--color-success)'
                        : 'var(--color-warning)',
                  }}
                >
                  {forecastResult.evaluation.validationStatus === 'VALIDATED' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {forecastResult.evaluation.validationStatus}
                </span>
              )}
              {lastRunAt && (
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Terakhir dihitung: {new Date(lastRunAt).toLocaleTimeString('id-ID')}
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-[var(--text-main)]">
              Modul Forecasting & Prediksi Statistik Masa Depan
            </h1>
            <p className="text-xs text-[var(--text-secondary)] max-w-3xl">
              Sistem predictive analytics berbasis evaluasi out-of-sample rolling-origin backtesting dengan 10 model statistik time-series, interval prediksi 80% & 95%, analisis skenario, dan interpretasi strategis AI.
            </p>
          </div>

          {/* 5 Required Functional Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleRunForecast()}
              disabled={isRunning || !selectedDataset}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] text-xs font-semibold shadow-2xs transition-theme disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunning ? 'Menghitung...' : 'Run Forecast'}</span>
            </button>

            <button
              type="button"
              onClick={handleCompareModels}
              disabled={isComparing || !selectedDataset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-semibold border border-[var(--border-color)] transition-theme disabled:opacity-50 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>{isComparing ? 'Benchmarking...' : 'Compare Models'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetConfiguration}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-main)] text-xs font-semibold border border-[var(--border-color)] transition-theme cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Configuration</span>
            </button>

            <button
              type="button"
              onClick={handleSaveForecast}
              disabled={!forecastResult || isSavingHistory}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-semibold border border-[var(--accent-caramel)] transition-theme disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>{isSavingHistory ? 'Menyimpan...' : 'Save Forecast'}</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen(prev => !prev)}
                disabled={!forecastResult}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-main)] text-xs font-semibold border border-[var(--border-color)] transition-theme disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>Export Results</span>
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 rounded-xl surface-card border border-[var(--border-color)] shadow-lg z-30 py-1 text-xs">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--color-success)]" />
                    <span>Export Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    <span>Export CSV (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadChartPng}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[var(--accent-caramel)]" />
                    <span>Download Chart (PNG)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {(isRunning || isComparing || isAnalyzing) && (
          <div className="pt-2">
            <div className="flex items-center justify-between text-[11px] text-[var(--color-primary)] font-medium mb-1">
              <span>{progressMsg || 'Memproses analisis statistik...'}</span>
              <span>Active Pipeline</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-[var(--color-primary)] animate-pulse" />
            </div>
          </div>
        )}
      </section>

      {/* ==================== B. DATASET SELECTION & VALIDATION ==================== */}
      <section className="p-5 rounded-2xl surface-card space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
            <Database className="w-4 h-4 text-[var(--color-primary)]" />
            <span>B. Seleksi Dataset, Dimensi Waktu & Prapemrosesan Data</span>
          </h2>
          {forecastResult && (
            <span className="text-[11px] font-mono text-[var(--text-secondary)]">
              Frekuensi Terdeteksi/Aktif: <strong className="text-[var(--color-primary)] uppercase">{forecastResult.appliedFrequency}</strong> · Observasi Bersih: <strong>{forecastResult.statistics.count} titik</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Dataset Selector */}
          <div>
            <label htmlFor="fc-dataset" className="text-[var(--text-main)] font-semibold block mb-1">
              Dataset Aktif
            </label>
            <select
              id="fc-dataset"
              value={selectedDatasetId}
              onChange={(e) => selectDataset(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] font-medium focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              {datasets.map(ds => (
                <option key={ds.id} value={ds.id}>
                  {ds.name}
                </option>
              ))}
            </select>
          </div>

          {/* Excel Sheet Selector (if multi-sheet) */}
          {selectedDataset?.sheets && selectedDataset.sheets.length > 0 && (
            <div>
              <label htmlFor="fc-sheet" className="text-[var(--text-main)] font-semibold block mb-1">
                Sheet / Tab Data
              </label>
              <select
                id="fc-sheet"
                value={selectedDataset.activeSheet || activeSheet}
                onChange={(e) => setActiveSheet(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] font-medium focus:outline-none focus:border-[var(--accent-caramel)]"
              >
                {selectedDataset.sheets.map(sh => (
                  <option key={sh.name} value={sh.name}>
                    {sh.name} ({sh.data.length} baris)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Column */}
          <div>
            <label htmlFor="fc-date-col" className="text-[var(--text-main)] font-semibold block mb-1">
              Kolom Tanggal / Periode
            </label>
            <select
              id="fc-date-col"
              value={dateCol}
              onChange={(e) => setDateCol(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] font-medium focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              {availableColumns.map(c => (
                <option key={c} value={c}>
                  {c} {currentStats.dateCols.includes(c) ? '(Date)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Target Numeric Column */}
          <div>
            <label htmlFor="fc-target-col" className="text-[var(--text-main)] font-semibold block mb-1">
              Target Variabel Numerik
            </label>
            <select
              id="fc-target-col"
              value={targetCol}
              onChange={(e) => setTargetCol(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] font-medium focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              {(currentStats.numericCols.length > 0 ? currentStats.numericCols : availableColumns).map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Category Filter Column */}
          <div>
            <label htmlFor="fc-category-col" className="text-[var(--text-main)] font-semibold block mb-1">
              Filter Kategori (Opsional)
            </label>
            <select
              id="fc-category-col"
              value={categoryCol}
              onChange={(e) => {
                setCategoryCol(e.target.value);
                setSegmentValue('ALL');
              }}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] font-medium focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              <option value="">-- Seluruh Data (Tanpa Segmentasi) --</option>
              {currentStats.categoricalCols.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Segment Value Selector */}
          {categoryCol && (
            <div>
              <label htmlFor="fc-segment-val" className="text-[var(--text-main)] font-semibold block mb-1">
                Nilai Segmen ({categoryCol})
              </label>
              <select
                id="fc-segment-val"
                value={segmentValue}
                onChange={(e) => setSegmentValue(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--accent-caramel)] rounded-lg px-3 py-2 text-[var(--color-primary)] font-semibold focus:outline-none"
              >
                <option value="ALL">Semua Segmen</option>
                {segmentOptions.map(val => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Frequency Selector */}
          <div>
            <label htmlFor="fc-frequency" className="text-[var(--text-main)] font-semibold block mb-1">
              Frekuensi Data
            </label>
            <select
              id="fc-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as DataFrequency)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] font-medium focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              <option value="auto">Auto-Detect Interval</option>
              <option value="daily">Daily (Harian)</option>
              <option value="weekly">Weekly (Mingguan)</option>
              <option value="monthly">Monthly (Bulanan)</option>
              <option value="quarterly">Quarterly (Kuartalan)</option>
              <option value="yearly">Yearly (Tahunan)</option>
            </select>
          </div>

          {/* Historical Period Filter */}
          <div>
            <label htmlFor="fc-hist-period" className="text-[var(--text-main)] font-semibold block mb-1">
              Periode Historis
            </label>
            <select
              id="fc-hist-period"
              value={historicalPeriod}
              onChange={(e) => setHistoricalPeriod(e.target.value as HistoricalPeriodFilter)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] font-medium focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              <option value="all">Seluruh Riwayat Tersedia</option>
              <option value="last_12">12 Periode Terakhir</option>
              <option value="last_30">30 Periode Terakhir</option>
              <option value="last_90">90 Periode Terakhir</option>
            </select>
          </div>

          {/* Duplicate Timestamp Aggregation */}
          <div>
            <label htmlFor="fc-aggregation" className="text-[var(--text-main)] font-semibold block mb-1">
              Agregasi Tanggal Duplikat
            </label>
            <select
              id="fc-aggregation"
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as DuplicateAggregation)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] font-medium focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              <option value="sum">SUM (Penjumlahan)</option>
              <option value="mean">MEAN (Rata-rata)</option>
            </select>
          </div>
        </div>

        {/* Blocking Validation Error Banner */}
        {blockingError && (
          <div
            role="alert"
            className="p-4 rounded-xl border flex items-start gap-3 text-xs"
            style={{
              backgroundColor: 'var(--bg-danger-soft)',
              borderColor: 'var(--color-danger)',
              color: 'var(--text-main)',
            }}
          >
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
            <div className="space-y-1">
              <div className="font-bold" style={{ color: 'var(--color-danger)' }}>
                Validasi Time-Series Gagal — Peramalan Dihentikan
              </div>
              <p>{blockingError}</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Tip: Pastikan kolom tanggal berisi format tanggal/periode kronologis valid dan kolom target berisi angka numerik (minimal 3 titik waktu).
              </p>
            </div>
          </div>
        )}

        {/* Non-blocking Preprocessing Warnings & Info */}
        {!blockingError && validationIssues.length > 0 && (
          <div className="space-y-2">
            {validationIssues.map((issue, idx) => (
              <div
                key={`${issue.code}-${idx}`}
                className="px-3.5 py-2.5 rounded-xl border flex items-center gap-2 text-[11px]"
                style={{
                  backgroundColor: issue.severity === 'warning' ? 'var(--bg-warning-soft)' : 'var(--bg-secondary)',
                  borderColor: issue.severity === 'warning' ? 'var(--color-warning)' : 'var(--border-color)',
                  color: 'var(--text-main)',
                }}
              >
                {issue.severity === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--color-warning)' }} />
                ) : (
                  <Info className="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
                )}
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ==================== C. STATISTICAL SUMMARY ==================== */}
      {forecastResult && (
        <section className="p-5 rounded-2xl surface-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--color-primary)]" />
              <span>C. Ringkasan Statistik Historis (Sebelum Forecasting)</span>
            </h2>
            <span className="text-[11px] text-[var(--text-secondary)]">
              Outliers (IQR): <strong className="text-[var(--text-main)]">{forecastResult.statistics.outliers.length}</strong> · Change Points:{' '}
              <strong className="text-[var(--text-main)]">{forecastResult.statistics.changePoints.length}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl surface-secondary">
              <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] block">Mean (Rata-rata)</span>
              <span className="text-sm font-bold font-mono tabular-nums text-[var(--text-main)]">
                {formatNum(forecastResult.statistics.mean)}
              </span>
            </div>
            <div className="p-3 rounded-xl surface-secondary">
              <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] block">Median & Modus</span>
              <span className="text-sm font-bold font-mono tabular-nums text-[var(--text-main)]">
                {formatNum(forecastResult.statistics.median)}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                Mode: {forecastResult.statistics.mode !== null ? formatNum(forecastResult.statistics.mode) : 'Unik'}
              </span>
            </div>
            <div className="p-3 rounded-xl surface-secondary">
              <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] block">Min / Max</span>
              <span className="text-xs font-bold font-mono tabular-nums text-[var(--text-main)] block">
                {formatNum(forecastResult.statistics.min)} – {formatNum(forecastResult.statistics.max)}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                MA Terakhir: {formatNum(forecastResult.statistics.movingAverageLast)}
              </span>
            </div>
            <div className="p-3 rounded-xl surface-secondary">
              <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] block">StdDev & CV</span>
              <span className="text-sm font-bold font-mono tabular-nums text-[var(--text-main)]">
                {formatNum(forecastResult.statistics.stdDev)}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] block truncate" title={`Variance: ${formatNum(forecastResult.statistics.variance, 0)}`}>
                CV: {forecastResult.statistics.cv}% · Var: {formatCompactMetric(forecastResult.statistics.variance)}
              </span>
            </div>
            <div className="p-3 rounded-xl surface-secondary">
              <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] block">Growth & % Change</span>
              <span className="text-sm font-bold font-mono tabular-nums text-[var(--color-primary)]">
                {forecastResult.statistics.percentageChange >= 0 ? '+' : ''}
                {forecastResult.statistics.percentageChange}%
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                Avg/Step: {forecastResult.statistics.growthRate >= 0 ? '+' : ''}
                {forecastResult.statistics.growthRate}%
              </span>
            </div>
            <div className="p-3 rounded-xl surface-secondary">
              <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] block">Tren & Musiman</span>
              <span className="text-sm font-bold text-[var(--text-main)]">
                {forecastResult.statistics.trendDirection}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                {forecastResult.statistics.seasonalityDetected
                  ? `Seasonal m=${forecastResult.statistics.seasonalPeriod} (r=${forecastResult.statistics.seasonalStrength})`
                  : 'Non-Seasonal'}
              </span>
            </div>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-caramel-soft)] border border-[var(--border-color)] text-[11px] text-[var(--text-main)] flex flex-wrap items-center justify-between gap-2">
            <span>{forecastResult.statistics.historicalPerformance}</span>
            {forecastResult.statistics.outliers.length > 0 && (
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-warning)' }}>
                Anomali IQR: {forecastResult.statistics.outliers.map(o => `${o.date} (${formatNum(o.value)})`).slice(0, 3).join(', ')}
              </span>
            )}
          </div>
        </section>
      )}

      {/* ==================== D. MODEL CONFIGURATION ==================== */}
      <section className="p-5 rounded-2xl surface-card space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--color-primary)]" />
            <span>D. Konfigurasi Model Statistik & Horizon Prediksi</span>
          </h2>
          {forecastResult && (
            <span className="text-[11px] font-semibold text-[var(--color-primary)]">
              Model Aktif: {forecastResult.evaluation.selectedModelName}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Model Selector (Auto + 10 Statistical Models) */}
          <div>
            <label htmlFor="fc-method" className="text-[var(--text-main)] font-semibold block mb-1">
              Algoritma / Model Forecasting
            </label>
            <select
              id="fc-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as ForecastMethod)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--color-primary)] font-semibold focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              <option value="auto">Auto Model Selection (Best Out-of-Sample RMSE)</option>
              {(Object.keys(MODEL_CATALOG) as Exclude<ForecastModelId, 'auto'>[]).map(id => (
                <option key={id} value={id}>
                  {MODEL_CATALOG[id].name}
                </option>
              ))}
            </select>
          </div>

          {/* Horizon Selector */}
          <div>
            <label htmlFor="fc-horizon" className="text-[var(--text-main)] font-semibold block mb-1">
              Horizon Waktu Prediksi
            </label>
            <select
              id="fc-horizon"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value as ForecastHorizon)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] font-medium focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              <option value="7d">7 Hari / Langkah Mendatang</option>
              <option value="14d">14 Hari / Langkah Mendatang</option>
              <option value="30d">30 Hari / Langkah Mendatang</option>
              <option value="60d">60 Hari / Langkah Mendatang</option>
              <option value="90d">90 Hari (3 Bulan)</option>
              <option value="3m">3 Bulan (Kuartal)</option>
              <option value="6m">6 Bulan (Semester)</option>
              <option value="12m">12 Bulan (1 Tahun)</option>
              <option value="custom">Custom Horizon (Pilih Jumlah Langkah)</option>
            </select>
          </div>

          {/* Custom Steps or Confidence Level */}
          {horizon === 'custom' ? (
            <div>
              <label htmlFor="fc-custom-steps" className="text-[var(--text-main)] font-semibold block mb-1">
                Jumlah Langkah Custom (1–365)
              </label>
              <input
                id="fc-custom-steps"
                type="number"
                min={1}
                max={365}
                value={customSteps}
                onChange={(e) => setCustomSteps(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                className="w-full bg-[var(--bg-input)] border border-[var(--accent-caramel)] rounded-lg px-3 py-2 text-[var(--text-main)] font-mono font-bold focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="fc-ci" className="text-[var(--text-main)] font-semibold mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[var(--accent-caramel)]" />
                <span>Tingkat Selang Kepercayaan Utama</span>
              </label>
              <select
                id="fc-ci"
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(Number(e.target.value) as ConfidenceLevel)}
                className="w-full bg-[var(--bg-input)] border border-[var(--accent-caramel)] rounded-lg px-3 py-2 text-[var(--color-primary)] font-bold focus:outline-none"
              >
                <option value={0.80}>80% Prediction Interval (z = 1.282)</option>
                <option value={0.90}>90% Prediction Interval (z = 1.645)</option>
                <option value={0.95}>95% Prediction Interval (z = 1.960 - Standar)</option>
                <option value={0.99}>99% Prediction Interval (z = 2.576 - Ketat)</option>
              </select>
            </div>
          )}

          {/* Scenario Sensitivity Shock % */}
          <div>
            <label htmlFor="fc-shock" className="text-[var(--text-main)] font-semibold block mb-1">
              Asumsi Deviasi Skenario (±%)
            </label>
            <input
              id="fc-shock"
              type="number"
              min={2}
              max={50}
              value={scenarioShockPct}
              onChange={(e) => setScenarioShockPct(Math.max(2, Math.min(50, Number(e.target.value) || 12)))}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] font-mono font-semibold focus:outline-none focus:border-[var(--accent-caramel)]"
            />
          </div>
        </div>

        {forecastResult && (
          <div className="p-3 rounded-xl surface-secondary flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
            <div>
              <strong className="text-[var(--text-main)]">Alasan Seleksi Model: </strong>
              <span className="text-[var(--text-secondary)]">{forecastResult.evaluation.selectionReason}</span>
            </div>
            <div className="font-mono text-[var(--color-primary)] shrink-0">
              Params:{' '}
              {Object.entries(forecastResult.evaluation.modelParameters)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ') || 'default'}
            </div>
          </div>
        )}
      </section>

      {/* ==================== E. FORECASTING CHART ==================== */}
      <section id="forecast-chart-capture" className="p-6 rounded-2xl surface-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--color-primary)]" />
              <span>
                E. Visualisasi Historis, Validasi Backtest & Proyeksi ({forecastResult?.horizonSteps || 0} Langkah ke Depan)
              </span>
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Garis Cokelat: Historis · Garis Putus-Putus Caramel: Forecast · Garis Vertikal: Titik Awal Proyeksi · Pita Shaded: {ciPctLabel}% Confidence Interval
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowHistoricalLine(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-theme cursor-pointer ${
                showHistoricalLine
                  ? 'bg-[var(--bg-caramel-soft)] text-[var(--color-primary)] border-[var(--accent-caramel)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'
              }`}
            >
              {showHistoricalLine ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>Historical</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCiBand(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-theme cursor-pointer ${
                showCiBand
                  ? 'bg-[var(--bg-caramel-soft)] text-[var(--color-primary)] border-[var(--accent-caramel)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'
              }`}
            >
              {showCiBand ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>{ciPctLabel}% CI Band</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTrendLine(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-theme cursor-pointer ${
                showTrendLine
                  ? 'bg-[var(--bg-success-soft)] text-[var(--text-main)] border-[var(--color-success)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'
              }`}
            >
              <span>Trend Line</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBacktestLine(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-theme cursor-pointer ${
                showBacktestLine
                  ? 'bg-[var(--bg-secondary)] text-[var(--color-primary)] border-[var(--accent-caramel)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'
              }`}
            >
              <span>Backtest Overlay</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadChartPng}
              disabled={!forecastResult}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-[var(--text-main)] border border-[var(--border-color)] transition-theme disabled:opacity-50 cursor-pointer"
            >
              <ImageIcon className="w-3 h-3 text-[var(--color-primary)]" />
              <span>PNG</span>
            </button>
          </div>
        </div>

        <div className="h-[400px] w-full pt-2">
          {forecastResult && forecastResult.points.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastResult.points} margin={{ top: 24, right: 20, left: 4, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                <XAxis
                  dataKey="date"
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                />
                <YAxis
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                  tickFormatter={(v) =>
                    Math.abs(v) >= 1000000
                      ? `${(v / 1000000).toFixed(1)}M`
                      : Math.abs(v) >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    color: chartTheme.tooltipText,
                    borderRadius: '10px',
                    fontSize: '11px',
                  }}
                  formatter={(val: any, name?: any) => {
                    const num = Number(val);
                    return [isNaN(num) ? '-' : num.toLocaleString('id-ID'), String(name || '')];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: chartTheme.tooltipText }} />

                {forecastStartDate && (
                  <ReferenceLine
                    x={forecastStartDate}
                    stroke={chartTheme.warning}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'Start Forecast',
                      position: 'top',
                      dy: -4,
                      fill: chartTheme.warning,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}

                {showCiBand && (
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stroke="none"
                    fill={chartTheme.ciBandFill}
                    fillOpacity={0.22}
                    legendType="none"
                    name={`Upper ${ciPctLabel}% CI`}
                  />
                )}
                {showCiBand && (
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="none"
                    fill={chartTheme.ciBandMask}
                    fillOpacity={0.88}
                    legendType="none"
                    name={`Lower ${ciPctLabel}% CI`}
                  />
                )}

                {showCiBand && (
                  <Line
                    type="monotone"
                    dataKey="upperBound"
                    stroke={chartTheme.success}
                    strokeWidth={1.2}
                    strokeDasharray="2 3"
                    dot={false}
                    name={`Batas Atas (${ciPctLabel}% CI)`}
                  />
                )}
                {showCiBand && (
                  <Line
                    type="monotone"
                    dataKey="lowerBound"
                    stroke={chartTheme.danger}
                    strokeWidth={1.2}
                    strokeDasharray="2 3"
                    dot={false}
                    name={`Batas Bawah (${ciPctLabel}% CI)`}
                  />
                )}

                {showTrendLine && (
                  <Line
                    type="monotone"
                    dataKey="trendLine"
                    stroke={chartTheme.secondary}
                    strokeWidth={1.6}
                    strokeDasharray="3 3"
                    dot={false}
                    name="Garis Tren (OLS)"
                  />
                )}

                {showHistoricalLine && (
                  <Line
                    type="monotone"
                    dataKey="historical"
                    stroke={chartTheme.primary}
                    strokeWidth={3}
                    dot={{ r: 2.5, fill: chartTheme.primary }}
                    name="Data Historis Aktual"
                  />
                )}

                {showBacktestLine && (
                  <Line
                    type="monotone"
                    dataKey="backtestPredicted"
                    stroke={chartTheme.warning}
                    strokeWidth={2}
                    dot={{ r: 3, fill: chartTheme.warning }}
                    name="Prediksi Backtest (OOS)"
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={chartTheme.caramel}
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={{ r: 2.5, fill: chartTheme.caramel }}
                  name="Prediksi Model Utama"
                />

                <Brush
                  dataKey="date"
                  height={22}
                  stroke={chartTheme.caramel}
                  fill={chartTheme.secondaryBg}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-xs text-[var(--text-secondary)] space-y-2">
              <TrendingUp className="w-8 h-8 opacity-40" />
              <div>
                {blockingError
                  ? 'Perbaiki konfigurasi kolom tanggal atau target untuk menampilkan grafik forecasting.'
                  : 'Menyiapkan visualisasi proyeksi time-series...'}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ==================== F. MODEL ACCURACY & BACKTESTING ==================== */}
      {forecastResult && (
        <section ref={comparisonSectionRef} className="p-5 rounded-2xl surface-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                F. Validasi Backtesting (Time-Series Split) & Perbandingan 10 Model
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {forecastResult.evaluation.validationNote}
              </p>
            </div>
            <div className="text-[11px] font-mono text-[var(--text-secondary)]">
              Train: <strong className="text-[var(--text-main)]">{forecastResult.evaluation.trainingPeriod}</strong> ({forecastResult.evaluation.trainCount}) · Test:{' '}
              <strong className="text-[var(--text-main)]">{forecastResult.evaluation.testingPeriod}</strong> ({forecastResult.evaluation.testCount})
            </div>
          </div>

          {/* Accuracy KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3.5 rounded-xl surface-secondary">
              <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase block">Arah & Growth</span>
              <div className="flex items-center gap-1 mt-1">
                {forecastResult.evaluation.trend === 'UPWARD' ? (
                  <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                ) : forecastResult.evaluation.trend === 'DOWNWARD' ? (
                  <ArrowDownRight className="w-4 h-4" style={{ color: 'var(--color-danger)' }} />
                ) : null}
                <span className="text-sm font-bold text-[var(--text-main)]">
                  {forecastResult.evaluation.growthPercentage >= 0 ? '+' : ''}
                  {forecastResult.evaluation.growthPercentage}%
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl surface-secondary">
              <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase block">MAE</span>
              <div className="text-sm font-bold font-mono tabular-nums text-[var(--text-main)] mt-1">
                {formatNum(forecastResult.evaluation.mae)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl surface-secondary min-w-0" title={`MSE: ${formatNum(forecastResult.evaluation.mse, 0)}`}>
              <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase block">MSE</span>
              <div className="text-sm font-bold font-mono tabular-nums text-[var(--text-main)] mt-1 truncate">
                {formatCompactMetric(forecastResult.evaluation.mse)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl surface-secondary">
              <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase block">RMSE</span>
              <div className="text-sm font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1">
                {formatNum(forecastResult.evaluation.rmse)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl surface-secondary">
              <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase block">MAPE</span>
              <div className="text-sm font-bold font-mono tabular-nums text-[var(--text-main)] mt-1">
                {forecastResult.evaluation.mapeAvailable ? `${forecastResult.evaluation.mape}%` : 'N/A (0 aktual)'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl surface-secondary">
              <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase block">sMAPE</span>
              <div className="text-sm font-bold font-mono tabular-nums text-[var(--text-main)] mt-1">
                {forecastResult.evaluation.smape}%
              </div>
            </div>

            <div className="p-3.5 rounded-xl surface-secondary" title="Out-of-sample R² membandingkan model terhadap baseline rata-rata; dapat bernilai negatif jika pola berubah ekstrem.">
              <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase block">R² (OOS)</span>
              <div className="text-sm font-bold font-mono tabular-nums text-[var(--color-primary)] mt-1">
                {forecastResult.evaluation.r2}
              </div>
            </div>
          </div>

          {/* Backtesting Actual vs Predicted Table */}
          {forecastResult.backtestPoints.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowBacktestTable(v => !v)}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline cursor-pointer"
              >
                {showBacktestTable ? '▾ Sembunyikan' : '▸ Tampilkan'} Tabel Backtesting Aktual vs Prediksi ({forecastResult.backtestPoints.length} titik uji)
              </button>

              {showBacktestTable && (
                <div className="overflow-x-auto max-h-56 rounded-xl border border-[var(--border-color)]">
                  <table className="w-full text-left text-[11px] font-mono tabular-nums">
                    <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase text-[10px] sticky top-0 border-b border-[var(--border-color)]">
                      <tr>
                        <th className="px-3 py-2">Tanggal Uji</th>
                        <th className="px-3 py-2">Nilai Aktual</th>
                        <th className="px-3 py-2">Prediksi OOS</th>
                        <th className="px-3 py-2">Error (Aktual - Pred)</th>
                        <th className="px-3 py-2">Abs Error</th>
                        <th className="px-3 py-2">% Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
                      {forecastResult.backtestPoints.map((bp, i) => (
                        <tr key={i} className="hover:bg-[var(--bg-caramel-soft)]">
                          <td className="px-3 py-1.5 font-semibold">{bp.date}</td>
                          <td className="px-3 py-1.5">{formatNum(bp.actual)}</td>
                          <td className="px-3 py-1.5 text-[var(--color-primary)]">{formatNum(bp.predicted)}</td>
                          <td className="px-3 py-1.5">{bp.error >= 0 ? `+${formatNum(bp.error)}` : formatNum(bp.error)}</td>
                          <td className="px-3 py-1.5">{formatNum(bp.absError)}</td>
                          <td className="px-3 py-1.5">{bp.pctError !== null ? `${bp.pctError}%` : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Ranked Model Comparison Benchmark Table */}
          {modelComparisons.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--text-main)]">
                  Peringkat Benchmarking Seluruh Model Statistik ({modelComparisons.length} Model)
                </h3>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Diurutkan berdasarkan RMSE out-of-sample terkecil
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase text-[10px] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-3 py-2">Rank</th>
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2">Keluarga</th>
                      <th className="px-3 py-2">Kelayakan / Status</th>
                      <th className="px-3 py-2 font-mono">MAE</th>
                      <th className="px-3 py-2 font-mono">RMSE</th>
                      <th className="px-3 py-2 font-mono">sMAPE</th>
                      <th className="px-3 py-2 font-mono">R²</th>
                      <th className="px-3 py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
                    {[...modelComparisons]
                      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
                      .map((row) => (
                        <tr
                          key={row.modelId}
                          className={`hover:bg-[var(--bg-caramel-soft)] ${
                            row.modelId === forecastResult.evaluation.selectedModelId ? 'bg-[var(--bg-caramel-soft)]' : ''
                          }`}
                        >
                          <td className="px-3 py-2 font-bold font-mono">
                            {row.rank ? `#${row.rank}` : '-'}
                          </td>
                          <td className="px-3 py-2 font-semibold">
                            <div className="flex items-center gap-1.5">
                              <span>{row.modelName}</span>
                              {row.isRecommended && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--bg-success-soft)] text-[var(--color-success)] border border-[var(--color-success)]">
                                  BEST
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{row.family}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)] max-w-xs">{row.eligibilityReason}</td>
                          <td className="px-3 py-2 font-mono tabular-nums">{row.metrics ? formatNum(row.metrics.mae) : '-'}</td>
                          <td className="px-3 py-2 font-mono tabular-nums font-bold text-[var(--color-primary)]">
                            {row.metrics ? formatNum(row.metrics.rmse) : '-'}
                          </td>
                          <td className="px-3 py-2 font-mono tabular-nums">{row.metrics ? `${row.metrics.smape}%` : '-'}</td>
                          <td className="px-3 py-2 font-mono tabular-nums">{row.metrics ? row.metrics.r2 : '-'}</td>
                          <td className="px-3 py-2">
                            {row.eligible ? (
                              <button
                                type="button"
                                onClick={() => setMethod(row.modelId)}
                                className="px-2 py-1 rounded bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-caramel)] text-[10px] font-semibold cursor-pointer"
                              >
                                {row.modelId === forecastResult.evaluation.selectedModelId ? 'Aktif' : 'Pilih'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-[var(--text-secondary)]">Tidak Memenuhi Syarat</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==================== G. CONFIDENCE INTERVALS (80% & 95%) ==================== */}
      {forecastResult && (
        <section className="p-5 rounded-2xl surface-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--accent-caramel)]" />
              <span>G. Prediction Bounds & Selang Kepercayaan (80% & 95% Confidence Interval)</span>
            </h2>
            <span className="text-[11px] font-mono text-[var(--color-primary)] font-semibold">
              Aktif Utama: {ciPctLabel}% CI (z = {forecastResult.evaluation.zScore}) · Margin Rata-rata: ± {formatNum(forecastResult.evaluation.averageMarginOfError)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl border border-[var(--border-color)]" style={{ backgroundColor: 'var(--bg-danger-soft)' }}>
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--color-danger)' }}>
                Batas Bawah ({ciPctLabel}% CI)
              </span>
              <div className="text-lg font-extrabold font-mono tabular-nums mt-1" style={{ color: 'var(--color-danger)' }}>
                {formatNum(forecastResult.evaluation.ciLower)}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                95% Lower: {formatNum(forecastResult.evaluation.ci95Lower)} · 80% Lower: {formatNum(forecastResult.evaluation.ci80Lower)}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--accent-caramel)]" style={{ backgroundColor: 'var(--bg-caramel-soft)' }}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] block">
                Expected Mean Forecast
              </span>
              <div className="text-lg font-extrabold font-mono tabular-nums text-[var(--text-main)] mt-1">
                {formatNum(forecastResult.evaluation.meanProjected)}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                Rata-rata proyeksi sentral {forecastResult.horizonSteps} periode ke depan
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)]" style={{ backgroundColor: 'var(--bg-success-soft)' }}>
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--color-success)' }}>
                Batas Atas ({ciPctLabel}% CI)
              </span>
              <div className="text-lg font-extrabold font-mono tabular-nums mt-1" style={{ color: 'var(--color-success)' }}>
                {formatNum(forecastResult.evaluation.ciUpper)}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                80% Upper: {formatNum(forecastResult.evaluation.ci80Upper)} · 95% Upper: {formatNum(forecastResult.evaluation.ci95Upper)}
              </div>
            </div>

            <div className="p-4 rounded-xl surface-secondary">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                Interval Band 80% vs 95%
              </span>
              <div className="text-xs font-mono font-bold text-[var(--text-main)] mt-1.5 space-y-1">
                <div>80% CI: [{formatNum(forecastResult.evaluation.ci80Lower)} – {formatNum(forecastResult.evaluation.ci80Upper)}]</div>
                <div>95% CI: [{formatNum(forecastResult.evaluation.ci95Lower)} – {formatNum(forecastResult.evaluation.ci95Upper)}]</div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[var(--text-secondary)] italic">
            * {forecastResult.evaluation.ciLimitationNote}
          </p>
        </section>
      )}

      {/* ==================== H. FORECAST RESULTS TABLE ==================== */}
      {forecastResult && (
        <section className="p-5 rounded-2xl surface-card space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                H. Tabel Hasil Proyeksi & Interval Kepercayaan ({processedTableRows.length} Baris)
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Filter status data, urutkan kolom, cari periode tanggal, dan ekspor ke Excel / CSV.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setTablePage(1);
                  }}
                  placeholder="Cari tanggal..."
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--accent-caramel)]"
                />
              </div>

              <select
                aria-label="Filter status tabel hasil"
                value={tableFilterStatus}
                onChange={(e) => {
                  setTableFilterStatus(e.target.value as any);
                  setTablePage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] text-xs focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="Historical">Historical</option>
                <option value="Backtest">Backtest</option>
                <option value="Forecast">Forecast</option>
              </select>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--color-success)]" />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
            <table className="w-full text-left text-xs font-mono tabular-nums">
              <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase text-[10px] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-3.5 py-2.5 cursor-pointer" onClick={() => toggleSort('date')}>
                    <span className="inline-flex items-center gap-1">
                      Date/Period <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="px-3.5 py-2.5 cursor-pointer" onClick={() => toggleSort('historical')}>
                    <span className="inline-flex items-center gap-1">
                      Historical <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="px-3.5 py-2.5 cursor-pointer text-[var(--color-primary)]" onClick={() => toggleSort('forecast')}>
                    <span className="inline-flex items-center gap-1">
                      Forecast <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="px-3.5 py-2.5 cursor-pointer" onClick={() => toggleSort('lowerBound')}>
                    <span className="inline-flex items-center gap-1">
                      Lower Bound ({ciPctLabel}% CI) <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="px-3.5 py-2.5 cursor-pointer" onClick={() => toggleSort('upperBound')}>
                    <span className="inline-flex items-center gap-1">
                      Upper Bound ({ciPctLabel}% CI) <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="px-3.5 py-2.5">Trend</th>
                  <th className="px-3.5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
                {paginatedRows.map((row) => (
                  <tr key={`${row.index}-${row.date}`} className="hover:bg-[var(--bg-caramel-soft)] transition-theme">
                    <td className="px-3.5 py-2 font-semibold">{row.date}</td>
                    <td className="px-3.5 py-2">{row.historical !== undefined ? formatNum(row.historical) : '-'}</td>
                    <td className="px-3.5 py-2 font-bold text-[var(--color-primary)]">
                      {row.forecast !== undefined ? formatNum(row.forecast) : '-'}
                    </td>
                    <td className="px-3.5 py-2" style={{ color: 'var(--color-danger)' }}>
                      {row.lowerBound !== undefined ? formatNum(row.lowerBound) : '-'}
                    </td>
                    <td className="px-3.5 py-2" style={{ color: 'var(--color-success)' }}>
                      {row.upperBound !== undefined ? formatNum(row.upperBound) : '-'}
                    </td>
                    <td className="px-3.5 py-2 font-sans text-[11px]">{row.trendLabel}</td>
                    <td className="px-3.5 py-2 font-sans">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold border"
                        style={{
                          backgroundColor:
                            row.statusLabel === 'Forecast'
                              ? 'var(--bg-caramel-soft)'
                              : row.statusLabel === 'Backtest'
                              ? 'var(--bg-warning-soft)'
                              : 'var(--bg-secondary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-main)',
                        }}
                      >
                        {row.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <span>Baris per halaman:</span>
              <select
                value={tablePageSize}
                onChange={(e) => {
                  setTablePageSize(Number(e.target.value));
                  setTablePage(1);
                }}
                className="px-2 py-1 rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)]"
              >
                <option value={10}>10</option>
                <option value={12}>12</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>
                Halaman {safePage} dari {totalPages}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setTablePage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] disabled:opacity-40 text-[var(--text-main)] cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] disabled:opacity-40 text-[var(--text-main)] cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ==================== I. AI INTERPRETATION & Q&A ==================== */}
      {forecastResult && (
        <section className="p-5 rounded-2xl surface-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                <span>I. AI Strategic Interpretation & Tanya Jawab Hasil Forecasting</span>
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Penjelasan 8 bagian terstruktur berbasis angka aktual terhitung (tanpa fabrikasi angka).
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleRequestAiAnalysis()}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] text-xs font-semibold shadow-2xs transition-theme disabled:opacity-50 cursor-pointer self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAnalyzing ? 'Menyusun Analisis...' : 'AI Strategic Interpretation'}</span>
            </button>
          </div>

          {/* Interactive Q&A Bar */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {PRESET_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAiQuestion(q);
                    handleRequestAiAnalysis(q);
                  }}
                  disabled={isAnalyzing}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] border border-[var(--border-color)] text-[var(--text-main)] transition-theme cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && aiQuestion.trim()) handleRequestAiAnalysis(aiQuestion);
                }}
                placeholder="Tanyakan hal spesifik tentang tren, risiko CI, akurasi RMSE, atau keputusan bisnis..."
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
              />
              <button
                type="button"
                onClick={() => handleRequestAiAnalysis(aiQuestion)}
                disabled={isAnalyzing || !aiQuestion.trim()}
                className="px-3.5 py-2 rounded-lg bg-[var(--bg-caramel-soft)] hover:bg-[var(--accent-caramel)] border border-[var(--accent-caramel)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Tanya AI</span>
              </button>
            </div>
          </div>

          {aiAnalysis && (
            <div
              className="p-5 rounded-xl border border-[var(--accent-caramel)] space-y-2"
              style={{ backgroundColor: 'var(--bg-caramel-soft)' }}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-primary)]">
                <span>Laporan Interpretasi Statistik Terstruktur</span>
                {aiModelUsed && <span className="font-mono uppercase">{aiModelUsed}</span>}
              </div>
              <div className="text-xs text-[var(--text-main)] leading-relaxed whitespace-pre-wrap font-sans">
                {aiAnalysis}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==================== J. SCENARIO ANALYSIS ==================== */}
      {forecastResult && forecastResult.scenarios.points.length > 0 && (
        <section className="p-5 rounded-2xl surface-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                J. Simulasi Analisis Skenario (Optimistic · Baseline · Pessimistic ±{forecastResult.scenarios.shockPercentage}%)
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Simulasi sensitivitas manajerial untuk perencanaan anggaran & mitigasi risiko deviasi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl border border-[var(--border-color)]" style={{ backgroundColor: 'var(--bg-success-soft)' }}>
              <span className="text-[10px] font-bold uppercase block" style={{ color: 'var(--color-success)' }}>
                Optimistic Scenario (+{forecastResult.scenarios.shockPercentage}%)
              </span>
              <div className="text-base font-extrabold font-mono tabular-nums mt-1" style={{ color: 'var(--color-success)' }}>
                Akhir: {formatNum(forecastResult.scenarios.optimisticFinal)}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Rata-rata Horizon: {formatNum(forecastResult.scenarios.optimisticMean)}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--accent-caramel)]" style={{ backgroundColor: 'var(--bg-caramel-soft)' }}>
              <span className="text-[10px] font-bold uppercase text-[var(--color-primary)] block">
                Baseline Scenario (Model Utama)
              </span>
              <div className="text-base font-extrabold font-mono tabular-nums text-[var(--text-main)] mt-1">
                Akhir: {formatNum(forecastResult.scenarios.baselineFinal)}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Rata-rata Horizon: {formatNum(forecastResult.scenarios.baselineMean)}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)]" style={{ backgroundColor: 'var(--bg-danger-soft)' }}>
              <span className="text-[10px] font-bold uppercase block" style={{ color: 'var(--color-danger)' }}>
                Pessimistic Scenario (-{forecastResult.scenarios.shockPercentage}%)
              </span>
              <div className="text-base font-extrabold font-mono tabular-nums mt-1" style={{ color: 'var(--color-danger)' }}>
                Akhir: {formatNum(forecastResult.scenarios.pessimisticFinal)}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Rata-rata Horizon: {formatNum(forecastResult.scenarios.pessimisticMean)}
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastResult.scenarios.points} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                <XAxis dataKey="date" stroke={chartTheme.axisStroke} tick={{ fontSize: 10, fill: chartTheme.axisTickColor }} />
                <YAxis
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                  tickFormatter={(v) =>
                    Math.abs(v) >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    color: chartTheme.tooltipText,
                    borderRadius: '10px',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: chartTheme.tooltipText }} />
                <Line type="monotone" dataKey="optimistic" stroke={chartTheme.success} strokeWidth={2} dot={false} name="Optimistic" />
                <Line type="monotone" dataKey="baseline" stroke={chartTheme.primary} strokeWidth={2.5} dot={false} name="Baseline" />
                <Line type="monotone" dataKey="pessimistic" stroke={chartTheme.danger} strokeWidth={2} dot={false} name="Pessimistic" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <ul className="text-[11px] text-[var(--text-secondary)] space-y-1 list-disc pl-4">
            {forecastResult.scenarios.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ==================== K. FORECASTING HISTORY ==================== */}
      <section className="p-5 rounded-2xl surface-card space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--color-primary)]" />
            <span>K. Riwayat Hasil Forecasting ({historyRecords.length})</span>
          </h2>
          <span className="text-[11px] text-[var(--text-secondary)]">
            {supabaseAuthenticated && supabaseTablesReady
              ? 'Tersinkronisasi dengan Supabase (public.forecasts) & Lokal'
              : 'Penyimpanan Riwayat Lokal (Sinkronisasi Supabase aktif setelah login Auth)'}
          </span>
        </div>

        {historyRecords.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
            Belum ada hasil forecasting yang disimpan. Klik tombol <strong>Save Forecast</strong> di atas untuk menyimpan skenario & evaluasi model.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {historyRecords.map(rec => (
              <div
                key={rec.id}
                className="p-3.5 rounded-xl surface-secondary border border-[var(--border-color)] flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[var(--text-main)] truncate">{rec.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--color-primary)] uppercase">
                      {rec.source}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {rec.datasetName} · Kolom: {rec.dateColumn} → {rec.targetColumn}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-main)]">
                    RMSE: {formatNum(rec.evaluation?.rmse)} · Trend: {rec.evaluation?.trend || '-'} · {new Date(rec.createdAt).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleLoadHistoryRecord(rec)}
                    className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-caramel-soft)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--color-primary)] cursor-pointer"
                  >
                    Muat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteHistoryRecord(rec)}
                    title="Hapus Riwayat"
                    className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-danger-soft)] border border-[var(--border-color)] text-[var(--text-secondary)] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
