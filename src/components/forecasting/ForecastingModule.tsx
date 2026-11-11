import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  generateForecast,
  ForecastMethod,
  ForecastHorizon,
  ForecastOutput,
  DataPoint
} from '../../utils/forecasting';
import {
  TrendingUp,
  Sliders,
  Calendar,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Target
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

  const [dateCol, setDateCol] = useState<string>(() => {
    return currentStats.dateCols[0] || Object.keys(selectedDataset?.data?.[0] || {})[0] || '';
  });

  const [targetCol, setTargetCol] = useState<string>(() => {
    return currentStats.numericCols[0] || '';
  });

  const [method, setMethod] = useState<ForecastMethod>('linear');
  const [horizon, setHorizon] = useState<ForecastHorizon>('30d');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Extract valid historical series
  const historySeries: DataPoint[] = useMemo(() => {
    const raw = selectedDataset?.data || [];
    if (!dateCol || !targetCol || raw.length === 0) return [];

    return raw
      .filter(r => r[dateCol] && r[targetCol] !== null && r[targetCol] !== undefined)
      .map(r => ({
        date: String(r[dateCol]),
        value: typeof r[targetCol] === 'number' ? r[targetCol] : Number(r[targetCol]) || 0
      }))
      .filter(d => !isNaN(d.value));
  }, [selectedDataset, dateCol, targetCol]);

  // Run pure forecast logic
  const forecastResult: ForecastOutput | null = useMemo(() => {
    if (historySeries.length < 3) return null;
    return generateForecast(historySeries, method, horizon);
  }, [historySeries, method, horizon]);

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
          evaluation: forecastResult.evaluation,
          pointsSample: forecastResult.points.slice(-10)
        })
      });

      if (!res.ok) throw new Error('Gagal memproses interpretasi AI.');
      const data = await res.json();
      setAiAnalysis(data.analysis);
      logActivity('RUN_FORECAST', 'Forecasting', targetCol, `Method: ${method}, Horizon: ${horizon}`);
      addToast('success', 'Interpretasi AI Selesai', 'Rekomendasi manajerial berbasis proyeksi berhasil disusun.');
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Gagal Mendapatkan Analisis AI', err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Modul Forecasting & Prediksi Statistik Masa Depan
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Peramalan time-series time-horizon berbasis regresi, moving average, atau exponential smoothing dengan batas selang kepercayaan 95% (Confidence Interval).
        </p>
      </div>

      {/* Model & Variable Selector Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Pilih Kolom Tanggal/Waktu:</label>
            <select
              value={dateCol}
              onChange={(e) => setDateCol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {currentStats.columns.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Target Variabel Numerik:</label>
            <select
              value={targetCol}
              onChange={(e) => setTargetCol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {currentStats.numericCols.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Metode Model Peramalan:</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as ForecastMethod)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="linear">Linear Regression (Tren Linier)</option>
              <option value="moving_average">Moving Average (Smoothing Rata-Rata Bergerak)</option>
              <option value="exponential_smoothing">Exponential Smoothing (Pembobotan Riwayat)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Horizon Waktu Prediksi:</label>
            <select
              value={horizon}
              onChange={(e) => setHorizon(e.target.value as ForecastHorizon)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="7d">Prediksi 7 Hari (Short-term)</option>
              <option value="30d">Prediksi 30 Hari (1 Bulan)</option>
              <option value="3m">Prediksi 3 Bulan (Quarterly)</option>
              <option value="6m">Prediksi 6 Bulan (Semi-annual)</option>
              <option value="12m">Prediksi 12 Bulan (1 Tahun)</option>
            </select>
          </div>
        </div>

        {historySeries.length < 5 && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              Perhatian: Jumlah data historis ({historySeries.length} titik) relatif terbatas. Direkomendasikan minimal 5 titik data untuk validitas statistik optimal.
            </span>
          </div>
        )}
      </div>

      {/* Model Performance KPIs */}
      {forecastResult && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Arah Tren:</span>
            <div className="flex items-center gap-1.5 mt-1">
              {forecastResult.evaluation.trend === 'UPWARD' ? (
                <>
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">UPWARD</span>
                </>
              ) : forecastResult.evaluation.trend === 'DOWNWARD' ? (
                <>
                  <ArrowDownRight className="w-4 h-4 text-rose-400" />
                  <span className="text-sm font-bold text-rose-400">DOWNWARD</span>
                </>
              ) : (
                <span className="text-sm font-bold text-blue-400">STABLE</span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Proyeksi Pertumbuhan:</span>
            <div className="text-sm font-bold text-white mt-1">
              {forecastResult.evaluation.growthPercentage > 0 ? '+' : ''}
              {forecastResult.evaluation.growthPercentage}%
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Model Fit (R²):</span>
            <div className="text-sm font-bold text-cyan-400 mt-1">
              {forecastResult.evaluation.r2}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Mean Abs Error (MAE):</span>
            <div className="text-sm font-bold text-slate-200 mt-1 font-mono">
              {forecastResult.evaluation.mae.toLocaleString()}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">RMSE:</span>
            <div className="text-sm font-bold text-slate-200 mt-1 font-mono">
              {forecastResult.evaluation.rmse.toLocaleString()}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">MAPE Error:</span>
            <div className="text-sm font-bold text-slate-200 mt-1">
              {forecastResult.evaluation.mape}%
            </div>
          </div>
        </div>
      )}

      {/* Main Historical vs Forecast Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              Proyeksi {targetCol} ({forecastResult?.horizonSteps || 30} Langkah ke Depan)
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Garis Solid: Data Historis Aktual • Garis Putus-putus: Prediksi Model • Area Cyan Transparan: Selang Kepercayaan (95% CI)
            </p>
          </div>

          <button
            onClick={handleRequestAiAnalysis}
            disabled={isAnalyzing || !forecastResult}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md transition self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-100" />
            <span>{isAnalyzing ? 'Menganalisis Proyeksi...' : 'AI Strategic Interpretation'}</span>
          </button>
        </div>

        <div className="h-96 w-full pt-2">
          {forecastResult ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastResult.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : v} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(val: any, name?: any) => [Number(val).toLocaleString(), String(name || '')]}
                />
                <Legend />
                {/* Confidence Interval Upper/Lower Area */}
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill="#00ADB5"
                  fillOpacity={0.12}
                  name="Confidence Upper (95%)"
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill="#00ADB5"
                  fillOpacity={0.08}
                  name="Confidence Lower (95%)"
                />
                {/* Historical Line */}
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#38BDF8"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#38BDF8' }}
                  name="Data Historis Aktual"
                />
                {/* Forecast Line */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#F59E0B' }}
                  name="Prediksi Masa Depan"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Pilih variabel numerik dan tanggal dengan data valid untuk menjalankan peramalan
            </div>
          )}
        </div>
      </div>

      {/* AI Decision Support Box */}
      {aiAnalysis && (
        <div className="p-6 rounded-2xl bg-cyan-950/20 border border-cyan-800/50 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Evaluasi Manajerial AI (Strategic Decision Support)
          </div>
          <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
            {aiAnalysis}
          </div>
        </div>
      )}
    </div>
  );
};
