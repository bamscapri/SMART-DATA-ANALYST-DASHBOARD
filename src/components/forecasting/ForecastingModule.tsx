import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  generateForecast,
  ForecastMethod,
  ForecastHorizon,
  ConfidenceLevel,
  ForecastOutput,
  DataPoint
} from '../../utils/forecasting';
import { exportToCsv } from '../../utils/exportUtils';
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
  ChevronDown,
  TableProperties
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

export const ForecastingModule: React.FC = () => {
  const { selectedDataset, currentStats, logActivity, addToast } = useApp();
  const { chartTheme } = useTheme();

  // Selected dimensions
  const [dateCol, setDateCol] = useState<string>('');
  const [targetCol, setTargetCol] = useState<string>('');
  const [method, setMethod] = useState<ForecastMethod>('linear');
  const [horizon, setHorizon] = useState<ForecastHorizon>('30d');
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>(0.95);

  // UI display toggles
  const [showCiBand, setShowCiBand] = useState<boolean>(true);
  const [showBoundaryLines, setShowBoundaryLines] = useState<boolean>(true);
  const [showDetailTable, setShowDetailTable] = useState<boolean>(false);

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Auto-detect and sync valid columns when active dataset changes
  useEffect(() => {
    if (!selectedDataset || !selectedDataset.data || selectedDataset.data.length === 0) {
      setDateCol('');
      setTargetCol('');
      return;
    }

    const availableCols = Object.keys(selectedDataset.data[0]);

    if (!availableCols.includes(dateCol)) {
      const detectedDate =
        currentStats.dateCols[0] ||
        availableCols.find(c => /date|tanggal|time|waktu|bulan|month|year|tahun|period/i.test(c)) ||
        availableCols.find(c => /id|order|no|trans/i.test(c)) ||
        availableCols[0] ||
        '';
      setDateCol(detectedDate);
    }

    if (!availableCols.includes(targetCol)) {
      const detectedNum =
        currentStats.numericCols.find(c => /revenue|omset|sales|penjualan|profit|laba|mrr/i.test(c)) ||
        currentStats.numericCols[0] ||
        availableCols.find(c => typeof selectedDataset.data[0][c] === 'number') ||
        '';
      setTargetCol(detectedNum);
    }
  }, [selectedDataset, currentStats]);

  // Extract valid historical series with safety fallbacks
  const historySeries: DataPoint[] = useMemo(() => {
    const raw = selectedDataset?.data || [];
    if (!targetCol || raw.length === 0) return [];

    return raw
      .map((r, idx) => {
        const val = typeof r[targetCol] === 'number' ? r[targetCol] : Number(r[targetCol]);
        const dateVal =
          dateCol && r[dateCol] !== undefined && r[dateCol] !== null
            ? String(r[dateCol])
            : `Point ${idx + 1}`;

        return {
          date: dateVal,
          value: isNaN(val) ? 0 : val
        };
      })
      .filter(d => !isNaN(d.value));
  }, [selectedDataset, dateCol, targetCol]);

  // Run pure forecast logic with confidence intervals
  const forecastResult: ForecastOutput | null = useMemo(() => {
    if (historySeries.length < 2) return null;
    return generateForecast(historySeries, method, horizon, confidenceLevel);
  }, [historySeries, method, horizon, confidenceLevel]);

  // Handle AI managerial interpretation
  const handleRequestAiAnalysis = async () => {
    if (!forecastResult) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai/forecast-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricName: targetCol,
          horizon,
          method,
          confidenceLevel: `${confidenceLevel * 100}% CI`,
          evaluation: {
            ...forecastResult.evaluation,
            confidenceInterval: `[${forecastResult.evaluation.ciLower} - ${forecastResult.evaluation.ciUpper}] (±${forecastResult.evaluation.averageMarginOfError})`
          },
          pointsSample: forecastResult.points.slice(-10)
        })
      });

      if (!res.ok) throw new Error('Gagal memproses interpretasi AI.');
      const data = await res.json();
      setAiAnalysis(data.analysis);
      logActivity(
        'RUN_FORECAST',
        'Forecasting',
        targetCol,
        `Method: ${method}, Horizon: ${horizon}, CI: ${confidenceLevel * 100}%`
      );
      addToast(
        'success',
        'Interpretasi AI Selesai',
        `Evaluasi peramalan dengan ${confidenceLevel * 100}% CI berhasil disusun.`
      );
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Gagal Mendapatkan Analisis AI', err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Export future projections with CI to CSV
  const handleExportProjectionsCsv = () => {
    if (!forecastResult) return;
    const futureOnly = forecastResult.points
      .filter(p => p.historical === undefined)
      .map((p, idx) => ({
        Langkah: idx + 1,
        Tanggal_Periode: p.date,
        Batas_Bawah_CI: p.lowerBound,
        Nilai_Prediksi_Sentral: p.forecast,
        Batas_Atas_CI: p.upperBound,
        Margin_of_Error: p.marginOfError,
        Tingkat_Kepercayaan: `${confidenceLevel * 100}% CI`,
        Model: method
      }));

    exportToCsv(
      futureOnly,
      `${selectedDataset?.name || 'Dataset'}_Proyeksi_${targetCol}_${confidenceLevel * 100}CI.csv`
    );
    addToast('success', 'File CSV Proyeksi Diunduh', 'Tabel proyeksi dengan interval kepercayaan telah disimpan.');
  };

  const availableColumns = useMemo(() => {
    return Object.keys(selectedDataset?.data?.[0] || {});
  }, [selectedDataset]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Modul Forecasting & Prediksi Statistik Masa Depan</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Peramalan time-series kuantitatif berbasis Regresi Linier, Moving Average, atau Exponential Smoothing dilengkapi selang kepercayaan (Confidence Interval) untuk mitigasi risiko bisnis.
          </p>
        </div>

        {forecastResult && (
          <button
            type="button"
            onClick={handleExportProjectionsCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] text-xs font-semibold border border-[var(--border-color)] transition-theme self-start sm:self-auto shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Export Proyeksi (CSV)</span>
          </button>
        )}
      </div>

      {/* Model & Variable Selector Card */}
      <div className="p-5 rounded-2xl surface-card space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date Column */}
          <div>
            <label htmlFor="fc-date-col" className="text-[var(--text-main)] font-semibold block mb-1">
              Kolom Tanggal / Deret Waktu
            </label>
            <select
              id="fc-date-col"
              value={dateCol}
              onChange={(e) => setDateCol(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)] font-medium"
            >
              {availableColumns.map(c => (
                <option key={c} value={c}>
                  {c} {currentStats.dateCols.includes(c) ? '(Date)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Target Metric */}
          <div>
            <label htmlFor="fc-target-col" className="text-[var(--text-main)] font-semibold block mb-1">
              Target Variabel Numerik
            </label>
            <select
              id="fc-target-col"
              value={targetCol}
              onChange={(e) => setTargetCol(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)] font-medium"
            >
              {currentStats.numericCols.length > 0 ? (
                currentStats.numericCols.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))
              ) : (
                availableColumns.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))
              )}
            </select>
          </div>

          {/* Forecast Method */}
          <div>
            <label htmlFor="fc-method" className="text-[var(--text-main)] font-semibold block mb-1">
              Metode Model Peramalan
            </label>
            <select
              id="fc-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as ForecastMethod)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--color-primary)] font-semibold focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              <option value="linear">Linear Regression (Tren Linier)</option>
              <option value="moving_average">Moving Average (Smoothing Bergerak)</option>
              <option value="exponential_smoothing">Exponential Smoothing (Pembobotan)</option>
            </select>
          </div>

          {/* Horizon */}
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
              <option value="7d">Prediksi 7 Langkah (Short-term)</option>
              <option value="30d">Prediksi 30 Langkah (1 Bulan)</option>
              <option value="3m">Prediksi 90 Langkah (Kuartalan)</option>
              <option value="6m">Prediksi 180 Langkah (Semester)</option>
              <option value="12m">Prediksi 365 Langkah (Tahunan)</option>
            </select>
          </div>

          {/* Confidence Interval Level Selector */}
          <div>
            <label htmlFor="fc-ci" className="text-[var(--text-main)] font-semibold mb-1 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-[var(--accent-caramel)]" />
              <span>Selang Kepercayaan (CI)</span>
            </label>
            <select
              id="fc-ci"
              value={confidenceLevel}
              onChange={(e) => setConfidenceLevel(Number(e.target.value) as ConfidenceLevel)}
              className="w-full bg-[var(--bg-input)] border border-[var(--accent-caramel)] rounded-lg px-3 py-2 text-[var(--color-primary)] font-bold focus:outline-none"
            >
              <option value={0.80}>80% CI (z = 1.282)</option>
              <option value={0.90}>90% CI (z = 1.645)</option>
              <option value={0.95}>95% CI (z = 1.960 - Rekomendasi)</option>
              <option value={0.99}>99% CI (z = 2.576 - Audit Ketat)</option>
            </select>
          </div>
        </div>

        {/* Small dataset warning if history is small */}
        {historySeries.length < 5 && historySeries.length > 0 && (
          <div
            className="p-3 rounded-xl border text-xs flex items-center gap-2"
            style={{
              backgroundColor: 'var(--bg-warning-soft)',
              borderColor: 'var(--color-warning)',
              color: 'var(--text-main)'
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--color-warning)' }} />
            <span>
              Perhatian: Jumlah data observasi saat ini ({historySeries.length} titik) tergolong minimal. Model statistik tetap berjalan, namun disarankan minimal 5 titik data untuk akurasi optimal.
            </span>
          </div>
        )}
      </div>

      {/* Confidence Interval & Risk Bounds Strategic Panel */}
      {forecastResult && (
        <div className="p-5 rounded-2xl surface-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--accent-caramel)]" />
              <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                Batas Ketidakpastian Statistik ({confidenceLevel * 100}% Confidence Interval Bounds)
              </h2>
            </div>
            <span className="text-[11px] text-[var(--color-primary)] font-mono tabular-nums font-semibold">
              Parameter Z: {forecastResult.evaluation.zScore} · Margin of Error Rata-rata: ±{' '}
              {forecastResult.evaluation.averageMarginOfError.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Lower Bound */}
            <div
              className="p-4 rounded-xl border border-[var(--border-color)] space-y-1"
              style={{ backgroundColor: 'var(--bg-danger-soft)' }}
            >
              <span
                className="text-[10px] uppercase font-bold tracking-wider block"
                style={{ color: 'var(--color-danger)' }}
              >
                Batas Bawah ({confidenceLevel * 100}% CI - Pesimistis)
              </span>
              <div
                className="text-lg font-extrabold font-mono tabular-nums"
                style={{ color: 'var(--color-danger)' }}
              >
                {forecastResult.evaluation.ciLower.toLocaleString()}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Nilai minimum yang diproyeksikan dengan keyakinan {confidenceLevel * 100}%.
              </p>
            </div>

            {/* Central Forecast */}
            <div
              className="p-4 rounded-xl border border-[var(--accent-caramel)] space-y-1"
              style={{ backgroundColor: 'var(--bg-caramel-soft)' }}
            >
              <span className="text-[10px] uppercase font-bold text-[var(--color-primary)] tracking-wider block">
                Nilai Tengah Proyeksi (Expected Mean)
              </span>
              <div className="text-lg font-extrabold text-[var(--text-main)] font-mono tabular-nums">
                {forecastResult.evaluation.meanProjected.toLocaleString()}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Rata-rata estimasi titik sentral untuk {forecastResult.horizonSteps} langkah ke depan.
              </p>
            </div>

            {/* Upper Bound */}
            <div
              className="p-4 rounded-xl border border-[var(--border-color)] space-y-1"
              style={{ backgroundColor: 'var(--bg-success-soft)' }}
            >
              <span
                className="text-[10px] uppercase font-bold tracking-wider block"
                style={{ color: 'var(--color-success)' }}
              >
                Batas Atas ({confidenceLevel * 100}% CI - Optimistis)
              </span>
              <div
                className="text-lg font-extrabold font-mono tabular-nums"
                style={{ color: 'var(--color-success)' }}
              >
                {forecastResult.evaluation.ciUpper.toLocaleString()}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Target capaian tertinggi potensial dengan keandalan statistik {confidenceLevel * 100}%.
              </p>
            </div>

            {/* Precision / Spread */}
            <div className="p-4 rounded-xl surface-secondary space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider block">
                Rentang Ketidakpastian (Spread)
              </span>
              <div className="text-lg font-extrabold text-[var(--text-main)] font-mono tabular-nums">
                ± {forecastResult.evaluation.averageMarginOfError.toLocaleString()}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Toleransi risiko deviasi (Confidence Interval Band Width).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Model Performance KPIs */}
      {forecastResult && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl surface-card">
            <span className="text-[11px] text-[var(--text-secondary)] block font-medium">Arah Tren</span>
            <div className="flex items-center gap-1.5 mt-1">
              {forecastResult.evaluation.trend === 'UPWARD' ? (
                <>
                  <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                  <span className="text-sm font-bold" style={{ color: 'var(--color-success)' }}>UPWARD</span>
                </>
              ) : forecastResult.evaluation.trend === 'DOWNWARD' ? (
                <>
                  <ArrowDownRight className="w-4 h-4" style={{ color: 'var(--color-danger)' }} />
                  <span className="text-sm font-bold" style={{ color: 'var(--color-danger)' }}>DOWNWARD</span>
                </>
              ) : (
                <span className="text-sm font-bold text-[var(--color-primary)]">STABLE</span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl surface-card">
            <span className="text-[11px] text-[var(--text-secondary)] block font-medium">Proyeksi Pertumbuhan</span>
            <div className="text-sm font-bold text-[var(--text-main)] mt-1 tabular-nums">
              {forecastResult.evaluation.growthPercentage > 0 ? '+' : ''}
              {forecastResult.evaluation.growthPercentage}%
            </div>
          </div>

          <div className="p-3.5 rounded-xl surface-card">
            <span className="text-[11px] text-[var(--text-secondary)] block font-medium">Model Fit (R²)</span>
            <div className="text-sm font-bold text-[var(--color-primary)] mt-1 tabular-nums">
              {forecastResult.evaluation.r2}
            </div>
          </div>

          <div className="p-3.5 rounded-xl surface-card">
            <span className="text-[11px] text-[var(--text-secondary)] block font-medium">Mean Abs Error (MAE)</span>
            <div className="text-sm font-bold text-[var(--text-main)] mt-1 font-mono tabular-nums">
              {forecastResult.evaluation.mae.toLocaleString()}
            </div>
          </div>

          <div className="p-3.5 rounded-xl surface-card">
            <span className="text-[11px] text-[var(--text-secondary)] block font-medium">RMSE</span>
            <div className="text-sm font-bold text-[var(--text-main)] mt-1 font-mono tabular-nums">
              {forecastResult.evaluation.rmse.toLocaleString()}
            </div>
          </div>

          <div className="p-3.5 rounded-xl surface-card">
            <span className="text-[11px] text-[var(--text-secondary)] block font-medium">MAPE Error</span>
            <div className="text-sm font-bold text-[var(--text-main)] mt-1 tabular-nums">
              {forecastResult.evaluation.mape}%
            </div>
          </div>
        </div>
      )}

      {/* Main Historical vs Forecast Chart */}
      <div className="p-6 rounded-2xl surface-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Visualisasi Deret Historis & Proyeksi ({forecastResult?.horizonSteps || 30} Langkah ke Depan)</span>
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Garis Cokelat: Historis Aktual · Garis Caramel Putus-Putus: Prediksi Sentral · Area Pita: Batas {confidenceLevel * 100}% CI
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle CI Band */}
            <button
              type="button"
              onClick={() => setShowCiBand(!showCiBand)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-theme cursor-pointer ${
                showCiBand
                  ? 'bg-[var(--bg-caramel-soft)] text-[var(--color-primary)] border-[var(--accent-caramel)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'
              }`}
              title="Tampilkan Area Shading Selang Kepercayaan"
            >
              {showCiBand ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{confidenceLevel * 100}% CI Band</span>
            </button>

            {/* Toggle Boundary Lines */}
            <button
              type="button"
              onClick={() => setShowBoundaryLines(!showBoundaryLines)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-theme cursor-pointer ${
                showBoundaryLines
                  ? 'bg-[var(--bg-success-soft)] text-[var(--text-main)] border-[var(--color-success)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'
              }`}
              title="Tampilkan Garis Batas Atas & Bawah"
            >
              <span>Upper/Lower Lines</span>
            </button>

            {/* AI Strategic Button */}
            <button
              type="button"
              onClick={handleRequestAiAnalysis}
              disabled={isAnalyzing || !forecastResult}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold text-xs shadow-xs transition-theme disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAnalyzing ? 'Menyusun Analisis...' : 'AI Strategic Interpretation'}</span>
            </button>
          </div>
        </div>

        <div className="h-96 w-full pt-2">
          {forecastResult && forecastResult.points.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastResult.points}>
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
                    v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    color: chartTheme.tooltipText,
                    borderRadius: '10px',
                    fontSize: '11px'
                  }}
                  formatter={(val: any, name?: any) => {
                    const num = Number(val);
                    return [isNaN(num) ? '-' : num.toLocaleString(), String(name || '')];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: chartTheme.tooltipText }} />

                {/* Shaded Confidence Interval Upper Area */}
                {showCiBand && (
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stroke="none"
                    fill={chartTheme.ciBandFill}
                    fillOpacity={0.22}
                    name={`Batas Atas (${confidenceLevel * 100}% CI)`}
                  />
                )}

                {/* Shaded Confidence Interval Lower Area to mask out base */}
                {showCiBand && (
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="none"
                    fill={chartTheme.ciBandMask}
                    fillOpacity={0.85}
                    name={`Batas Bawah (${confidenceLevel * 100}% CI)`}
                  />
                )}

                {/* Boundary lines */}
                {showBoundaryLines && (
                  <Line
                    type="monotone"
                    dataKey="upperBound"
                    stroke={chartTheme.success}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                    name={`Upper Limit (${confidenceLevel * 100}% CI)`}
                  />
                )}

                {showBoundaryLines && (
                  <Line
                    type="monotone"
                    dataKey="lowerBound"
                    stroke={chartTheme.danger}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                    name={`Lower Limit (${confidenceLevel * 100}% CI)`}
                  />
                )}

                {/* Historical Line */}
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke={chartTheme.primary}
                  strokeWidth={3}
                  dot={{ r: 3, fill: chartTheme.primary }}
                  name="Data Historis Aktual"
                />

                {/* Forecast Line */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={chartTheme.caramel}
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: chartTheme.caramel }}
                  name="Prediksi Masa Depan (Central)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-xs text-[var(--text-secondary)] space-y-2">
              <TrendingUp className="w-8 h-8 opacity-50" />
              <div>Pilih variabel numerik dan tanggal observasi untuk menjalankan peramalan statistik.</div>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Step-by-Step Projections & CI Table */}
      {forecastResult && (
        <div className="rounded-2xl surface-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDetailTable(!showDetailTable)}
            className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-caramel-soft)] transition-theme text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-xs font-bold text-[var(--text-main)]">
                Rincian Tabel Nilai Prediksi per Langkah & Selang Kepercayaan {confidenceLevel * 100}% CI
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] font-mono tabular-nums">
                · {forecastResult.horizonSteps} Langkah Mendatang
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span>{showDetailTable ? 'Sembunyikan' : 'Buka Tabel'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDetailTable ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {showDetailTable && (
            <div className="border-t border-[var(--border-color)] overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs text-[var(--text-main)] font-mono tabular-nums">
                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase text-[10px] font-bold sticky top-0 border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-4 py-2.5"># Langkah</th>
                    <th className="px-4 py-2.5">Periode / Tanggal</th>
                    <th className="px-4 py-2.5" style={{ color: 'var(--color-danger)' }}>
                      Batas Bawah ({confidenceLevel * 100}% CI)
                    </th>
                    <th className="px-4 py-2.5 text-[var(--color-primary)] font-bold">
                      Proyeksi Sentral
                    </th>
                    <th className="px-4 py-2.5" style={{ color: 'var(--color-success)' }}>
                      Batas Atas ({confidenceLevel * 100}% CI)
                    </th>
                    <th className="px-4 py-2.5 text-[var(--text-secondary)]">Margin of Error (±)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {forecastResult.points
                    .filter(p => p.historical === undefined)
                    .map((p, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-caramel-soft)] transition-theme">
                        <td className="px-4 py-2 text-[var(--text-secondary)] font-sans font-semibold">
                          T+{idx + 1}
                        </td>
                        <td className="px-4 py-2 font-semibold text-[var(--text-main)]">{p.date}</td>
                        <td className="px-4 py-2" style={{ color: 'var(--color-danger)' }}>
                          {p.lowerBound?.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-primary)] font-bold">
                          {p.forecast?.toLocaleString()}
                        </td>
                        <td className="px-4 py-2" style={{ color: 'var(--color-success)' }}>
                          {p.upperBound?.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-[var(--text-secondary)]">
                          ± {p.marginOfError?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* AI Decision Support Box */}
      {aiAnalysis && (
        <div
          className="p-6 rounded-2xl border border-[var(--accent-caramel)] space-y-3"
          style={{ backgroundColor: 'var(--bg-caramel-soft)' }}
        >
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Evaluasi Manajerial AI & Rekomendasi Mitigasi ({confidenceLevel * 100}% CI Context)</span>
          </div>
          <div className="text-xs text-[var(--text-main)] leading-relaxed whitespace-pre-wrap font-sans">
            {aiAnalysis}
          </div>
        </div>
      )}
    </div>
  );
};
