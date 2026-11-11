import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Database,
  FileText,
  LineChart,
  Users,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  ChevronRight,
  UploadCloud,
  Wand2,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const OverviewDashboard: React.FC = () => {
  const {
    datasets,
    selectedDataset,
    currentStats,
    activityLogs,
    setCurrentView,
    selectDataset
  } = useApp();

  // Prepare chart data from active dataset
  const trendData = React.useMemo(() => {
    if (!selectedDataset || !selectedDataset.data || selectedDataset.data.length === 0) {
      return [];
    }

    const dateCol = currentStats.dateCols[0];
    const numCol = currentStats.numericCols[0] || currentStats.numericCols[1];

    if (!numCol) return [];

    return selectedDataset.data.slice(0, 15).map((row, idx) => ({
      name: dateCol ? String(row[dateCol]).slice(5) : `Item ${idx + 1}`,
      value: typeof row[numCol] === 'number' ? row[numCol] : Number(row[numCol]) || 0,
    }));
  }, [selectedDataset, currentStats]);

  // Activity breakdown for chart
  const userActivityStats = [
    { name: 'Mon', queries: 24, uploads: 3 },
    { name: 'Tue', queries: 38, uploads: 5 },
    { name: 'Wed', queries: 45, uploads: 8 },
    { name: 'Thu', queries: 52, uploads: 6 },
    { name: 'Fri', queries: 68, uploads: 11 },
    { name: 'Sat', queries: 31, uploads: 2 },
    { name: 'Sun', queries: 19, uploads: 1 },
  ];

  // Dynamic KPI calculations
  const totalDatasets = datasets.length;
  const totalRows = datasets.reduce((acc, d) => acc + (d.data?.length || 0), 0);
  const totalNumeric = currentStats.numericCols.length;
  const primaryMetricSum = currentStats.columns.find(c => c.name === 'Revenue' || c.name === 'MRR' || c.type === 'numeric')?.stats?.sum || 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#0B192C] via-[#1E3E62]/40 to-[#0B192C] border border-cyan-500/20 shadow-xl shadow-cyan-950/20">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-4 h-4" />
            Enterprise Decision Support System
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white mt-1">
            SMART AI Data Analyst Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analisis data multi-format, peramalan statistik prediktif, dan rekomendasi keputusan berbasis Google Gemini AI.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCurrentView('ai_analyst')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-md shadow-cyan-500/20 transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Tanya AI Data Analyst
          </button>
          <button
            onClick={() => setCurrentView('forecasting')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition"
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            Run Forecasting
          </button>
          <button
            onClick={() => setCurrentView('summary')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            Executive Summary
          </button>
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Datasets */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">1. Total Dataset</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">{totalDatasets}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400">
            <ArrowUpRight className="w-3 h-3" />
            <span>{totalRows.toLocaleString()} baris data terkelola</span>
          </div>
        </div>

        {/* KPI 2: Total Files & Extraction */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">2. File & Dokumen</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">{totalDatasets} Dokumen</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <span>XLSX, CSV, PDF, DOCX</span>
          </div>
        </div>

        {/* KPI 3: Total Analisis & Variabel */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">3. Variabel & Kolom</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <LineChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">
            {currentStats.colCount} Kolom
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-cyan-400">
            <span>{totalNumeric} Kolom Numerik Terprofiling</span>
          </div>
        </div>

        {/* KPI 4: Users & Roles */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">4. Organisasi & User</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">2 Active Roles</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <span>Admin & Analyst RBAC</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Data Trend Chart & User Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Data Trend Chart (2 columns) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                9. Grafik Tren Data Aktual: {selectedDataset?.name}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Visualisasi deret metrik numerik utama berdasarkan baris transaksi terkini
              </p>
            </div>
            <button
              onClick={() => setCurrentView('visualization')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              Custom Visualizer
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full pt-2">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : v} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(val: any) => [Number(val).toLocaleString(), 'Metric']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#trendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Pilih dataset dengan kolom numerik untuk menampilkan grafik
              </div>
            )}
          </div>
        </div>

        {/* Right: User Activity Chart (8. Grafik Aktivitas Pengguna) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              8. Grafik Aktivitas Pengguna
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Frekuensi kueri AI dan dataset upload mingguan
            </p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userActivityStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="queries" fill="#06b6d4" radius={[4, 4, 0, 0]} name="AI Queries" />
                <Bar dataKey="uploads" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Uploads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 2 Columns: 6. AI Insights Preview & 7. Ringkasan Statistik Dataset */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 6. AI Insights Preview Card */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              6. AI Insights & Strategic Highlights
            </h2>
            <button
              onClick={() => setCurrentView('insights')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              Lihat Semua Insights
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  KEY FINDING
                </span>
                <span className="text-[10px] text-slate-400">Confidence: 96%</span>
              </div>
              <div className="text-xs font-semibold text-slate-100 mt-1.5">
                Dominasi Pendapatan Regional Tertinggi
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Wilayah Jabodetabek dan Jawa Timur menghasilkan lebih dari 65% total omset perusahaan, dengan performa lini produk Electronics sebagai kontributor margin tertinggi.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  POSITIVE TREND
                </span>
                <span className="text-[10px] text-slate-400">+18.4% YoY</span>
              </div>
              <div className="text-xs font-semibold text-slate-100 mt-1.5">
                Peningkatan Efisiensi Channel B2B Portal
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Rata-rata nilai per transaksi (AOV) pada segmen B2B Portal tercatat 3.2x lebih tinggi dibandingkan channel E-Commerce konvensional tanpa memerlukan diskon berlebih.
              </p>
            </div>
          </div>
        </div>

        {/* 7. Ringkasan Statistik Dataset */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <LineChart className="w-4 h-4 text-emerald-400" />
              7. Ringkasan Statistik Dataset Aktif
            </h2>
            <button
              onClick={() => setCurrentView('explorer')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              Buka Explorer
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
              <div className="text-[10px] text-slate-400">Total Baris</div>
              <div className="text-base font-bold text-white mt-1">{currentStats.rowCount}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
              <div className="text-[10px] text-slate-400">Total Kolom</div>
              <div className="text-base font-bold text-white mt-1">{currentStats.colCount}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
              <div className="text-[10px] text-slate-400">Missing Cells</div>
              <div className="text-base font-bold text-emerald-400 mt-1">{currentStats.missingCells}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
              <div className="text-[10px] text-slate-400">Duplikasi</div>
              <div className="text-base font-bold text-cyan-400 mt-1">{currentStats.duplicateRows}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400">Distribusi Tipe Kolom:</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] px-2.5 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                Numerik: {currentStats.numericCols.length} kolom
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                Kategori: {currentStats.categoricalCols.length} kolom
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Tanggal: {currentStats.dateCols.length} kolom
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded bg-slate-500/10 text-slate-300 border border-slate-500/20">
                Teks: {currentStats.textCols.length} kolom
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Aktivitas Analisis Terakhir & 10. Recent Uploaded Files */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5. Aktivitas Terakhir */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              5. Aktivitas Analisis Terakhir
            </h2>
            <button
              onClick={() => setCurrentView('activity')}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              Lihat History
            </button>
          </div>

          <div className="divide-y divide-slate-800">
            {activityLogs.slice(0, 4).map((log, index) => (
              <div key={`${log.id}-${index}`} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{log.entityName}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {log.action} • {log.userName}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 10. Recent Uploaded Files */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              10. Recent Uploaded Files
            </h2>
            <button
              onClick={() => setCurrentView('datasets')}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              Kelola File
            </button>
          </div>

          <div className="divide-y divide-slate-800">
            {datasets.map((ds, index) => (
              <div
                key={`${ds.id}-${index}`}
                onClick={() => selectDataset(ds.id)}
                className={`py-2.5 px-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${
                  selectedDataset?.id === ds.id ? 'bg-cyan-950/30 border border-cyan-800/40' : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-slate-800 text-cyan-400 font-bold uppercase text-[10px]">
                    {ds.fileType}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">{ds.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {ds.data?.length || 0} baris • {(ds.fileSize / 1024).toFixed(0)} KB
                    </div>
                  </div>
                </div>

                {selectedDataset?.id === ds.id && (
                  <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                    Aktif
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
