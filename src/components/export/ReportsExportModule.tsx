import React from 'react';
import { useApp } from '../../context/AppContext';
import { exportToCsv, exportToExcel } from '../../utils/exportUtils';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
  Image,
  CheckCircle2,
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
        <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--color-primary)]" />
          <span>Pusat Laporan & Ekspor Data (Reports & Export Center)</span>
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Unduh hasil pengolahan data, laporan ringkasan eksekutif C-Level, file tabular Excel multi-sheet, dan raw CSV.
        </p>
      </div>

      {/* Dataset Selection Summary */}
      <div className="p-4 rounded-xl surface-card flex items-center justify-between text-xs gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="p-2 rounded-lg text-[var(--color-primary)] shrink-0"
            style={{ backgroundColor: 'var(--bg-primary-soft)' }}
          >
            <Database className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[var(--text-main)] truncate">{selectedDataset?.name}</div>
            <div className="text-[var(--text-secondary)] text-[11px] tabular-nums">
              {selectedDataset?.data?.length || 0} Baris Observasi · {currentStats.colCount} Kolom
            </div>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-[var(--color-success)] shrink-0">
          Ready for Distribution
        </span>
      </div>

      {/* 4 Core Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PDF Executive Report */}
        <div className="p-6 rounded-2xl surface-card hover:border-[var(--accent-caramel)] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div
              className="w-12 h-12 rounded-xl border border-[var(--border-color)] flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-danger-soft)', color: 'var(--color-danger)' }}
            >
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)]">
                Laporan Eksekutif PDF (Executive Report)
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Dokumen formal standar Dewan Direksi mencakup ringkasan eksekutif, tabel KPI, temuan utama, hasil peramalan statistik, dan rekomendasi strategis.
              </p>
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
                <span>Format Standar Presentasi Manajemen (A4)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
                <span>Bahasa Indonesia Formal Profesional</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            style={{ backgroundColor: 'var(--color-danger)' }}
            className="w-full py-2.5 rounded-lg hover:opacity-90 text-[#FFFDF9] font-semibold text-xs transition-theme flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Unduh PDF Report</span>
          </button>
        </div>

        {/* Excel (.XLSX) */}
        <div className="p-6 rounded-2xl surface-card hover:border-[var(--accent-caramel)] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div
              className="w-12 h-12 rounded-xl border border-[var(--border-color)] flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-success-soft)', color: 'var(--color-success)' }}
            >
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)]">Spreadsheet Excel (.XLSX)</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Ekspor seluruh baris data aktual dan ringkasan statistik ke dalam format Microsoft Excel (.xlsx) dengan header terformat.
              </p>
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
                <span>Kompatibel dengan Excel, Google Sheets, PowerBI</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
                <span>Preservasi Tipe Data Numerik & Tanggal</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            style={{ backgroundColor: 'var(--color-success)' }}
            className="w-full py-2.5 rounded-lg hover:opacity-90 text-[#FFFDF9] font-semibold text-xs transition-theme flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh File Excel (.xlsx)</span>
          </button>
        </div>

        {/* CSV Format */}
        <div className="p-6 rounded-2xl surface-card hover:border-[var(--accent-caramel)] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div
              className="w-12 h-12 rounded-xl border border-[var(--border-color)] flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-caramel-soft)', color: 'var(--accent-caramel)' }}
            >
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)]">
                Comma-Separated Values (CSV)
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Format standar raw data dengan encoding UTF-8 BOM, ideal untuk pipeline machine learning, Python pandas, R, dan integrasi database eksternal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold text-xs transition-theme flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh File CSV (.csv)</span>
          </button>
        </div>

        {/* PNG Chart Snapshot */}
        <div className="p-6 rounded-2xl surface-card hover:border-[var(--accent-caramel)] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div
              className="w-12 h-12 rounded-xl border border-[var(--border-color)] flex items-center justify-center text-[var(--color-primary)]"
              style={{ backgroundColor: 'var(--bg-primary-soft)' }}
            >
              <Image className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)]">
                Visualisasi Grafik (High-Res PNG)
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Tangkapan visual resolusi tinggi (2x Retina) langsung dari modul Data Visualization, siap disematkan ke slide presentasi atau laporan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentView('visualization')}
            className="w-full py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] border border-[var(--border-color)] font-semibold text-xs transition-theme flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Buka Modul Visualisasi & Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
