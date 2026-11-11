import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { exportElementAsPng } from '../../utils/exportUtils';
import {
  PieChart as PieIcon,
  BarChart as BarIcon,
  LineChart as LineIcon,
  TrendingUp,
  Download,
  Filter,
  Sparkles,
  Sliders,
  Maximize2
} from 'lucide-react';
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

const PALETTE = ['#00ADB5', '#38BDF8', '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#10B981', '#F59E0B', '#F97316'];

export const DataVisualization: React.FC = () => {
  const { selectedDataset, currentStats, addToast } = useApp();

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisCol, setXAxisCol] = useState<string>(() => {
    return currentStats.categoricalCols[0] || currentStats.dateCols[0] || Object.keys(selectedDataset?.data?.[0] || {})[0] || '';
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
      const secVal = typeof row[secondaryMetricCol] === 'number' ? row[secondaryMetricCol] : Number(row[secondaryMetricCol]) || 0;

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

    // Sort descending by value and take top items
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarIcon className="w-5 h-5 text-cyan-400" />
            Modul Visualisasi Data & Interactive Charts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visualisasi multidimensi adaptif dengan data aktual, pengelompokan data dinamis, dan ekspor instan.
          </p>
        </div>

        <button
          onClick={handleDownloadPng}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition active:scale-95 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Grafik PNG</span>
        </button>
      </div>

      {/* Chart Configuration Controls Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
        {/* Chart Type Selector */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block mb-2">Pilih Tipe Visualisasi:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { type: 'bar' as ChartType, label: 'Bar Chart' },
              { type: 'line' as ChartType, label: 'Line Chart' },
              { type: 'area' as ChartType, label: 'Area Chart' },
              { type: 'pie' as ChartType, label: 'Pie Chart' },
              { type: 'donut' as ChartType, label: 'Donut Chart' },
              { type: 'combo' as ChartType, label: 'Combo (Bar+Line)' },
              { type: 'radar' as ChartType, label: 'Radar Chart' },
              { type: 'scatter' as ChartType, label: 'Scatter Plot' },
            ].map(item => (
              <button
                key={item.type}
                onClick={() => setChartType(item.type)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  chartType === item.type
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Variables and Aggregation Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          <div>
            <label className="text-slate-400 block mb-1">Dimensi Sumbu X / Kategori:</label>
            <select
              value={xAxisCol}
              onChange={(e) => setXAxisCol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {currentStats.columns.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Metrik Nilai (Sumbu Y):</label>
            <select
              value={yAxisCol}
              onChange={(e) => setYAxisCol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {currentStats.numericCols.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {chartType === 'combo' && (
            <div>
              <label className="text-slate-400 block mb-1">Metrik Garis Sekunder:</label>
              <select
                value={secondaryMetricCol}
                onChange={(e) => setSecondaryMetricCol(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {currentStats.numericCols.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1">Fungsi Agregasi:</label>
            <select
              value={aggMode}
              onChange={(e) => setAggMode(e.target.value as AggregationMode)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="sum">Sum (Total)</option>
              <option value="avg">Average (Rata-rata)</option>
              <option value="count">Count (Frekuensi)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Batas Data (Top N):</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
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
      <div
        id="chart-container-box"
        className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              {aggMode.toUpperCase()} {yAxisCol} by {xAxisCol}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dataset: {selectedDataset?.name} (Menampilkan {chartData.length} entitas teratas)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">
              Agregasi: {aggMode}
            </span>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-96 w-full pt-4">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Pilih variabel numerik dan kategori yang valid untuk menampilkan visualisasi
            </div>
          ) : chartType === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(v: any) => [Number(v).toLocaleString(), yAxisCol]}
                />
                <Bar dataKey="value" fill="#00ADB5" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : chartType === 'line' ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLine data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(v: any) => [Number(v).toLocaleString(), yAxisCol]}
                />
                <Line type="monotone" dataKey="value" stroke="#00ADB5" strokeWidth={3} dot={{ r: 4, fill: '#00ADB5' }} />
              </RechartsLine>
            </ResponsiveContainer>
          ) : chartType === 'area' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ADB5" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#00ADB5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(v: any) => [Number(v).toLocaleString(), yAxisCol]}
                />
                <Area type="monotone" dataKey="value" stroke="#00ADB5" strokeWidth={2.5} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : chartType === 'pie' || chartType === 'donut' ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(v: any) => [Number(v).toLocaleString(), yAxisCol]}
                />
                <Legend />
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
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
              </RechartsPie>
            </ResponsiveContainer>
          ) : chartType === 'combo' ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="value" name={yAxisCol} fill="#00ADB5" radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="secondaryValue" name={secondaryMetricCol} stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : chartType === 'radar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis stroke="#64748b" />
                <Radar name={yAxisCol} dataKey="value" stroke="#00ADB5" fill="#00ADB5" fillOpacity={0.5} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis dataKey="value" stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Scatter name={yAxisCol} data={chartData} fill="#00ADB5" />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
