import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Database,
  FileText,
  LineChart,
  Users,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  Clock,
  ChevronRight,
  FileSpreadsheet
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
  const { chartTheme } = useTheme();

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
      value: typeof row[numCol] === 'number' ? row[numCol] : Number(row[numCol]) || 0
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
    { name: 'Sun', queries: 19, uploads: 1 }
  ];

  // Dynamic KPI calculations
  const totalDatasets = datasets.length;
  const totalRows = datasets.reduce((acc, d) => acc + (d.data?.length || 0), 0);
  const totalNumeric = currentStats.numericCols.length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl surface-card"
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)'
        }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--color-primary)] text-xs font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 text-[var(--accent-caramel)]" />
            <span>Enterprise Decision Support System</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-main)] tracking-tight">
            SMART AI Data Analyst Dashboard
          </h1>
          <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            Analisis data multi-format, peramalan statistik prediktif, dan rekomendasi keputusan berbasis Google Gemini AI.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setCurrentView('ai_analyst')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold text-xs shadow-xs transition-theme active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tanya AI Data Analyst</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('forecasting')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] font-medium text-xs border border-[var(--border-color)] transition-theme whitespace-nowrap cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Run Forecasting</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('summary')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] font-medium text-xs border border-[var(--border-color)] transition-theme whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--accent-caramel)]" />
            <span>Executive Summary</span>
          </button>
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Datasets */}
        <div className="p-4 rounded-xl surface-card hover:border-[var(--accent-caramel)]">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="text-xs font-medium">1. Total Dataset</span>
            <div
              className="p-2 rounded-lg text-[var(--color-primary)]"
              style={{ backgroundColor: 'var(--bg-primary-soft)' }}
            >
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--text-main)] tracking-tight tabular-nums">
            {totalDatasets}
          </div>
          <div
            className="mt-1 flex items-center gap-1 text-[11px] font-medium tabular-nums"
            style={{ color: 'var(--color-success)' }}
          >
            <ArrowUpRight className="w-3 h-3" />
            <span>{totalRows.toLocaleString()} baris data terkelola</span>
          </div>
        </div>

        {/* KPI 2: Total Files & Extraction */}
        <div className="p-4 rounded-xl surface-card hover:border-[var(--accent-caramel)]">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="text-xs font-medium">2. File & Dokumen</span>
            <div
              className="p-2 rounded-lg text-[var(--accent-caramel)]"
              style={{ backgroundColor: 'var(--bg-caramel-soft)' }}
            >
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--text-main)] tracking-tight tabular-nums">
            {totalDatasets} Dokumen
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
            XLSX · CSV · PDF · DOCX
          </div>
        </div>

        {/* KPI 3: Total Analisis & Variabel */}
        <div className="p-4 rounded-xl surface-card hover:border-[var(--accent-caramel)]">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="text-xs font-medium">3. Variabel & Kolom</span>
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'var(--bg-success-soft)', color: 'var(--color-success)' }}
            >
              <LineChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--text-main)] tracking-tight tabular-nums">
            {currentStats.colCount} Kolom
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-primary)] font-medium tabular-nums">
            {totalNumeric} Kolom Numerik Terprofiling
          </div>
        </div>

        {/* KPI 4: Users & Roles */}
        <div className="p-4 rounded-xl surface-card hover:border-[var(--accent-caramel)]">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="text-xs font-medium">4. Organisasi & User</span>
            <div
              className="p-2 rounded-lg text-[var(--color-secondary)]"
              style={{ backgroundColor: 'var(--bg-primary-soft)' }}
            >
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--text-main)] tracking-tight">
            2 Active Roles
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
            Admin & Analyst RBAC
          </div>
        </div>
      </div>

      {/* Main Grid: Data Trend Chart & User Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Data Trend Chart (2 columns) */}
        <div className="lg:col-span-2 p-5 rounded-xl surface-card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 truncate">
                <TrendingUp className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <span className="truncate">9. Grafik Tren Data Aktual: {selectedDataset?.name}</span>
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Visualisasi deret metrik numerik utama berdasarkan baris transaksi terkini
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('visualization')}
              className="text-xs text-[var(--color-primary)] hover:text-[var(--accent-caramel)] font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-theme"
            >
              <span>Custom Visualizer</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full pt-2">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="trendGradientBrown" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartTheme.caramel} stopOpacity={0.45} />
                      <stop offset="95%" stopColor={chartTheme.caramel} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                  <XAxis
                    dataKey="name"
                    stroke={chartTheme.axisStroke}
                    tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                  />
                  <YAxis
                    stroke={chartTheme.axisStroke}
                    tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                    tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      borderColor: chartTheme.tooltipBorder,
                      color: chartTheme.tooltipText,
                      borderRadius: '10px',
                      fontSize: '11px'
                    }}
                    labelStyle={{ color: chartTheme.tooltipText, fontWeight: 600 }}
                    formatter={(val: any) => [Number(val).toLocaleString(), 'Metric']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartTheme.primary}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#trendGradientBrown)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-xs">
                Pilih dataset dengan kolom numerik untuk menampilkan grafik
              </div>
            )}
          </div>
        </div>

        {/* Right: User Activity Chart (8. Grafik Aktivitas Pengguna) */}
        <div className="p-5 rounded-xl surface-card space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--accent-caramel)]" />
              <span>8. Grafik Aktivitas Pengguna</span>
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Frekuensi kueri AI dan dataset upload mingguan
            </p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userActivityStats}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                <XAxis
                  dataKey="name"
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                />
                <YAxis
                  stroke={chartTheme.axisStroke}
                  tick={{ fontSize: 10, fill: chartTheme.axisTickColor }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    color: chartTheme.tooltipText,
                    borderRadius: '10px',
                    fontSize: '11px'
                  }}
                />
                <Bar dataKey="queries" fill={chartTheme.primary} radius={[4, 4, 0, 0]} name="AI Queries" />
                <Bar dataKey="uploads" fill={chartTheme.caramel} radius={[4, 4, 0, 0]} name="Uploads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 2 Columns: 6. AI Insights Preview & 7. Ringkasan Statistik Dataset */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 6. AI Insights Preview Card */}
        <div className="p-5 rounded-xl surface-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-caramel)]" />
              <span>6. AI Insights & Strategic Highlights</span>
            </h2>
            <button
              type="button"
              onClick={() => setCurrentView('insights')}
              className="text-xs text-[var(--color-primary)] hover:text-[var(--accent-caramel)] font-semibold flex items-center gap-1 cursor-pointer transition-theme"
            >
              <span>Lihat Semua Insights</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div
              className="p-3.5 rounded-xl border border-[var(--border-color)]"
              style={{ backgroundColor: 'var(--bg-caramel-soft)' }}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[var(--color-primary)] uppercase tracking-wide">
                  Key Finding
                </span>
                <span className="text-[var(--text-secondary)] tabular-nums">Confidence · 96%</span>
              </div>
              <div className="text-xs font-semibold text-[var(--text-main)] mt-1.5">
                Dominasi Pendapatan Regional Tertinggi
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                Wilayah Jabodetabek dan Jawa Timur menghasilkan lebih dari 65% total omset perusahaan, dengan performa lini produk Electronics sebagai kontributor margin tertinggi.
              </p>
            </div>

            <div
              className="p-3.5 rounded-xl border border-[var(--border-color)]"
              style={{ backgroundColor: 'var(--bg-success-soft)' }}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold uppercase tracking-wide" style={{ color: 'var(--color-success)' }}>
                  Positive Trend
                </span>
                <span className="text-[var(--text-secondary)] tabular-nums">+18.4% YoY</span>
              </div>
              <div className="text-xs font-semibold text-[var(--text-main)] mt-1.5">
                Peningkatan Efisiensi Channel B2B Portal
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                Rata-rata nilai per transaksi (AOV) pada segmen B2B Portal tercatat 3.2x lebih tinggi dibandingkan channel E-Commerce konvensional tanpa memerlukan diskon berlebih.
              </p>
            </div>
          </div>
        </div>

        {/* 7. Ringkasan Statistik Dataset */}
        <div className="p-5 rounded-xl surface-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <LineChart className="w-4 h-4 text-[var(--color-success)]" />
              <span>7. Ringkasan Statistik Dataset Aktif</span>
            </h2>
            <button
              type="button"
              onClick={() => setCurrentView('explorer')}
              className="text-xs text-[var(--color-primary)] hover:text-[var(--accent-caramel)] font-semibold flex items-center gap-1 cursor-pointer transition-theme"
            >
              <span>Buka Explorer</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg surface-secondary">
              <div className="text-[11px] text-[var(--text-secondary)]">Total Baris</div>
              <div className="text-base font-bold text-[var(--text-main)] mt-1 tabular-nums">
                {currentStats.rowCount}
              </div>
            </div>
            <div className="p-3 rounded-lg surface-secondary">
              <div className="text-[11px] text-[var(--text-secondary)]">Total Kolom</div>
              <div className="text-base font-bold text-[var(--text-main)] mt-1 tabular-nums">
                {currentStats.colCount}
              </div>
            </div>
            <div className="p-3 rounded-lg surface-secondary">
              <div className="text-[11px] text-[var(--text-secondary)]">Missing Cells</div>
              <div
                className="text-base font-bold mt-1 tabular-nums"
                style={{ color: 'var(--color-success)' }}
              >
                {currentStats.missingCells}
              </div>
            </div>
            <div className="p-3 rounded-lg surface-secondary">
              <div className="text-[11px] text-[var(--text-secondary)]">Duplikasi</div>
              <div className="text-base font-bold text-[var(--color-primary)] mt-1 tabular-nums">
                {currentStats.duplicateRows}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border-color)] space-y-1.5">
            <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
              Distribusi Tipe Kolom
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs text-[var(--text-main)] tabular-nums">
              <span>
                Numerik: <strong>{currentStats.numericCols.length}</strong>
              </span>
              <span aria-hidden="true" className="text-[var(--text-secondary)]">·</span>
              <span>
                Kategori: <strong>{currentStats.categoricalCols.length}</strong>
              </span>
              <span aria-hidden="true" className="text-[var(--text-secondary)]">·</span>
              <span>
                Tanggal: <strong>{currentStats.dateCols.length}</strong>
              </span>
              <span aria-hidden="true" className="text-[var(--text-secondary)]">·</span>
              <span>
                Teks: <strong>{currentStats.textCols.length}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Aktivitas Analisis Terakhir & 10. Recent Uploaded Files */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5. Aktivitas Terakhir */}
        <div className="p-5 rounded-xl surface-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--color-primary)]" />
              <span>5. Aktivitas Analisis Terakhir</span>
            </h2>
            <button
              type="button"
              onClick={() => setCurrentView('activity')}
              className="text-xs text-[var(--color-primary)] hover:text-[var(--accent-caramel)] font-semibold cursor-pointer transition-theme"
            >
              Lihat History
            </button>
          </div>

          <div className="divide-y divide-[var(--border-color)]">
            {activityLogs.slice(0, 4).map((log, index) => (
              <div key={`${log.id}-${index}`} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[var(--text-main)]">{log.entityName}</div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {log.action} · {log.userName}
                  </div>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 10. Recent Uploaded Files */}
        <div className="p-5 rounded-xl surface-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <Database className="w-4 h-4 text-[var(--accent-caramel)]" />
              <span>10. Recent Uploaded Files</span>
            </h2>
            <button
              type="button"
              onClick={() => setCurrentView('datasets')}
              className="text-xs text-[var(--color-primary)] hover:text-[var(--accent-caramel)] font-semibold cursor-pointer transition-theme"
            >
              Kelola File
            </button>
          </div>

          <div className="divide-y divide-[var(--border-color)]">
            {datasets.map((ds, index) => {
              const isSelected = selectedDataset?.id === ds.id;
              return (
                <button
                  key={`${ds.id}-${index}`}
                  type="button"
                  onClick={() => selectDataset(ds.id)}
                  className={`w-full py-2.5 px-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-theme text-left ${
                    isSelected
                      ? 'bg-[var(--bg-caramel-soft)]'
                      : 'hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--color-primary)] font-bold uppercase text-[10px] shrink-0">
                      {ds.fileType}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--text-main)] truncate">{ds.name}</div>
                      <div className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                        {ds.data?.length || 0} baris · {(ds.fileSize / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-[11px] font-semibold text-[var(--color-primary)] shrink-0 ml-2">
                      Aktif
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
