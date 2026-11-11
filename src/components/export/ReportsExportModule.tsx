import React from 'react';
import { useApp } from '../../context/AppContext';
import { exportToCsv, exportToExcel, exportExecutivePdf } from '../../utils/exportUtils';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
  Image,
  CheckCircle2,
  Calendar,
  Layers,
  Database
} from 'lucide-react';

export const ReportsExportModule: React.FC = () => {
  const { selectedDataset, currentStats, addToast, setCurrentView } = useApp();

  const handleExportCsv = () => {
    if (!selectedDataset?.data) return;
    exportToCsv(selectedDataset.data, `${selectedDataset.name}.csv`);
    addToast('success', 'CSV Berhasil Diunduh');
  };

  const handleExportExcel = () => {
    if (!selectedDataset?.data) return;
    exportToExcel(selectedDataset.data, 'Analytics', `${selectedDataset.name}.xlsx`);
    addToast('success', 'Excel Berhasil Diunduh');
  };

  const handleExportPdf = () => {
    setCurrentView('summary');
    addToast('info', 'Membuka Template PDF Eksekutif');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          Pusat Laporan & Ekspor Data (Reports & Export Center)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Unduh hasil pengolahan data, laporan ringkasan eksekutif C-Level, file tabular Excel multi-sheet, dan raw CSV.
        </p>
      </div>

      {/* Dataset Selection Summary */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="font-bold text-white">{selectedDataset?.name}</div>
            <div className="text-slate-400 text-[11px]">
              {selectedDataset?.data?.length || 0} Baris Observasi • {currentStats.colCount} Kolom
            </div>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300">
          Ready for Distribution
        </span>
      </div>

      {/* 4 Core Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PDF Executive Report */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Laporan Eksekutif PDF (Executive Report)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Dokumen formal standar Dewan Direksi mencakup ringkasan eksekutif, tabel KPI, temuan utama, hasil peramalan statistik, dan rekomendasi strategis.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Format Standar Presentasi Manajemen (A4)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bahasa Indonesia Formal Profesional</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleExportPdf}
            className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Unduh PDF Report</span>
          </button>
        </div>

        {/* Excel (.XLSX) */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Spreadsheet Excel (.XLSX)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ekspor seluruh baris data aktual dan ringkasan statistik ke dalam format Microsoft Excel (.xlsx) dengan header terformat.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kompatibel dengan Excel, Google Sheets, PowerBI</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Preservasi Tipe Data Numerik & Tanggal</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleExportExcel}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Unduh File Excel (.xlsx)</span>
          </button>
        </div>

        {/* CSV Format */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 transition space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Comma-Separated Values (CSV)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Format standar raw data dengan encoding UTF-8 BOM, ideal untuk pipeline machine learning, Python pandas, R, dan integrasi database eksternal.
              </p>
            </div>
          </div>

          <button
            onClick={handleExportCsv}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Unduh File CSV (.csv)</span>
          </button>
        </div>

        {/* PNG Chart Snapshot */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Image className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Visualisasi Grafik (High-Res PNG)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Tangkapan visual resolusi tinggi (2x Retina) langsung dari modul Data Visualization, siap disematkan ke slide presentasi atau laporan.
              </p>
            </div>
          </div>

          <button
            onClick={() => setCurrentView('visualization')}
            className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <span>Buka Modul Visualisasi & Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
