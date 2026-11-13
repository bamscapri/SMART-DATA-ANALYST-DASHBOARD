import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { exportElementAsPng } from '../../utils/exportUtils';
import { BarChart as BarIcon, Download, Sparkles, Wand2, Grid3X3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart as RechartsLine,
  Line,
  AreaChart,
  Area,
  PieChart as RechartsPie,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Treemap,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'stacked_area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'radar'
  | 'combo'
  | 'histogram'
  | 'boxplot'
  | 'heatmap'
  | 'treemap';

export type AggregationMode = 'sum' | 'avg' | 'count';

interface BoxPlotGroupStat {
  name: string;
  count: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

function quantileSorted(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export const DataVisualization: React.FC = () => {
  const { selectedDataset, currentStats, intelligenceReport, addToast } = useApp();
  const { chartTheme, darkMode } = useTheme();

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisCol, setXAxisCol] = useState<string>(() => {
    return (
      currentStats.categoricalCols[0] ||
      currentStats.dateCols[0] ||
      Object.keys(selectedDataset?.data?.[0] || {})[0] ||
      ''
    );
  });
  const [yAxisCol, setYAxisCol] = useState<string>(() => {
    return currentStats.numericCols[0] || '';
  });
  const [secondaryMetricCol, setSecondaryMetricCol] = useState<string>(() => {
    return currentStats.numericCols[1] || currentStats.numericCols[0] || '';
  });
  const [aggMode, setAggMode] = useState<AggregationMode>('sum');
  const [limit, setLimit] = useState<number>(10);

  // Sync axis selections when active dataset changes
  useEffect(() => {
    const allCols = currentStats.columns.map(c => c.name);
    if (!allCols.includes(xAxisCol)) {
      setXAxisCol(
        currentStats.categoricalCols[0] ||
          currentStats.dateCols[0] ||
          allCols[0] ||
          ''
      );
    }
    if (!currentStats.numericCols.includes(yAxisCol)) {
      setYAxisCol(currentStats.numericCols[0] || '');
    }
    if (!currentStats.numericCols.includes(secondaryMetricCol)) {
      setSecondaryMetricCol(
        currentStats.numericCols[1] || currentStats.numericCols[0] || ''
      );
    }
  }, [selectedDataset?.id, currentStats]);

  // Group and aggregate data
  const chartData = useMemo(() => {
    const raw = selectedDataset?.data || [];
    if (raw.length === 0 || !xAxisCol || !yAxisCol) return [];

    const grouped: Record<string, { sum: number; count: number; sumSec: number }> = {};

    for (const row of raw) {
      const key = String(row[xAxisCol] ?? 'Unspecified');
      const val = typeof row[yAxisCol] === 'number' ? row[yAxisCol] : Number(row[yAxisCol]) || 0;
      const secVal =
        typeof row[secondaryMetricCol] === 'number'
          ? row[secondaryMetricCol]
          : Number(row[secondaryMetricCol]) || 0;

      if (!grouped[key]) {
        grouped[key] = { sum: 0, count: 0, sumSec: 0 };
      }
      grouped[key].sum += val;
      grouped[key].count += 1;
      grouped[key].sumSec += secVal;
    }

    const items = Object.entries(grouped).map(([name, stat]) => {
      let finalVal = stat.sum;
      let finalSecVal = stat.sumSec;

      if (aggMode === 'avg') {
        finalVal = stat.sum / (stat.count || 1);
        finalSecVal = stat.sumSec / (stat.count || 1);
      } else if (aggMode === 'count') {
        finalVal = stat.count;
        finalSecVal = stat.count;
      }

      return {
        name,
        value: Math.round(finalVal * 100) / 100,
        secondaryValue: Math.round(finalSecVal * 100) / 100,
        count: stat.count,
      };
    });

    if (chartType === 'line' || chartType === 'area' || chartType === 'stacked_area') {
      const isDateDim = currentStats.dateCols.includes(xAxisCol);
      if (isDateDim) {
        items.sort((a, b) => a.name.localeCompare(b.name));
        return items.slice(0, Math.max(limit, 25));
      }
    }

    items.sort((a, b) => b.value - a.value);
    return items.slice(0, limit);
  }, [selectedDataset, xAxisCol, yAxisCol, secondaryMetricCol, aggMode, limit, chartType, currentStats.dateCols]);

  // Histogram data from dataProfiler
  const histogramProfile = useMemo(() => {
    return intelligenceReport.profile.columns.find(
      c => c.name === yAxisCol && c.histogramBins && c.histogramBins.length > 0
    );
  }, [intelligenceReport, yAxisCol]);

  // Boxplot quartile data grouped by xAxisCol
  const boxPlotStats = useMemo<BoxPlotGroupStat[]>(() => {
    const raw = selectedDataset?.data || [];
    if (raw.length === 0 || !xAxisCol || !yAxisCol) return [];
    const grouped = new Map<string, number[]>();
    for (const row of raw) {
      const key = String(row[xAxisCol] ?? 'Unspecified');
      const val = typeof row[yAxisCol] === 'number' ? row[yAxisCol] : Number(row[yAxisCol]);
      if (!Number.isFinite(val)) continue;
      const arr = grouped.get(key) || [];
      arr.push(val);
      grouped.set(key, arr);
    }
    return Array.from(grouped.entries())
      .map(([name, vals]) => {
        const sorted = [...vals].sort((a, b) => a - b);
        return {
          name,
          count: sorted.length,
          min: Math.round(sorted[0] * 100) / 100,
          q1: Math.round(quantileSorted(sorted, 0.25) * 100) / 100,
          median: Math.round(quantileSorted(sorted, 0.5) * 100) / 100,
          q3: Math.round(quantileSorted(sorted, 0.75) * 100) / 100,
          max: Math.round(sorted[sorted.length - 1] * 100) / 100,
        };
      })
      .sort((a, b) => b.median - a.median)
      .slice(0, limit);
  }, [selectedDataset, xAxisCol, yAxisCol, limit]);

  // Treemap data
  const treemapData = useMemo(() => {
    return chartData
      .filter(d => d.value > 0)
      .map((d, idx) => ({
        name: d.name,
        size: d.value,
        fill: chartTheme.palette[idx % chartTheme.palette.length],
      }));
  }, [chartData, chartTheme.palette]);

  // Heatmap correlation matrix
  const correlationMatrix = intelligenceReport.eda.correlationMatrix;

  const handleDownloadPng = async () => {
    try {
      await exportElementAsPng('chart-container-box', `${selectedDataset?.name}_chart.png`);
      addToast('success', 'Grafik Berhasil Diekspor', 'File PNG telah diunduh.');
    } catch {
      addToast('error', 'Gagal Mengekspor Grafik');
    }
  };

  const applyRecommendation = (recId: string) => {
    const rec = intelligenceReport.chartRecommendations.find(r => r.id === recId);
    if (!rec) return;
    setChartType(rec.chartType as ChartType);
    if (rec.xCol) setXAxisCol(rec.xCol);
    if (rec.yCol) setYAxisCol(rec.yCol);
    if (rec.secondaryCol) setSecondaryMetricCol(rec.secondaryCol);
    setAggMode(rec.aggMode);
    addToast('info', 'Konfigurasi Grafik Diterapkan', rec.title);
  };

  const tooltipStyle = {
    backgroundColor: chartTheme.tooltipBg,
    borderColor: chartTheme.tooltipBorder,
    color: chartTheme.tooltipText,
    borderRadius: '10px',
    fontSize: '11px',
  };

  const chartOptions: { type: ChartType; label: string }[] = [
    { type: 'bar', label: 'Bar Chart' },
    { type: 'line', label: 'Line Chart' },
    { type: 'area', label: 'Area Chart' },
    { type: 'stacked_area', label: 'Stacked Area' },
    { type: 'pie', label: 'Pie Chart' },
    { type: 'donut', label: 'Donut Chart' },
    { type: 'combo', label: 'Combo (Bar+Line)' },
    { type: 'radar', label: 'Radar Chart' },
    { type: 'scatter', label: 'Scatter Plot' },
    { type: 'histogram', label: 'Histogram Distribusi' },
    { type: 'boxplot', label: 'Box Plot (Kuartil)' },
    { type: 'heatmap', label: 'Correlation Heatmap' },
    { type: 'treemap', label: 'Treemap Komposisi' },
  ];

  const getHeatmapCellStyle = (r: number): React.CSSProperties => {
    const absR = Math.min(1, Math.abs(r));
    if (r >= 0) {
      return {
        backgroundColor: darkMode
          ? `rgba(196, 154, 108, ${0.14 + absR * 0.65})`
          : `rgba(123, 75, 42, ${0.08 + absR * 0.72})`,
        color: absR > 0.52 ? '#FFFDF9' : 'var(--text-main)',
      };
    }
    return {
      backgroundColor: `rgba(159, 62, 40, ${0.1 + absR * 0.68})`,
      color: absR > 0.45 ? '#FFFDF9' : 'var(--text-main)',
    };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <BarIcon className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Modul Visualisasi Data & Interactive Charts</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            13 tipe visualisasi multidimensi adaptif (termasuk Histogram, Box Plot, Correlation Heatmap & Treemap) dengan rekomendasi otomatis.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadPng}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold text-xs shadow-xs transition-theme active:scale-95 self-start sm:self-auto whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Grafik PNG</span>
        </button>
      </div>

      {/* Auto Chart Recommendations Strip */}
      {intelligenceReport.chartRecommendations.length > 0 && (
        <div className="p-4 rounded-xl surface-card space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]">
            <Wand2 className="w-4 h-4 text-[var(--accent-caramel)]" />
            <span>Rekomendasi Visualisasi Otomatis (Sesuai Struktur Data)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {intelligenceReport.chartRecommendations.slice(0, 4).map(rec => {
              const isSelected = chartType === rec.chartType && xAxisCol === rec.xCol && yAxisCol === rec.yCol;
              return (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => applyRecommendation(rec.id)}
                  className={`p-3 rounded-lg border text-left transition-theme cursor-pointer ${
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--bg-caramel-soft)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent-caramel)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                      {rec.chartType.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">Terapkan</span>
                  </div>
                  <div className="text-xs font-bold text-[var(--text-main)] line-clamp-1">
                    {rec.title}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                    {rec.reason}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart Configuration Controls Card */}
      <div className="p-5 rounded-xl surface-card space-y-4 text-xs">
        <div>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-2">
            Pilih Tipe Visualisasi:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {chartOptions.map(item => (
              <button
                key={item.type}
                type="button"
                onClick={() => setChartType(item.type)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-theme cursor-pointer whitespace-nowrap ${
                  chartType === item.type
                    ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)] font-semibold shadow-2xs'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)] border border-[var(--border-color)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Variables and Aggregation Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-color)]">
          <div>
            <label htmlFor="viz-x" className="text-[var(--text-secondary)] block mb-1 font-medium">
              Dimensi Sumbu X / Kategori
            </label>
            <select
              id="viz-x"
              value={xAxisCol}
              onChange={(e) => setXAxisCol(e.target.value)}
              disabled={chartType === 'histogram' || chartType === 'heatmap'}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-main)] disabled:opacity-50 focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              {currentStats.columns.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="viz-y" className="text-[var(--text-secondary)] block mb-1 font-medium">
              Metrik Nilai (Sumbu Y)
            </label>
            <select
              id="viz-y"
              value={yAxisCol}
              onChange={(e) => setYAxisCol(e.target.value)}
              disabled={chartType === 'heatmap'}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-main)] disabled:opacity-50 focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              {currentStats.numericCols.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {(chartType === 'combo' || chartType === 'stacked_area') && (
            <div>
              <label htmlFor="viz-sec" className="text-[var(--text-secondary)] block mb-1 font-medium">
                Metrik Sekunder
              </label>
              <select
                id="viz-sec"
                value={secondaryMetricCol}
                onChange={(e) => setSecondaryMetricCol(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
              >
                {currentStats.numericCols.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="viz-agg" className="text-[var(--text-secondary)] block mb-1 font-medium">
              Fungsi Agregasi
            </label>
            <select
              id="viz-agg"
              value={aggMode}
              onChange={(e) => setAggMode(e.target.value as AggregationMode)}
              disabled={chartType === 'histogram' || chartType === 'boxplot' || chartType === 'heatmap'}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-main)] disabled:opacity-50 focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              <option value="sum">Sum (Total)</option>
              <option value="avg">Average (Rata-rata)</option>
              <option value="count">Count (Frekuensi)</option>
            </select>
          </div>

          <div>
            <label htmlFor="viz-limit" className="text-[var(--text-secondary)] block mb-1 font-medium">
              Batas Data (Top N)
            </label>
            <select
              id="viz-limit"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={chartType === 'histogram' || chartType === 'heatmap'}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-main)] disabled:opacity-50 focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={25}>Top 25</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Chart Display Area */}
      <div id="chart-container-box" className="p-6 rounded-2xl surface-card space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              {chartType === 'heatmap' ? (
                <Grid3X3 className="w-4 h-4 text-[var(--accent-caramel)]" />
              ) : (
                <Sparkles className="w-4 h-4 text-[var(--accent-caramel)]" />
              )}
              <span>
                {chartType === 'heatmap'
                  ? 'Matriks Korelasi Pearson Antar Variabel Numerik'
                  : chartType === 'histogram'
                  ? `Histogram Distribusi Frekuensi: ${yAxisCol}`
                  : chartType === 'boxplot'
                  ? `Box Plot Sebaran Kuartil (${yAxisCol} by ${xAxisCol})`
                  : `${aggMode.toUpperCase()} ${yAxisCol} by ${xAxisCol}`}
              </span>
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Dataset: {selectedDataset?.name} ·{' '}
              {chartType === 'heatmap'
                ? `${correlationMatrix.columns.length} variabel numerik`
                : chartType === 'histogram'
                ? `${histogramProfile?.histogramBins?.length || 0} interval bin distribusi`
                : chartType === 'boxplot'
                ? `${boxPlotStats.length} kelompok distribusi kuartil`
                : `Menampilkan ${chartData.length} entitas teratas`}
            </p>
          </div>

          <div className="text-[11px] text-[var(--color-primary)] font-mono font-semibold uppercase">
            {chartType.replace('_', ' ')}
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="min-h-96 w-full pt-2">
          {chartType === 'heatmap' ? (
            correlationMatrix.columns.length < 2 ? (
              <div className="h-80 flex items-center justify-center text-xs text-[var(--text-secondary)]">
                Dataset membutuhkan minimal 2 kolom numerik untuk menampilkan Correlation Heatmap.
              </div>
            ) : (
              <div className="space-y-4 overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-[var(--text-secondary)] font-semibold border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        Variabel
                      </th>
                      {correlationMatrix.columns.map(col => (
                        <th
                          key={col}
                          className="p-2 text-center text-[var(--text-main)] font-semibold border border-[var(--border-color)] bg-[var(--bg-secondary)] whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlationMatrix.columns.map((rowCol, rIdx) => (
                      <tr key={rowCol}>
                        <td className="p-2 font-semibold text-[var(--text-main)] border border-[var(--border-color)] bg-[var(--bg-secondary)] whitespace-nowrap">
                          {rowCol}
                        </td>
                        {correlationMatrix.columns.map((colCol, cIdx) => {
                          const val = correlationMatrix.matrix[rIdx]?.[cIdx] ?? 0;
                          return (
                            <td
                              key={`${rowCol}-${colCol}`}
                              style={getHeatmapCellStyle(val)}
                              title={`${rowCol} ↔ ${colCol}: r = ${val}`}
                              className="p-2.5 text-center font-mono font-bold border border-[var(--border-color)] tabular-nums"
                            >
                              {val.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-[11px] text-[var(--text-secondary)] flex flex-wrap gap-4">
                  <span>Skala Pearson r: -1.00 (korelasi negatif kuat) hingga +1.00 (korelasi positif kuat).</span>
                </div>
              </div>
            )
          ) : chartType === 'histogram' ? (
            !histogramProfile?.histogramBins ? (
              <div className="h-80 flex items-center justify-center text-xs text-[var(--text-secondary)]">
                Pilih kolom numerik yang valid untuk menampilkan Histogram distribusi frekuensi.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramProfile.histogramBins}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                      <XAxis
                        dataKey="label"
                        stroke={chartTheme.axisStroke}
                        tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                      />
                      <YAxis
                        stroke={chartTheme.axisStroke}
                        tick={{ fontSize: 11, fill: chartTheme.axisTickColor }}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: any) => [`${v} baris`, 'Frekuensi']}
                      />
                      <Bar dataKey="count" name="Frekuensi" fill={chartTheme.caramel} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {histogramProfile.numericStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)]">Mean:</span>{' '}
                      <strong className="text-[var(--text-main)]">{histogramProfile.numericStats.mean.toLocaleString('id-ID')}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)]">Median:</span>{' '}
                      <strong className="text-[var(--text-main)]">{histogramProfile.numericStats.median.toLocaleString('id-ID')}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)]">StdDev:</span>{' '}
                      <strong className="text-[var(--text-main)]">{histogramProfile.numericStats.stdDev.toLocaleString('id-ID')}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)]">Skewness:</span>{' '}
                      <strong className="text-[var(--text-main)]">{histogramProfile.numericStats.skewness}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)]">Outlier (IQR):</span>{' '}
                      <strong className="text-[var(--text-main)]">{histogramProfile.numericStats.outlierCountIQR}</strong>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : chartType === 'boxplot' ? (
            boxPlotStats.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-xs text-[var(--text-secondary)]">
                Pilih dimensi kategori dan metrik numerik untuk menghitung sebaran Box Plot.
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const globalMin = Math.min(...boxPlotStats.map(b => b.min));
                  const globalMax = Math.max(...boxPlotStats.map(b => b.max));
                  const span = globalMax - globalMin || 1;
                  const toPct = (v: number) => ((v - globalMin) / span) * 100;
                  return (
                    <div className="space-y-2.5">
                      {boxPlotStats.map(item => (
                        <div key={item.name} className="grid grid-cols-12 items-center gap-3 text-[11px]">
                          <div className="col-span-3 truncate font-semibold text-[var(--text-main)]" title={item.name}>
                            {item.name} <span className="text-[var(--text-secondary)] font-normal">(n={item.count})</span>
                          </div>
                          <div className="col-span-7 relative h-7 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] px-2 flex items-center">
                            <div className="relative w-full h-4">
                              <div
                                className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-[var(--text-secondary)]"
                                style={{
                                  left: `${toPct(item.min)}%`,
                                  width: `${Math.max(1, toPct(item.max) - toPct(item.min))}%`,
                                }}
                              />
                              <div
                                className="absolute top-0.5 bottom-0.5 rounded-xs border border-[var(--color-primary)]"
                                style={{
                                  left: `${toPct(item.q1)}%`,
                                  width: `${Math.max(2, toPct(item.q3) - toPct(item.q1))}%`,
                                  backgroundColor: 'var(--bg-caramel-soft)',
                                }}
                              />
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-primary)]"
                                style={{ left: `${toPct(item.median)}%` }}
                              />
                            </div>
                          </div>
                          <div className="col-span-2 text-right font-mono text-[10px] text-[var(--text-secondary)] tabular-nums">
                            Med: <strong className="text-[var(--text-main)]">{item.median.toLocaleString('id-ID')}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-[11px] border border-[var(--border-color)]">
                    <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                      <tr>
                        <th className="p-2 text-left">Kelompok</th>
                        <th className="p-2 text-right">n</th>
                        <th className="p-2 text-right">Min</th>
                        <th className="p-2 text-right">Q1</th>
                        <th className="p-2 text-right">Median</th>
                        <th className="p-2 text-right">Q3</th>
                        <th className="p-2 text-right">Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boxPlotStats.map(b => (
                        <tr key={b.name} className="border-t border-[var(--border-color)]">
                          <td className="p-2 font-semibold text-[var(--text-main)]">{b.name}</td>
                          <td className="p-2 text-right tabular-nums">{b.count}</td>
                          <td className="p-2 text-right tabular-nums">{b.min.toLocaleString('id-ID')}</td>
                          <td className="p-2 text-right tabular-nums">{b.q1.toLocaleString('id-ID')}</td>
                          <td className="p-2 text-right font-bold tabular-nums">{b.median.toLocaleString('id-ID')}</td>
                          <td className="p-2 text-right tabular-nums">{b.q3.toLocaleString('id-ID')}</td>
                          <td className="p-2 text-right tabular-nums">{b.max.toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : chartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-xs text-[var(--text-secondary)]">
              Pilih variabel numerik dan kategori yang valid untuk menampilkan visualisasi
            </div>
          ) : chartType === 'treemap' ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  nameKey="name"
                  stroke="#FFFDF9"
                  fill={chartTheme.primary}
                >
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: any) => [Number(v).toLocaleString('id-ID'), yAxisCol]}
                  />
                </Treemap>
              </ResponsiveContainer>
            </div>
          ) : chartType === 'stacked_area' ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                  <XAxis dataKey="name" stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <YAxis stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: chartTheme.tooltipText }} />
                  <Area type="monotone" dataKey="value" stackId="1" name={yAxisCol} stroke={chartTheme.primary} fill={chartTheme.primary} fillOpacity={0.55} />
                  <Area type="monotone" dataKey="secondaryValue" stackId="1" name={secondaryMetricCol} stroke={chartTheme.caramel} fill={chartTheme.caramel} fillOpacity={0.45} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : chartType === 'bar' ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                  <XAxis dataKey="name" stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <YAxis stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [Number(v).toLocaleString(), yAxisCol]} />
                  <Bar dataKey="value" fill={chartTheme.primary} radius={[6, 6, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={chartTheme.palette[index % chartTheme.palette.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : chartType === 'line' ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                  <XAxis dataKey="name" stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <YAxis stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [Number(v).toLocaleString(), yAxisCol]} />
                  <Line type="monotone" dataKey="value" stroke={chartTheme.primary} strokeWidth={3} dot={{ r: 4, fill: chartTheme.caramel }} />
                </RechartsLine>
              </ResponsiveContainer>
            </div>
          ) : chartType === 'area' ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="areaGradBrown" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartTheme.caramel} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={chartTheme.caramel} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                  <XAxis dataKey="name" stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <YAxis stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [Number(v).toLocaleString(), yAxisCol]} />
                  <Area type="monotone" dataKey="value" stroke={chartTheme.primary} strokeWidth={2.5} fill="url(#areaGradBrown)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : chartType === 'pie' || chartType === 'donut' ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [Number(v).toLocaleString(), yAxisCol]} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: chartTheme.tooltipText }} />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={chartType === 'donut' ? 70 : 0}
                    outerRadius={120}
                    paddingAngle={3}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={chartTheme.palette[index % chartTheme.palette.length]} />
                    ))}
                  </Pie>
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          ) : chartType === 'combo' ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                  <XAxis dataKey="name" stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <YAxis yAxisId="left" stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <YAxis yAxisId="right" orientation="right" stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: chartTheme.tooltipText }} />
                  <Bar yAxisId="left" dataKey="value" name={yAxisCol} fill={chartTheme.primary} radius={[6, 6, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="secondaryValue" name={secondaryMetricCol} stroke={chartTheme.caramel} strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : chartType === 'radar' ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData}>
                  <PolarGrid stroke={chartTheme.gridStroke} />
                  <PolarAngleAxis dataKey="name" stroke={chartTheme.axisStroke} tick={{ fontSize: 10, fill: chartTheme.axisTickColor }} />
                  <PolarRadiusAxis stroke={chartTheme.axisStroke} />
                  <Radar name={yAxisCol} dataKey="value" stroke={chartTheme.primary} fill={chartTheme.caramel} fillOpacity={0.45} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                  <XAxis dataKey="name" stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <YAxis dataKey="value" stroke={chartTheme.axisStroke} tick={{ fontSize: 11, fill: chartTheme.axisTickColor }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Scatter name={yAxisCol} data={chartData} fill={chartTheme.primary} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
