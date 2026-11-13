import React from 'react';
import { useApp } from '../../context/AppContext';
import { exportToExcel } from '../../utils/exportUtils';
import {
  Database,
  Trash2,
  Download,
  Sparkles,
  Wand2,
  CheckCircle2,
  Layers
} from 'lucide-react';

export const MyDatasets: React.FC = () => {
  const {
    datasets,
    selectedDatasetId,
    selectDataset,
    deleteDataset,
    setCurrentView
  } = useApp();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Database className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Manajemen Dataset & Repositori Data</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Daftar seluruh dataset aktif, riwayat pembersihan, dan status penyimpanan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCurrentView('upload')}
          className="px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold text-xs shadow-xs transition-theme self-start sm:self-auto whitespace-nowrap cursor-pointer"
        >
          + Tambah Dataset Baru
        </button>
      </div>

      {/* Empty State */}
      {datasets.length === 0 && (
        <div className="p-12 text-center rounded-2xl surface-card space-y-4">
          <div
            className="w-16 h-16 rounded-2xl border border-[var(--accent-caramel)] flex items-center justify-center text-[var(--color-primary)] mx-auto"
            style={{ backgroundColor: 'var(--bg-caramel-soft)' }}
          >
            <Database className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-main)]">
              Belum Ada Dataset yang Tersimpan
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mt-1 leading-relaxed">
              Unggah dokumen Excel (.xlsx, .xls), CSV, PDF, atau Word (.docx) untuk memulai profiling otomatis dan analisis cerdas dengan Gemini AI.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentView('upload')}
            className="px-5 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] font-semibold text-xs shadow-xs transition-theme active:scale-95 cursor-pointer"
          >
            + Unggah Dataset Pertama
          </button>
        </div>
      )}

      {/* Grid of Dataset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {datasets.map((ds, index) => {
          const isSelected = ds.id === selectedDatasetId;
          const rowCount = ds.data?.length || 0;
          const colCount = ds.data && ds.data[0] ? Object.keys(ds.data[0]).length : 0;

          return (
            <div
              key={`${ds.id}-${index}`}
              className={`p-5 rounded-2xl surface-card flex flex-col justify-between space-y-4 ${
                isSelected ? 'border-[var(--color-primary)] ring-1 ring-[var(--accent-caramel)]' : ''
              }`}
            >
              <div className="space-y-3">
                {/* Header metadata line (clean unboxed text) */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[var(--color-primary)] uppercase tracking-wide">
                    {ds.fileType}
                  </span>

                  <div className="flex items-center gap-2">
                    {ds.isCleaned && (
                      <span
                        className="font-semibold flex items-center gap-1"
                        style={{ color: 'var(--color-success)' }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Cleaned
                      </span>
                    )}
                    {isSelected && (
                      <span className="font-bold text-[var(--accent-caramel)]">
                        · Aktif
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)] line-clamp-1">{ds.name}</h3>
                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-1 leading-relaxed">
                    {ds.description || 'Tidak ada deskripsi'}
                  </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-lg surface-secondary">
                    <span className="text-[var(--text-secondary)] text-[10px] block">Baris & Kolom</span>
                    <span className="font-semibold text-[var(--text-main)] tabular-nums">
                      {rowCount.toLocaleString()} x {colCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg surface-secondary">
                    <span className="text-[var(--text-secondary)] text-[10px] block">Ukuran File</span>
                    <span className="font-semibold text-[var(--text-main)] tabular-nums">
                      {(ds.fileSize / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>

                {ds.sheets && ds.sheets.length > 1 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-primary)]">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{ds.sheets.length} Sheets (Aktif: {ds.activeSheet})</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      selectDataset(ds.id);
                      setCurrentView('explorer');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-theme cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                        : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] border border-[var(--border-color)]'
                    }`}
                  >
                    Buka Data
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      selectDataset(ds.id);
                      setCurrentView('ai_analyst');
                    }}
                    aria-label={`Tanya AI Analyst tentang ${ds.name}`}
                    className="p-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--color-primary)] border border-[var(--border-color)] transition-theme cursor-pointer"
                    title="Tanya AI Analyst"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      selectDataset(ds.id);
                      setCurrentView('cleaning');
                    }}
                    aria-label={`Bersihkan data ${ds.name}`}
                    className="p-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-caramel-soft)] text-[var(--accent-caramel)] border border-[var(--border-color)] transition-theme cursor-pointer"
                    title="Pembersihan Data"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => exportToExcel(ds.data, ds.name, ds.fileName)}
                    aria-label={`Download Excel ${ds.name}`}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--color-success)] hover:bg-[var(--bg-secondary)] transition-theme cursor-pointer"
                    title="Download Excel"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {datasets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteDataset(ds.id)}
                      aria-label={`Hapus dataset ${ds.name}`}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--bg-secondary)] transition-theme cursor-pointer"
                      title="Hapus Dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
