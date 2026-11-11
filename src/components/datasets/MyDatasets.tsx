import React from 'react';
import { useApp } from '../../context/AppContext';
import { exportToCsv, exportToExcel } from '../../utils/exportUtils';
import {
  Database,
  Trash2,
  Download,
  TableProperties,
  Sparkles,
  Wand2,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Calendar,
  HardDrive
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
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Manajemen Dataset & Repositori Data
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Daftar seluruh dataset aktif, riwayat pembersihan, dan status penyimpanan.
          </p>
        </div>

        <button
          onClick={() => setCurrentView('upload')}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition"
        >
          + Tambah Dataset Baru
        </button>
      </div>

      {/* Grid of Dataset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {datasets.map((ds, index) => {
          const isSelected = ds.id === selectedDatasetId;
          const rowCount = ds.data?.length || 0;
          const colCount = ds.data && ds.data[0] ? Object.keys(ds.data[0]).length : 0;

          return (
            <div
              key={`${ds.id}-${index}`}
              className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                {/* Header tag */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 uppercase border border-slate-700">
                    {ds.fileType}
                  </span>

                  {ds.isCleaned && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Cleaned
                    </span>
                  )}

                  {isSelected && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                      Aktif
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-1">{ds.name}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {ds.description || 'Tidak ada deskripsi'}
                  </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[10px] block">Baris & Kolom:</span>
                    <span className="font-semibold text-slate-200">
                      {rowCount.toLocaleString()} x {colCount}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[10px] block">Ukuran File:</span>
                    <span className="font-semibold text-slate-200">
                      {(ds.fileSize / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>

                {ds.sheets && ds.sheets.length > 1 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-blue-400">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{ds.sheets.length} Sheets (Aktif: {ds.activeSheet})</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      selectDataset(ds.id);
                      setCurrentView('explorer');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    Buka Data
                  </button>

                  <button
                    onClick={() => {
                      selectDataset(ds.id);
                      setCurrentView('ai_analyst');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                    title="Tanya AI Analyst"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      selectDataset(ds.id);
                      setCurrentView('cleaning');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400"
                    title="Pembersihan Data"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => exportToExcel(ds.data, ds.name, ds.fileName)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                    title="Download Excel"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {datasets.length > 1 && (
                    <button
                      onClick={() => deleteDataset(ds.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
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
