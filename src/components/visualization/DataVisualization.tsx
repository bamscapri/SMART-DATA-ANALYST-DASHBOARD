import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { exportElementAsPng } from '../../utils/exportUtils';
import { BarChart as BarIcon, Download, Sparkles } from 'lucide-react';
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
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter' | 'radar' | 'combo';
export type AggregationMode = 'sum' | 'avg' | 'count';

export const DataVisualization: React.FC = () => {
  const { selectedDataset, currentStats, addToast } = useApp();
  const { chartTheme } = useTheme();

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
        count: stat.count
      };
    });

    items.sort((a, b) => b.value - a.value);
    return items.slice(0, limit);
  }, [selectedDataset, xAxisCol, yAxisCol, secondaryMetricCol, aggMode, limit]);

  const handleDownloadPng = async () => {
    try {
      await exportElementAsPng('chart-container-box', `${selectedDataset?.name}_chart.png`);
      addToast('success', 'Grafik Berhasil Diekspor', 'File PNG telah diunduh.');
    } catch {
      addToast('error', 'Gagal Mengekspor Grafik');
    }
  };

  const tooltipStyle = {
    backgroundColor: chartTheme.tooltipBg,
    borderColor: chartTheme.tooltipBorder,
    color: chartTheme.tooltipText,
    borderRadius: '10px',
    fontSize: '11px'
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
            Visualisasi multidimensi adaptif dengan data aktual, pengelompokan data dinamis, dan ekspor instan.
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

      {/* Chart Configuration Controls Card */}
      <div className="p-5 rounded-xl surface-card space-y-4 text-xs">
        {/* Chart Type Selector */}
        <div>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-2">
            Pilih Tipe Visualisasi:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { type: 'bar' as ChartType, label: 'Bar Chart' },
              { type: 'line' as ChartType, label: 'Line Chart' },
              { type: 'area' as ChartType, label: 'Area Chart' },
              { type: 'pie' as ChartType, label: 'Pie Chart' },
              { type: 'donut' as ChartType, label: 'Donut Chart' },
              { type: 'combo' as ChartType, label: 'Combo (Bar+Line)' },
              { type: 'radar' as ChartType, label: 'Radar Chart' },
              { type: 'scatter' as ChartType, label: 'Scatter Plot' }
            ].map(item => (
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
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
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
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
            >
              {currentStats.numericCols.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {chartType === 'combo' && (
            <div>
              <label htmlFor="viz-sec" className="text-[var(--text-secondary)] block mb-1 font-medium">
                Metrik Garis Sekunder
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
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
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
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-caramel)]"
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
              <Sparkles className="w-4 h-4 text-[var(--accent-caramel)]" />
              <span>
                {aggMode.toUpperCase()} {yAxisCol} by {xAxisCol}
              </span>
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Dataset: {selectedDataset?.name} · Menampilkan {chartData.length} entitas teratas
            </p>
          </div>

          <div className="text-[11px] text-[var(--color-primary)] font-mono font-semibold">
            Agregasi: {aggMode.toUpperCase()}
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-96 w-full pt-4">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[var(--text-secondary)]">
              Pilih variabel numerik dan kategori yang valid untuk menampilkan visualisasi
            </div>
          ) : chartType === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                <XAxis
                  dataKey="name"
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 11, fill: chartTheme.axisTickColor }}
                />
                <YAxis
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 11, fill: chartTheme.axisTickColor }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: any) => [Number(v).toLocaleString(), yAxisCol]}
                />
                <Bar dataKey="value" fill={chartTheme.primary} radius={[6, 6, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={chartTheme.palette[index % chartTheme.palette.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : chartType === 'line' ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLine data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                <XAxis
                  dataKey="name"
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 11, fill: chartTheme.axisTickColor }}
                />
                <YAxis
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 11, fill: chartTheme.axisTickColor }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: any) => [Number(v).toLocaleString(), yAxisCol]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={chartTheme.primary}
                  strokeWidth={3}
                  dot={{ r: 4, fill: chartTheme.caramel }}
                />
              </RechartsLine>
            </ResponsiveContainer>
          ) : chartType === 'area' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="areaGradBrown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartTheme.caramel} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={chartTheme.caramel} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                <XAxis
                  dataKey="name"
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 11, fill: chartTheme.axisTickColor }}
                />
                <YAxis
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 11, fill: chartTheme.axisTickColor }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: any) => [Number(v).toLocaleString(), yAxisCol]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartTheme.primary}
                  strokeWidth={2.5}
                  fill="url(#areaGradBrown)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : chartType === 'pie' || chartType === 'donut' ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: any) => [Number(v).toLocaleString(), yAxisCol]}
                />
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
                    <Cell
                      key={`cell-${index}`}
                      fill={chartTheme.palette[index % chartTheme.palette.length]}
                    />
                  ))}
                </Pie>
              </RechartsPie>
            </ResponsiveContainer>
          ) : chartType === 'combo' ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                <XAxis
                  dataKey="name"
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 11, fill: chartTheme.axisTickColor }}
                />
                <YAxis
                  yAxisId="left"
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 11, fill: chartTheme.axisTickColor }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 11, fill: chartTheme.axisTickColor }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', color: chartTheme.tooltipText }} />
                <Bar
                  yAxisId="left"
                  dataKey="value"
                  name={yAxisCol}
                  fill={chartTheme.primary}
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="secondaryValue"
                  name={secondaryMetricCol}
                  stroke={chartTheme.caramel}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : chartType === 'radar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid stroke={chartTheme.gridStroke} />
                <PolarAngleAxis
                  dataKey="name"
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                />
                <PolarRadiusAxis stroke={chartTheme.axisStroke} />
                <Radar
                  name={yAxisCol}
                  dataKey="value"
                  stroke={chartTheme.primary}
                  fill={chartTheme.caramel}
                  fillOpacity={0.45}
                />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                <XAxis
                  dataKey="name"
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 11, fill: chartTheme.axisTickColor }}
                />
                <YAxis
                  dataKey="value"
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 11, fill: chartTheme.axisTickColor }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Scatter name={yAxisCol} data={chartData} fill={chartTheme.primary} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
